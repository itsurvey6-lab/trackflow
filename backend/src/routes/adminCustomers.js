import express from "express";
import pool from "../config/db.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// Admin-only protection
router.use((req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }

  next();
});

// GET /api/admin/customers
// List, search, filter and paginate customers
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      status = "all",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (pageNumber - 1) * pageSize;

    const conditions = ["u.role = 'customer'"];
    const values = [];

    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      const n = values.length;

      conditions.push(`
        (
          u.full_name ILIKE $${n}
          OR u.email ILIKE $${n}
          OR u.phone ILIKE $${n}
          OR CAST(u.id AS TEXT) ILIKE $${n}
        )
      `);
    }

    if (["active", "inactive", "blocked"].includes(status)) {
      values.push(status);
      conditions.push(`u.account_status = $${values.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u WHERE ${whereClause}`,
      values
    );

    const customersResult = await pool.query(
      `
      SELECT
        u.id, u.full_name, u.email, u.phone,
        u.city, u.address, u.avatar_url,
        u.account_status, u.blocked_at,
        u.block_reason, u.created_at, u.updated_at,
        COUNT(o.id)::INT AS total_orders
      FROM users u
      LEFT JOIN orders o ON o.customer_id = u.id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
      `,
      [...values, pageSize, offset]
    );

    const statsResult = await pool.query(`
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE account_status = 'active')::INT AS active,
        COUNT(*) FILTER (WHERE account_status = 'inactive')::INT AS inactive,
        COUNT(*) FILTER (WHERE account_status = 'blocked')::INT AS blocked
      FROM users
      WHERE role = 'customer'
    `);

    const total = Number(countResult.rows[0].count);

    res.json({
      status: "success",
      customers: customersResult.rows,
      stats: statsResult.rows[0],
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Customer listing error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to retrieve customers",
    });
  }
});

// GET /api/admin/customers/:id
// Customer profile and order history
router.get("/:id", async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid customer ID",
      });
    }

    const customerResult = await pool.query(
      `
      SELECT
        id, full_name, email, phone, city, address,
        avatar_url, account_status, blocked_at,
        block_reason, created_at, updated_at
      FROM users
      WHERE id = $1 AND role = 'customer'
      `,
      [customerId]
    );

    if (!customerResult.rows.length) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    const ordersResult = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE customer_id = $1
      ORDER BY id DESC
      `,
      [customerId]
    );

    const orders = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const [logsResult, locationsResult] = await Promise.all([
          pool.query(
            `
            SELECT *
            FROM order_status_logs
            WHERE order_id = $1
            ORDER BY id DESC
            `,
            [order.id]
          ),
          pool.query(
            `
            SELECT *
            FROM delivery_locations
            WHERE order_id = $1
            ORDER BY id DESC
            `,
            [order.id]
          ),
        ]);

        return {
          ...order,
          status_history: logsResult.rows,
          location_history: locationsResult.rows,
        };
      })
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*)::INT AS total_orders,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('pending', 'placed')
        )::INT AS pending_orders,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('picked up', 'in transit', 'in_transit')
        )::INT AS active_orders,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'delivered'
        )::INT AS delivered_orders,
        COUNT(*) FILTER (
          WHERE LOWER(status) = 'cancelled'
        )::INT AS cancelled_orders
      FROM orders
      WHERE customer_id = $1
      `,
      [customerId]
    );

    res.json({
      status: "success",
      customer: customerResult.rows[0],
      summary: summaryResult.rows[0],
      orders,
    });
  } catch (error) {
    console.error("Customer profile error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to retrieve customer profile",
    });
  }
});

// PATCH /api/admin/customers/:id
// Edit customer profile
router.patch("/:id", async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid customer ID",
      });
    }

    const allowedFields = [
      "full_name",
      "phone",
      "city",
      "address",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        values.push(
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field]
        );

        updates.push(`${field} = $${values.length}`);
      }
    }

    if (!updates.length) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields supplied",
      });
    }

    if (
      req.body.full_name !== undefined &&
      !String(req.body.full_name).trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Customer name cannot be empty",
      });
    }

    values.push(customerId);

    const result = await pool.query(
      `
      UPDATE users
      SET ${updates.join(", ")},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
        AND role = 'customer'
      RETURNING
        id, full_name, email, phone, city, address,
        account_status, created_at, updated_at
      `,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    res.json({
      status: "success",
      message: "Customer updated successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Customer update error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to update customer",
    });
  }
});

// PATCH /api/admin/customers/:id/status
// Activate, deactivate, block or unblock
router.patch("/:id/status", async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const { account_status, block_reason } = req.body;

    if (!Number.isInteger(customerId) || customerId < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid customer ID",
      });
    }

    if (!["active", "inactive", "blocked"].includes(account_status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid account status",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        account_status = $1,
        blocked_at = CASE
          WHEN $1 = 'blocked' THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        block_reason = CASE
          WHEN $1 = 'blocked' THEN $2
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND role = 'customer'
      RETURNING
        id, full_name, email, account_status,
        blocked_at, block_reason
      `,
      [
        account_status,
        account_status === "blocked" ? block_reason || null : null,
        customerId,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: "error",
        message: "Customer not found",
      });
    }

    res.json({
      status: "success",
      message: `Customer ${account_status} successfully`,
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Customer status error:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to update customer status",
    });
  }
});

export default router;
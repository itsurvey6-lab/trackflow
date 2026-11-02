
import express from "express";
import pool from "../config/db.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

// All reports are restricted to administrators.
router.use(authenticateToken);

router.use((req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Administrator access required.",
    });
  }

  next();
});

// Validate a YYYY-MM-DD date and ensure it is a real calendar date.
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Read the requested date range.
// If no dates are supplied, use the last 30 calendar days.
function getDateRange(req, res) {
  let { startDate, endDate } = req.query;

  if (!startDate && !endDate) {
    const today = new Date();
    const start = new Date(today);

    start.setUTCDate(start.getUTCDate() - 29);

    startDate = start.toISOString().slice(0, 10);
    endDate = today.toISOString().slice(0, 10);
  } else if (!startDate || !endDate) {
    res.status(400).json({
      status: "error",
      message: "Both startDate and endDate are required.",
    });

    return null;
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    res.status(400).json({
      status: "error",
      message: "Dates must be valid and use YYYY-MM-DD format.",
    });

    return null;
  }

  if (startDate > endDate) {
    res.status(400).json({
      status: "error",
      message: "startDate cannot be after endDate.",
    });

    return null;
  }

  return { startDate, endDate };
}

// GET /api/reports/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/summary", async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;

  try {
    const [ordersResult, usersResult] = await Promise.all([
      pool.query(
        `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'placed')::int AS pending,
            COUNT(*) FILTER (WHERE status = 'picked_up')::int AS picked_up,
            COUNT(*) FILTER (WHERE status = 'in_transit')::int AS in_transit,
            COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
          FROM orders
          WHERE created_at >= $1::date
            AND created_at < ($2::date + INTERVAL '1 day')
        `,
        [range.startDate, range.endDate]
      ),

      // User counts are overall active-user counts, not date-filtered.
      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE role = 'customer' AND is_active = TRUE
          )::int AS customers,
          COUNT(*) FILTER (
            WHERE role = 'delivery_agent' AND is_active = TRUE
          )::int AS delivery_agents
        FROM users
      `),
    ]);

    return res.json({
      status: "success",
      dateRange: range,
      orders: ordersResult.rows[0],
      users: usersResult.rows[0],
    });
  } catch (error) {
    console.error("Report summary error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to generate report summary.",
    });
  }
});

// GET /api/reports/orders-by-status?startDate=...&endDate=...
router.get("/orders-by-status", async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;

  try {
    const result = await pool.query(
      `
        SELECT
          status,
          COUNT(*)::int AS total
        FROM orders
        WHERE created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 day')
        GROUP BY status
        ORDER BY status
      `,
      [range.startDate, range.endDate]
    );

    return res.json({
      status: "success",
      dateRange: range,
      data: result.rows,
    });
  } catch (error) {
    console.error("Orders by status report error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to generate order status report.",
    });
  }
});

// GET /api/reports/order-trends?startDate=...&endDate=...
router.get("/order-trends", async (req, res) => {
  const range = getDateRange(req, res);
  if (!range) return;

  try {
    const result = await pool.query(
      `
        SELECT
          days.day::date AS date,
          COUNT(orders.id)::int AS total
        FROM generate_series(
          $1::date,
          $2::date,
          INTERVAL '1 day'
        ) AS days(day)
        LEFT JOIN orders
          ON orders.created_at >= days.day
          AND orders.created_at < days.day + INTERVAL '1 day'
        GROUP BY days.day
        ORDER BY days.day ASC
      `,
      [range.startDate, range.endDate]
    );

    return res.json({
      status: "success",
      dateRange: range,
      data: result.rows,
    });
  } catch (error) {
    console.error("Order trends report error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to generate order trends report.",
    });
  }
});

export default router;

import express from "express";
import pool from "../config/db.js";
import authenticateToken from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorize.js";
import { createNotification } from "../utils/notifications.js";


const router = express.Router();
// POST /api/orders
// Customers create orders for themselves.
// Admins create orders on behalf of selected customers.

router.post(
  "/",
  authenticateToken,
  authorizeRoles("customer", "admin"),
  async (req, res) => {
    const {
      customer_id,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      dropoff_address,
      dropoff_latitude,
      dropoff_longitude,
      sender_phone,
      recipient_name,
      recipient_phone,
      package_description,
      special_instructions,
    } = req.body;

    // Validate addresses.
    if (
      typeof pickup_address !== "string" ||
      !pickup_address.trim() ||
      typeof dropoff_address !== "string" ||
      !dropoff_address.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Pickup and drop-off addresses are required",
      });
    }

    // Validate optional text fields.
    const optionalTextFields = {
      sender_phone,
      recipient_name,
      recipient_phone,
      package_description,
      special_instructions,
    };

    for (const [field, value] of Object.entries(optionalTextFields)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          status: "error",
          message: `${field} must be a string`,
        });
      }
    }

    // Validate coordinates.
    const validCoordinate = (value, min, max) =>
      value === undefined ||
      value === null ||
      (typeof value === "number" &&
        Number.isFinite(value) &&
        value >= min &&
        value <= max);

    if (
      !validCoordinate(pickup_latitude, -90, 90) ||
      !validCoordinate(pickup_longitude, -180, 180) ||
      !validCoordinate(dropoff_latitude, -90, 90) ||
      !validCoordinate(dropoff_longitude, -180, 180)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Coordinates must be valid latitude and longitude numbers",
      });
    }

    let targetCustomerId;

    // Customers can only create orders for themselves.
    if (req.user.role === "customer") {
      targetCustomerId = req.user.id;
    }

    // Admins must select an existing active customer.
    if (req.user.role === "admin") {
      targetCustomerId = Number(customer_id);

      if (
        !Number.isSafeInteger(targetCustomerId) ||
        targetCustomerId <= 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "A valid customer_id is required",
        });
      }
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      // Verify that the target customer exists and is active.
      const customerResult = await client.query(
        `SELECT id, full_name, is_active
         FROM users
         WHERE id = $1
           AND role = 'customer'
         FOR UPDATE`,
        [targetCustomerId]
      );

      if (customerResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          status: "error",
          message: "Customer not found",
        });
      }

      const customer = customerResult.rows[0];

      if (!customer.is_active) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message: "Cannot create an order for an inactive customer",
        });
      }

      // Create the order for the correct customer.
      const result = await client.query(
        `INSERT INTO orders (
          customer_id,
          pickup_address,
          pickup_latitude,
          pickup_longitude,
          dropoff_address,
          dropoff_latitude,
          dropoff_longitude,
          sender_phone,
          recipient_name,
          recipient_phone,
          package_description,
          special_instructions
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          targetCustomerId,
          pickup_address.trim(),
          pickup_latitude ?? null,
          pickup_longitude ?? null,
          dropoff_address.trim(),
          dropoff_latitude ?? null,
          dropoff_longitude ?? null,
          sender_phone?.trim() || null,
          recipient_name?.trim() || null,
          recipient_phone?.trim() || null,
          package_description?.trim() || null,
          special_instructions?.trim() || null,
        ]
      );

      const order = result.rows[0];

      // Record the initial order history.
      await client.query(
        `INSERT INTO order_status_logs
          (order_id, old_status, new_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          null,
          "placed",
          req.user.id,
          req.user.role === "admin"
            ? "Order created by administrator"
            : "Order created by customer",
        ]
      );

      await client.query("COMMIT");

      const io = req.app.get("io");

      // Send notifications after the transaction commits.
      try {
        if (req.user.role === "admin") {
          // Notify the selected customer.
          await createNotification({
            io,
            userId: targetCustomerId,
            orderId: order.id,
            type: "order_created",
            title: "New order created",
            message: `An administrator created order #${order.id} for you.`,
          });

          // Refresh the customer's order list.
          if (io) {
            io.to(`user:${targetCustomerId}`).emit("orders:changed", {
              orderId: order.id,
              action: "created",
            });
          }
        } else {
          // Customer created the order: notify all administrators.
          const adminsResult = await pool.query(
            "SELECT id FROM users WHERE role = 'admin'"
          );

          for (const admin of adminsResult.rows) {
            await createNotification({
              io,
              userId: admin.id,
              orderId: order.id,
              type: "order_created",
              title: "New order received",
              message: `A customer has created order #${order.id}.`,
            });

            if (io) {
              io.to(`user:${admin.id}`).emit("orders:changed", {
                orderId: order.id,
                action: "created",
              });
            }
          }
        }
      } catch (notificationError) {
        console.error(
          "Order notification error:",
          notificationError.message
        );
      }

      return res.status(201).json({
        status: "success",
        message: "Order created successfully",
        order: {
          ...order,
          customer_name: customer.full_name,
        },
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Transaction may already have ended.
        }
      }

      console.error("Create order error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not create order",
      });
    } finally {
      client?.release();
    }
  }
);

 // GET /api/orders
 // Customers see their own orders; agents see assigned orders;
 // admins can see all orders.

router.get("/", authenticateToken, async (req, res) => {
  try {
    let result;

    const query = `
      
      SELECT
        o.*,
        customer.full_name AS customer_name,
        agent.full_name AS assigned_agent_name
      FROM orders o
      JOIN users customer
        ON customer.id = o.customer_id
      LEFT JOIN users agent
        ON agent.id = o.assigned_agent_id
      WHERE ($1 = 'admin')
        OR ($1 = 'customer' AND o.customer_id = $2)
        OR ($1 = 'delivery_agent' AND o.assigned_agent_id = $2)
      ORDER BY o.created_at DESC

    `;

    if (!["customer", "delivery_agent", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to view orders",
      });
    }

    result = await pool.query(query, [req.user.role, req.user.id]);

    return res.status(200).json({
      status: "success",
      count: result.rows.length,
      orders: result.rows,
    });
  } catch (error) {
    console.error("Fetch orders error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not retrieve orders",
    });
  }
});


/**
 * PATCH /api/orders/:id
 * Admin or order owner: edit shipment details.
 */
router.patch("/:id", authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);

  const {
    pickup_address,
    dropoff_address,
    sender_phone,
    recipient_name,
    recipient_phone,
    package_description,
    special_instructions,
  } = req.body;

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  try {
    const existingOrder = await pool.query(
      `SELECT customer_id, assigned_agent_id, status
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (existingOrder.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const existing = existingOrder.rows[0];

    if (req.user.role !== "admin") {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          status: "error",
          message: "You are not allowed to edit orders",
        });
      }

      if (Number(existing.customer_id) !== Number(req.user.id)) {
        return res.status(403).json({
          status: "error",
          message: "You can only edit your own orders",
        });
      }

      if (existing.status !== "placed") {
        return res.status(409).json({
          status: "error",
          message: "Only pending orders can be edited",
        });
      }
    }

    if (
      typeof pickup_address !== "string" ||
      !pickup_address.trim() ||
      typeof dropoff_address !== "string" ||
      !dropoff_address.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Pickup and drop-off addresses are required",
      });
    }

    const optionalTextFields = {
      sender_phone,
      recipient_name,
      recipient_phone,
      package_description,
      special_instructions,
    };

    for (const [field, value] of Object.entries(optionalTextFields)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          status: "error",
          message: `${field} must be a string`,
        });
      }
    }

    const result = await pool.query(
      `UPDATE orders
       SET pickup_address = $1,
           dropoff_address = $2,
           sender_phone = $3,
           recipient_name = $4,
           recipient_phone = $5,
           package_description = $6,
           special_instructions = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        pickup_address.trim(),
        dropoff_address.trim(),
        sender_phone?.trim() || null,
        recipient_name?.trim() || null,
        recipient_phone?.trim() || null,
        package_description?.trim() || null,
        special_instructions?.trim() || null,
        orderId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const updatedOrder = result.rows[0];
    const io = req.app.get("io");

    const customerId = existing.customer_id;
    const agentId = existing.assigned_agent_id;
    const editorRole = req.user.role;

    // Refresh customer and assigned agent order lists.
    if (io) {
      io.to(`user:${customerId}`).emit("orders:changed", {
        orderId,
        action: "updated",
      });

      if (agentId) {
        io.to(`user:${agentId}`).emit("orders:changed", {
          orderId,
          action: "updated",
        });
      }

      // Refresh all admin order lists.
      const adminsResult = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );

      for (const admin of adminsResult.rows) {
        io.to(`user:${admin.id}`).emit("orders:changed", {
          orderId,
          action: "updated",
        });
      }

      // Keep the existing order-detail update event.
      io.to(`order:${orderId}`).emit("order:details_updated", {
        order_id: orderId,
        updated_at: updatedOrder.updated_at,
      });
    }

    // Save persistent notifications after the order update succeeds.
    try {
      // Notify the assigned agent.
      if (agentId) {
        await createNotification({
          io,
          userId: agentId,
          orderId,
          type: "order_updated",
          title: "Order details updated",
          message: `The details or address for order #${orderId} have been updated.`,
        });
      }

      // If a customer edited the order, notify all admins.
      if (editorRole === "customer") {
        const adminsResult = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const admin of adminsResult.rows) {
          await createNotification({
            io,
            userId: admin.id,
            orderId,
            type: "order_updated",
            title: "Order updated by customer",
            message: `A customer updated order #${orderId}.`,
          });
        }
      }

      // If an admin edited the order, notify the customer.
      if (editorRole === "admin") {
        await createNotification({
          io,
          userId: customerId,
          orderId,
          type: "order_updated",
          title: "Order details updated",
          message: `An administrator updated order #${orderId}.`,
        });
      }
    } catch (notificationError) {
      console.error(
        "Order edit notification error:",
        notificationError.message
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Order details updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Edit order error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not update order details",
    });
  }
});


// PATCH /api/orders/:id/assign
// Admin assigns or reassigns an order to a delivery agent.

router.patch(
  "/:id/assign",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const orderId = Number(req.params.id);
    const agentId = Number(req.body.agent_id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order ID",
      });
    }

    if (!Number.isSafeInteger(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "A valid agent_id is required",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      // Verify that the selected user is an active delivery agent.
      const agentResult = await client.query(
        `SELECT id, full_name, is_active
        FROM users
        WHERE id = $1
          AND role = 'delivery_agent'
        FOR UPDATE`,
        [agentId]
      );

      if (agentResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          status: "error",
          message: "Delivery agent not found",
        });
      }

      const agent = agentResult.rows[0];

      if (!agent.is_active) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message: "This delivery agent is inactive and cannot receive assignments",
        });
      }

      if (agentResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          status: "error",
          message: "Delivery agent not found",
        });
      }


      // Lock the order while changing its assignment.
      const orderResult = await client.query(
        `SELECT *
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          status: "error",
          message: "Order not found",
        });
      }

      const order = orderResult.rows[0];

      if (["delivered", "cancelled"].includes(order.status)) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          status: "error",
          message: "A completed or cancelled order cannot be reassigned",
        });
      }

      // Avoid duplicate assignment history when the agent is unchanged.
      if (Number(order.assigned_agent_id) === agentId) {
        await client.query("ROLLBACK");

        return res.status(200).json({
          status: "success",
          message: "This delivery agent is already assigned",
          order: {
            ...order,
            assigned_agent_name: agent.full_name,
          },
        });
      }

      const previousAgentId = order.assigned_agent_id;

      const updateResult = await client.query(
        `UPDATE orders
         SET assigned_agent_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [agentId, orderId]
      );

      // Record the assignment or reassignment.
      const assignmentNote = previousAgentId
        ? `Order reassigned from agent ${previousAgentId} to agent ${agentId}`
        : `Order assigned to delivery agent ${agentId}`;

      await client.query(
        `INSERT INTO order_status_logs
          (order_id, old_status, new_status, changed_by, note)
         VALUES ($1, $2, $2, $3, $4)`,
        [orderId, order.status, req.user.id, assignmentNote]
      );

      await client.query("COMMIT");

      const updatedOrder = {
        ...updateResult.rows[0],
        assigned_agent_name: agent.full_name,
      };

      const io = req.app.get("io");

      // Save notifications permanently and send them in real time.
      try {
        // Notify the customer.
        await createNotification({
          io,
          userId: order.customer_id,
          orderId,
          type: "order_assigned",
          title: "Delivery agent assigned",
          message: `A delivery agent has been assigned to order #${orderId}.`,
        });

        // Notify the newly assigned delivery agent.
        await createNotification({
          io,
          userId: agentId,
          orderId,
          type: "order_assigned",
          title: "New delivery assigned",
          message: `Order #${orderId} has been assigned to you.`,
        });

        // Notify the previous agent when the order is reassigned.
        if (
          previousAgentId &&
          String(previousAgentId) !== String(agentId)
        ) {
          await createNotification({
            io,
            userId: previousAgentId,
            orderId,
            type: "order_reassigned",
            title: "Delivery reassigned",
            message: `Order #${orderId} has been reassigned to another agent.`,
          });
        }
      } catch (notificationError) {
        console.error(
          "Assignment notification error:",
          notificationError.message
        );
      }

      // Preserve existing real-time order refresh events.
      if (io) {
        // Refresh the customer's order list.
        io.to(`user:${order.customer_id}`).emit("orders:changed", {
          orderId,
          action: "assigned",
        });

        // Refresh the newly assigned agent's order list.
        io.to(`user:${agentId}`).emit("orders:changed", {
          orderId,
          action: "assigned",
        });

        // Refresh the previous agent's list after reassignment.
        if (
          previousAgentId &&
          String(previousAgentId) !== String(agentId)
        ) {
          io.to(`user:${previousAgentId}`).emit("orders:changed", {
            orderId,
            action: "reassigned",
          });
        }

        // Refresh all admin order lists.
        const adminsResult = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const admin of adminsResult.rows) {
          io.to(`user:${admin.id}`).emit("orders:changed", {
            orderId,
            action: "assigned",
          });
        }

        // Remove the previous agent from the order room.
        if (
          previousAgentId &&
          String(previousAgentId) !== String(agentId)
        ) {
          try {
            const sockets = await io
              .in(`order:${orderId}`)
              .fetchSockets();

            for (const connectedSocket of sockets) {
              if (
                connectedSocket.user?.role === "delivery_agent" &&
                String(connectedSocket.user.id) === String(previousAgentId)
              ) {
                await connectedSocket.leave(`order:${orderId}`);
              }
            }
          } catch (socketError) {
            console.error(
              "Socket room removal error:",
              socketError.message
            );
          }
        }

        // Notify authorized order viewers.
        io.to(`order:${orderId}`).emit("order:assigned", {
          order_id: orderId,
          previous_agent_id: previousAgentId,
          assigned_agent_id: agentId,
          assigned_agent_name: agent.full_name,
          assigned_by: req.user.id,
          updated_at: updatedOrder.updated_at,
        });
      }

      return res.status(200).json({
        status: "success",
        message: previousAgentId
          ? "Delivery agent reassigned successfully"
          : "Delivery agent assigned successfully",
        order: updatedOrder,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Transaction may already have ended.
        }
      }

      console.error("Assign delivery agent error:", error);

      return res.status(500).json({
        status: "error",
        message: "Could not assign delivery agent",
      });
    } finally {
      client?.release();
    }
  }
);

// PATCH /api/orders/:id/status
// Update delivery status, record the change, and notify tracking clients.
// PATCH /api/orders/:id/status
// Admin or assigned delivery agent updates delivery status.

router.patch("/:id/status", authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);
  const { status, note } = req.body;

  const allowedStatuses = {
    placed: ["picked_up", "cancelled"],
    picked_up: ["in_transit", "cancelled"],
    in_transit: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  if (!Object.hasOwn(allowedStatuses, status)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid delivery status",
    });
  }

  if (note !== undefined && typeof note !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Note must be a string",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT * FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const order = result.rows[0];

    const isAdmin = req.user.role === "admin";
    const isAssignedAgent =
      req.user.role === "delivery_agent" &&
      String(order.assigned_agent_id) === String(req.user.id);

    if (!isAdmin && !isAssignedAgent) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        status: "error",
        message:
          "Only the assigned agent or an admin can update delivery status",
      });
    }

    if (!allowedStatuses[order.status]?.includes(status)) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        status: "error",
        message: `Cannot change status from ${order.status} to ${status}`,
      });
    }

    const updatedResult = await client.query(
      `UPDATE orders
       SET status = $1::varchar,
           updated_at = CURRENT_TIMESTAMP,
           delivered_at = CASE
             WHEN $1::varchar = 'delivered' THEN CURRENT_TIMESTAMP
             ELSE delivered_at
           END
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    await client.query(
      `INSERT INTO order_status_logs
        (order_id, old_status, new_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        order.status,
        status,
        req.user.id,
        note?.trim() || null,
      ]
    );

    await client.query("COMMIT");

    const updatedOrder = updatedResult.rows[0];
    const io = req.app.get("io");

    const customerId = order.customer_id;
    const agentId = order.assigned_agent_id;

    const statusLabels = {
      picked_up: "Picked Up",
      in_transit: "In Transit",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };

    const statusLabel = statusLabels[status] || status;

    // Save notifications permanently and send them in real time.
    try {
      // Always notify the customer.
      await createNotification({
        io,
        userId: customerId,
        orderId,
        type: "order_status_updated",
        title: "Delivery status updated",
        message: `Order #${orderId} is now ${statusLabel}.`,
      });

      // Notify the assigned agent when an admin changes the status.
      if (isAdmin && agentId) {
        await createNotification({
          io,
          userId: agentId,
          orderId,
          type: "order_status_updated",
          title: "Delivery status updated",
          message: `Order #${orderId} is now ${statusLabel}.`,
        });
      }

      // Notify all administrators when the delivery agent changes status.
      if (req.user.role === "delivery_agent") {
        const adminsResult = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const admin of adminsResult.rows) {
          await createNotification({
            io,
            userId: admin.id,
            orderId,
            type: "order_status_updated",
            title: "Delivery status changed",
            message: `Order #${orderId} is now ${statusLabel}.`,
          });
        }
      }
    } catch (notificationError) {
      console.error(
        "Status notification error:",
        notificationError.message
      );
    }

    // Preserve existing real-time order events.
    if (io) {
      // Refresh the customer's order list.
      io.to(`user:${customerId}`).emit("orders:changed", {
        orderId,
        action: "status_updated",
      });

      // Refresh the assigned agent's order list.
      if (agentId) {
        io.to(`user:${agentId}`).emit("orders:changed", {
          orderId,
          action: "status_updated",
        });
      }

      // Refresh all admin order lists.
      const adminsResult = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );

      for (const admin of adminsResult.rows) {
        io.to(`user:${admin.id}`).emit("orders:changed", {
          orderId,
          action: "status_updated",
        });
      }

      // Preserve the existing order-detail event.
      io.to(`order:${orderId}`).emit("order:status_updated", {
        order_id: orderId,
        old_status: order.status,
        new_status: status,
        changed_by: req.user.id,
        note: note?.trim() || null,
        updated_at: updatedOrder.updated_at,
        delivered_at: updatedOrder.delivered_at,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Delivery status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have ended.
    }

    console.error("Update delivery status error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not update delivery status",
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/orders/:id/cancel
 * Customer can cancel their own pending (placed) order.
 * Keep the order and its status history.
 */
router.post("/:id/cancel", authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  if (req.user.role !== "customer") {
    return res.status(403).json({
      status: "error",
      message: "Only customers can use this cancellation endpoint",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT *
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const order = result.rows[0];

    if (String(order.customer_id) !== String(req.user.id)) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "error",
        message: "You can only cancel your own orders",
      });
    }

    if (order.status !== "placed") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message: "Only pending orders can be cancelled by the customer",
      });
    }

    const updatedResult = await client.query(
      `UPDATE orders
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );

    await client.query(
      `INSERT INTO order_status_logs
        (order_id, old_status, new_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        order.status,
        "cancelled",
        req.user.id,
        "Cancelled by customer",
      ]
    );

    await client.query("COMMIT");

    const updatedOrder = updatedResult.rows[0];
    const io = req.app.get("io");

    if (io) {
      const customerId = order.customer_id;
      const agentId = order.assigned_agent_id;

      // Refresh the customer's order list.
      io.to(`user:${customerId}`).emit("orders:changed", {
        orderId,
        action: "cancelled",
      });

      // Notify the assigned agent, if one exists.
      if (agentId) {
        io.to(`user:${agentId}`).emit("orders:changed", {
          orderId,
          action: "cancelled",
        });

        io.to(`user:${agentId}`).emit("notification:new", {
          type: "order_cancelled",
          title: "Delivery cancelled",
          message: `Order #${orderId} has been cancelled by the customer.`,
          orderId,
          createdAt: new Date().toISOString(),
        });
      }

      // Refresh admin order lists and notify administrators.
      const adminsResult = await pool.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );

      for (const admin of adminsResult.rows) {
        io.to(`user:${admin.id}`).emit("orders:changed", {
          orderId,
          action: "cancelled",
        });

        io.to(`user:${admin.id}`).emit("notification:new", {
          type: "order_cancelled",
          title: "Order cancelled",
          message: `Customer cancelled order #${orderId}.`,
          orderId,
          createdAt: new Date().toISOString(),
        });
      }

      // Preserve the existing tracking event.
      io.to(`order:${orderId}`).emit("order:status_updated", {
        order_id: orderId,
        old_status: order.status,
        new_status: "cancelled",
        changed_by: req.user.id,
        note: "Cancelled by customer",
        updated_at: updatedOrder.updated_at,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have ended.
    }

    console.error("Cancel order error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not cancel the order",
    });
  } finally {
    client.release();
  }
});



/**
 * DELETE /api/orders/:id
 * Admin only: permanently delete an order.
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const orderId = Number(req.params.id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order ID.",
      });
    }

    const client = await pool.connect();
    let order;

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `SELECT id, customer_id, assigned_agent_id
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          status: "error",
          message: "Order not found.",
        });
      }

      order = orderResult.rows[0];

      await client.query(
        "DELETE FROM delivery_locations WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        "DELETE FROM order_status_logs WHERE order_id = $1",
        [orderId]
      );

      await client.query(
        "DELETE FROM orders WHERE id = $1",
        [orderId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete order error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not delete the order.",
      });
    } finally {
      client.release();
    }

    const io = req.app.get("io");

    // Refresh customer and agent order lists.
    if (io) {
      io.to(`user:${order.customer_id}`).emit("orders:changed", {
        orderId,
        action: "deleted",
      });

      if (order.assigned_agent_id) {
        io.to(`user:${order.assigned_agent_id}`).emit("orders:changed", {
          orderId,
          action: "deleted",
        });
      }

      // Refresh all admin order lists.
      try {
        const adminsResult = await pool.query(
          "SELECT id FROM users WHERE role = 'admin'"
        );

        for (const admin of adminsResult.rows) {
          io.to(`user:${admin.id}`).emit("orders:changed", {
            orderId,
            action: "deleted",
          });
        }
      } catch (error) {
        console.error("Admin order refresh error:", error.message);
      }
    }

    // Save persistent notifications after successful deletion.
    // orderId is null because the deleted order no longer exists.
    try {
      await createNotification({
        io,
        userId: order.customer_id,
        orderId: null,
        type: "order_deleted",
        title: "Order deleted",
        message: `Order #${orderId} has been deleted by an administrator.`,
      });

      if (order.assigned_agent_id) {
        await createNotification({
          io,
          userId: order.assigned_agent_id,
          orderId: null,
          type: "order_deleted",
          title: "Assigned order deleted",
          message: `Order #${orderId} has been deleted by an administrator.`,
        });
      }
    } catch (notificationError) {
      console.error(
        "Order deletion notification error:",
        notificationError.message
      );
    }

    return res.status(200).json({
      status: "success",
      message: `Order ${orderId} deleted successfully.`,
    });
  }
);



// POST /api/orders/:id/location
// Save a GPS location from the assigned delivery agent and broadcast it.

router.post("/:id/location", authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);
  const { latitude, longitude } = req.body;

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      status: "error",
      message: "Valid numeric latitude and longitude are required",
    });
  }

  if (req.user.role !== "delivery_agent") {
    return res.status(403).json({
      status: "error",
      message: "Only delivery agents can submit GPS locations",
    });
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, status, assigned_agent_id
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    if (String(order.assigned_agent_id) !== String(req.user.id)) {
      return res.status(403).json({
        status: "error",
        message: "You are not assigned to this order",
      });
    }

    if (!["picked_up", "in_transit"].includes(order.status)) {
      return res.status(409).json({
        status: "error",
        message: "GPS updates are allowed only while the order is being delivered",
      });
    }

    const result = await pool.query(
      `INSERT INTO delivery_locations
        (order_id, agent_id, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       RETURNING id, order_id, agent_id, latitude, longitude, recorded_at`,
      [orderId, req.user.id, latitude, longitude]
    );

    const location = result.rows[0];
    const io = req.app.get("io");

    io.to(`order:${orderId}`).emit("location:updated", {
      order_id: orderId,
      location,
    });

    return res.status(201).json({
      status: "success",
      message: "GPS location saved successfully",
      location,
    });
  } catch (error) {
    console.error("Save GPS location error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not save GPS location",
    });
  }
});

// GET /api/orders/:id/location
// Retrieve the latest saved GPS location for an authorized user.

router.get("/:id/location", authenticateToken, async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID",
    });
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, customer_id, assigned_agent_id
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    const isCustomer =
      req.user.role === "customer" &&
      String(order.customer_id) === String(req.user.id);

    const isAssignedAgent =
      req.user.role === "delivery_agent" &&
      String(order.assigned_agent_id) === String(req.user.id);

    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to view this location",
      });
    }

    const locationResult = await pool.query(
      `SELECT latitude, longitude, recorded_at
       FROM delivery_locations
       WHERE order_id = $1
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [orderId]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No GPS location has been recorded yet",
      });
    }

    return res.status(200).json({
      status: "success",
      order_id: orderId,
      location: locationResult.rows[0],
    });
  } catch (error) {
    console.error("Get GPS location error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not retrieve GPS location",
    });
  }
});



router.get("/:id/history", authenticateToken, async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order ID.",
      });
    }

    const orderResult = await pool.query(
      `SELECT id, customer_id, assigned_agent_id
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found.",
      });
    }

    const order = orderResult.rows[0];
    const user = req.user;

    const canView =
      user.role === "admin" ||
      (user.role === "customer" &&
        Number(order.customer_id) === Number(user.id)) ||
      (user.role === "delivery_agent" &&
        Number(order.assigned_agent_id) === Number(user.id));

    if (!canView) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to view this order history.",
      });
    }

    const historyResult = await pool.query(
      `SELECT
         logs.id,
         logs.old_status,
         logs.new_status,
         logs.note,
         logs.created_at,
         logs.changed_by,
         users.full_name AS changed_by_name
       FROM order_status_logs AS logs
       LEFT JOIN users ON users.id = logs.changed_by
       WHERE logs.order_id = $1
       ORDER BY logs.created_at ASC, logs.id ASC`,
      [orderId]
    );

    return res.json({
      status: "success",
      count: historyResult.rows.length,
      history: historyResult.rows,
    });
  } catch (error) {
    console.error("Get order history error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve order history.",
    });
  }
});

export default router;

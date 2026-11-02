
import express from "express";
import dotenv from "dotenv";
import http from "node:http";
import { Server } from "socket.io";
import pool from "./config/db.js";
import usersRouter from "./routes/users.js";
import ordersRouter from "./routes/orders.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import notificationsRouter from "./routes/notifications.js";
import reportsRoutes from "./routes/reports.js";
import adminCustomersRouter from "./routes/adminCustomers.js";

dotenv.config();

const app = express();

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"))
);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH"],
  },
});



// Make Socket.IO available inside Express routes.
app.set("io", io);
app.use("/api/admin/customers", adminCustomersRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/reports", reportsRoutes);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.json({
      status: "success",
      message: "TrackFlow API and PostgreSQL are connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Database health check failed:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      severity: error.severity,
    });

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});


io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication token required"));
  }

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log(`Authenticated Socket.IO client connected: ${socket.id}`);
  // Give each authenticated user a private room for notifications.
  socket.join(`user:${socket.user.id}`);

  socket.on("order:join", async (orderIdValue, callback) => {
    const reply = typeof callback === "function" ? callback : () => {};
    const orderId = Number(orderIdValue);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return reply({ status: "error", message: "Invalid order ID" });
    }

    try {
      const result = await pool.query(
        `SELECT id, customer_id, assigned_agent_id
         FROM orders
         WHERE id = $1`,
        [orderId]
      );

      if (result.rows.length === 0) {
        return reply({ status: "error", message: "Order not found" });
      }

      const order = result.rows[0];
      const user = socket.user;

      const allowed =
        user.role === "admin" ||
        (user.role === "customer" &&
          String(order.customer_id) === String(user.id)) ||
        (user.role === "delivery_agent" &&
          String(order.assigned_agent_id) === String(user.id));

      if (!allowed) {
        return reply({
          status: "error",
          message: "You are not authorized to track this order",
        });
      }

      await socket.join(`order:${orderId}`);
      return reply({ status: "success", message: "Joined order room" });
    } catch (error) {
      console.error("Socket order join error:", error.message);
      return reply({ status: "error", message: "Could not join order room" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket.IO client disconnected: ${socket.id}`);
  });
});




const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`TrackFlow API running at http://localhost:${PORT}`);
  console.log("Socket.IO server initialized");
});

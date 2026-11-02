import pool from "../config/db.js";

export async function createNotification({
  io,
  userId,
  orderId = null,
  type,
  title,
  message,
}) {
  try {
    // Save notification permanently in PostgreSQL
    const result = await pool.query(
      `INSERT INTO notifications (
         user_id,
         order_id,
         type,
         title,
         message
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, orderId, type, title, message]
    );

    const notification = result.rows[0];

    // Notify the user in real time
    const payload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      orderId: notification.order_id,
      isRead: notification.is_read,
      createdAt: notification.created_at,
    };

    if (io) {
      io.to(`user:${userId}`).emit("notification:new", payload);
    }

    return notification;
  } catch (error) {
    console.error("Create notification error:", error.message);
    throw error;
  }
}
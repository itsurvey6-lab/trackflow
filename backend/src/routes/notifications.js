import express from "express";
import pool from "../config/db.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

// Get notification history for the logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         user_id,
         order_id,
         type,
         title,
         message,
         is_read,
         created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      status: "success",
      notifications: result.rows,
      unreadCount: Number(unreadResult.rows[0].unread_count),
    });
  } catch (error) {
    console.error("Get notifications error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not retrieve notifications",
    });
  }
});

// Mark one notification as read
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    return res.json({
      status: "success",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Mark notification read error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not update notification",
    });
  }
});

// Mark all notifications as read
router.patch("/read-all", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not update notifications",
    });
  }
});

export default router;
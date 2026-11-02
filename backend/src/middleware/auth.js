
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Authentication token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check that the account still exists and is active.
    const result = await pool.query(
      `SELECT id, role, is_active
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Your account is inactive or unavailable. Please contact the administrator.",
      });
    }

    // Ensure the role in the token still matches the database.
    if (user.role !== decoded.role) {
      return res.status(403).json({
        status: "error",
        message: "Your account permissions have changed. Please log in again.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

export default authenticateToken;

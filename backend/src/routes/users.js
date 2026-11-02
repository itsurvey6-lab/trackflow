
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import authenticateToken from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorize.js";

import multer from "multer";
import path from "path";
import fs from "fs";



const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    const extensionByType = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const extension = extensionByType[file.mimetype];

    if (!extension) {
      return callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }

    callback(null, `profile-${req.user.id}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }

    callback(null, true);
  },
});

const router = express.Router();

// Register a new user

router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // 1. Validate required fields
    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !full_name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        status: "error",
        message: "Valid full name, email, and password are required",
      });
    }

    const normalizedName = full_name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check whether the email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists",
      });
    }

    // 3. Hash the password before storing it
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Store the user in PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, role, created_at`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      status: "success",
      message: "Account registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    // Handle duplicate email constraint violations
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Registration failed",
    });
  }
});




// Login an existing user

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // 2. Find the user by email
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role,
              is_active, created_at
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    // 3. Verify the submitted password
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // 4. Reject inactive accounts
    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Your account is inactive. Please contact the administrator.",
      });
    }

    // 5. Remove sensitive fields from the public user object
    const { password_hash, is_active, ...publicUser } = user;

    // 6. Create a JWT after successful login
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // 7. Return the token and public user information
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
      user: publicUser,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});



// Retrieve users for Admin User Management

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           id,
           full_name,
           email,
           role,
           is_active,
           phone,
           city,
           created_at
         FROM users
         ORDER BY role, full_name`
      );

      return res.status(200).json({
        status: "success",
        count: result.rows.length,
        users: result.rows,
      });
    } catch (error) {
      console.error("Failed to fetch users:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not retrieve users",
      });
    }
  }
);



// Activate or deactivate a delivery agent (Admin only)

router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const agentId = req.params.id;
      const { is_active } = req.body;

      // Validate account status
      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          status: "error",
          message: "is_active must be true or false",
        });
      }

      // Update delivery agent account only
      const result = await pool.query(
        `UPDATE users
         SET is_active = $1,
             updated_at = NOW()
         WHERE id = $2
           AND role = 'delivery_agent'
         RETURNING id, full_name, email, role, is_active`,
        [is_active, agentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Delivery agent not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: is_active
          ? "Delivery agent activated successfully"
          : "Delivery agent deactivated successfully",
        agent: result.rows[0],
      });
    } catch (error) {
      console.error("Agent status update error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not update delivery agent status",
      });
    }
  }
);



/**
 * POST /api/users/delivery-agents
 * Admin creates a delivery-agent account.
 */
router.post(
  "/delivery-agents",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { full_name, email, password } = req.body;

      if (
        typeof full_name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !full_name.trim() ||
        !email.trim() ||
        password.length < 8
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Full name, valid email, and a password of at least 8 characters are required",
        });
      }

      const normalizedName = full_name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'delivery_agent')
         RETURNING id, full_name, email, role, created_at`,
        [normalizedName, normalizedEmail, passwordHash]
      );

      return res.status(201).json({
        status: "success",
        message: "Delivery agent created successfully",
        user: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          status: "error",
          message: "An account with this email already exists",
        });
      }

      console.error("Create delivery agent error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not create delivery agent",
      });
    }
  }
);

/**
 * GET /api/users/me
 * Retrieve the currently authenticated user's profile.
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT id, full_name, email, role, phone, city, address,
              avatar_url, updated_at, created_at
      FROM users
      WHERE id = $1`,
      [req.user.id]
    );
    
    // Check whether the user still exists in the database.
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Could not retrieve profile",
    });
  }
});


/**
 * PUT /api/users/me
 * Update the logged-in user's full name.
 */

router.put("/me", authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, city, address } = req.body;

    if (typeof full_name !== "string" || !full_name.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Full name is required",
      });
    }

    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Phone must be text",
      });
    }

    const result = await pool.query(
      `UPDATE users
      SET full_name = $1,
          phone = $2,
          city = $3,
          address = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, full_name, email, role, phone, city, address,
                avatar_url, updated_at, created_at`,
      [
        full_name.trim(),
        phone?.trim() || null,
        city?.trim() || null,
        address?.trim() || null,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile update error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Could not update profile",
    });
  }
});



router.post(
  "/me/avatar",
  authenticateToken,
  (req, res, next) => {
    upload.single("avatar")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          status: "error",
          message: error.message || "Image upload failed",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Please select a profile picture",
        });
      }

      const avatarUrl = `/uploads/${req.file.filename}`;

      const result = await pool.query(
        `UPDATE users
         SET avatar_url = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, full_name, email, role, phone, city, address, avatar_url, updated_at`,
        [avatarUrl, req.user.id]
      );

      if (result.rows.length === 0) {
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Profile picture uploaded successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Avatar upload error:", error.message);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        status: "error",
        message: "Could not save profile picture",
      });
    }
  }
);



// Activate or deactivate a customer account (Admin only)

router.patch(
  "/:id/customer-status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const customerId = req.params.id;
      const { is_active } = req.body;

      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          status: "error",
          message: "is_active must be true or false",
        });
      }

      const result = await pool.query(
        `UPDATE users
         SET is_active = $1,
             updated_at = NOW()
         WHERE id = $2
           AND role = 'customer'
         RETURNING id, full_name, email, role, is_active`,
        [is_active, customerId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Customer not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: is_active
          ? "Customer activated successfully"
          : "Customer deactivated successfully",
        customer: result.rows[0],
      });
    } catch (error) {
      console.error("Customer status update error:", error.message);

      return res.status(500).json({
        status: "error",
        message: "Could not update customer status",
      });
    }
  }
);





export default router;

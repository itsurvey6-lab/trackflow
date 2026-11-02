
import pg from "pg";
import dotenv from "dotenv";

// Load variables from the backend/.env file
dotenv.config();

const { Pool } = pg;

// Pool manages reusable PostgreSQL connections for our API.

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Log connection errors so we can troubleshoot them.

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool;

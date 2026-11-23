import pool from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";
import { unauthenticated, forbidden } from "../utils/errors.js";

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw unauthenticated();
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthenticated("Invalid or expired token");
  }

  const { rows } = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [payload.sub]
  );
  if (rows.length === 0) {
    throw unauthenticated("Invalid or expired token");
  }

  req.user = rows[0];
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      throw forbidden();
    }
    next();
  };
}
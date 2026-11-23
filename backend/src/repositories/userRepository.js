import pool from "../config/db.js";

export async function createUser({ name, email, passwordHash }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

export async function findUserByEmailWithHash(email, db = pool) {
  const { rows } = await db.query(
    `SELECT id, name, email, role, created_at, password_hash
     FROM users WHERE lower(email) = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id, db = pool) {
  const { rows } = await db.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}
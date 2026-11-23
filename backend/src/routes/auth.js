import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import pool from "../config/db.js";
import { authenticate } from "../middlewares/auth.js";
import { parse } from "../utils/validate.js";
import { signToken } from "../utils/jwt.js";
import { toUser } from "../utils/mappers.js";
import { conflict, unauthenticated } from "../utils/errors.js";

const router = Router();

const email = z.string().trim().toLowerCase().max(254).email();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email,
  password: z
    .string()
    .min(8)
    .max(64)
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one digit"),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

router.post("/register", async (req, res) => {
  const { name, email, password } = parse(registerSchema, req.body);
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );
    res.status(201).json({ user: toUser(rows[0]) });
  } catch (err) {
    if (err.code === "23505") {
      throw conflict("Email already registered");
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);

  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at, password_hash
     FROM users WHERE lower(email) = $1`,
    [email]
  );
  const row = rows[0];
  const ok = row && (await bcrypt.compare(password, row.password_hash));
  if (!ok) {
    throw unauthenticated("Invalid email or password");
  }

  res.json({ token: signToken(row), user: toUser(row) });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: toUser(req.user) });
});

export default router;
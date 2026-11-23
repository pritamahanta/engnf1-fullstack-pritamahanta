import { z } from "zod";
import { parse } from "../utils/validate.js";
import { toUser } from "../utils/mappers.js";
import * as authService from "../services/authService.js";

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

export async function register(req, res) {
  const input = parse(registerSchema, req.body);
  const user = await authService.register(input);
  res.status(201).json({ user: toUser(user) });
}

export async function login(req, res) {
  const input = parse(loginSchema, req.body);
  const { token, user } = await authService.login(input);
  res.json({ token, user: toUser(user) });
}

export function me(req, res) {
  res.json({ user: toUser(req.user) });
}
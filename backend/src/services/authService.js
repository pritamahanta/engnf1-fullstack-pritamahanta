import bcrypt from "bcrypt";
import { createUser, findUserByEmailWithHash } from "../repositories/userRepository.js";
import { signToken } from "../utils/jwt.js";
import { conflict, unauthenticated } from "../utils/errors.js";

export async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    return await createUser({ name, email, passwordHash });
  } catch (err) {
    if (err.code === "23505") {
      throw conflict("Email already registered");
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await findUserByEmailWithHash(email);
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    throw unauthenticated("Invalid email or password");
  }

  return { token: signToken(user), user };
}
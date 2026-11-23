import { findUserById } from "../repositories/userRepository.js";
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

  const user = await findUserById(payload.sub);
  if (!user) {
    throw unauthenticated("Invalid or expired token");
  }

  req.user = user;
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
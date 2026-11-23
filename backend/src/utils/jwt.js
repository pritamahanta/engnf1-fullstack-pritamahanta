import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not set");
}

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, secret, {
    algorithm: "HS256",
    expiresIn: "12h",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
}
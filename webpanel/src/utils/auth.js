import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const secret = process.env.JWT_SECRET || "webpanel-dev-secret-change-me";

export function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export const createToken = {
  sign: signToken,
  verify: (token) => jwt.verify(token, secret),
};

// ---- simple password-based session helper (for demo; switch to bcrypt in prod) ----
const users = new Map();
const sessions = new Map();

export function registerUser(username, password) {
  if (users.has(username)) throw new Error("user exists");
  users.set(username, password);
  sessions.delete(username);
  return signToken({ sub: username, role: "admin" });
}

export function loginUser(username, password) {
  const want = users.get(username);
  if (!want || want !== password) throw new Error("invalid credentials");
  sessions.set(username, crypto.randomUUID());
  return signToken({ sub: username, role: "admin" });
}

export function logoutUser(username) {
  sessions.delete(username);
}

export function whoAmI(username) {
  return sessions.has(username) ? sessions.get(username) : null;
}

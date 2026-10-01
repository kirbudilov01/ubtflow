import crypto from "node:crypto";
import { readDb } from "./db.js";

const cookieName = "ubt_session";

function secret() {
  return process.env.SESSION_SECRET || "dev-change-me";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionCookie(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(cookie) {
  if (!cookie || !cookie.includes(".")) return null;
  const [payload, signature] = cookie.split(".");
  if (signature !== sign(payload)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function publicDemoEnabled() {
  return String(process.env.VIEWFLOW_PUBLIC_DEMO || "").toLowerCase() === "true";
}

export function requireAuth(req, res, next) {
  const session = verifySessionCookie(req.cookies[cookieName]);
  if (!session && publicDemoEnabled() && req.method === "GET") {
    req.session = { username: "public-demo", role: "demo", demo: true };
    return next();
  }
  if (!session) return res.status(401).json({ error: "auth_required" });
  req.session = session;
  return next();
}

export async function loginHandler(req, res) {
  const { username, password } = req.body ?? {};
  const expectedUser = process.env.ADMIN_USER || "kirill";
  const expectedPassword = process.env.ADMIN_PASSWORD || "change_me";
  const normalized = String(username || "").trim().toLowerCase();
  const adminMatches = username === expectedUser && password === expectedPassword;
  const db = adminMatches ? null : await readDb();
  const user = db?.users?.find((item) => String(item.email || "").toLowerCase() === normalized && item.status !== "disabled");
  if (!adminMatches && (!user || !verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  res.cookie(cookieName, createSessionCookie(adminMatches ? username : user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  return res.json({ ok: true, username: adminMatches ? username : user.email, role: user?.role || "ops" });
}

export function logoutHandler(req, res) {
  res.clearCookie(cookieName);
  res.json({ ok: true });
}

function verifyPassword(password, stored) {
  if (!stored || !String(stored).startsWith("scrypt:")) return false;
  const [, salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password || ""), salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

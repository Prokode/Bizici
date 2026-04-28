import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin, type AdminDoc, type AdminRole } from "@workspace/db";
import { logger } from "./logger";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        username: string;
        role: AdminRole;
        isRoot: boolean;
      };
    }
  }
}

const JWT_SECRET = process.env["ADMIN_JWT_SECRET"];
const TOKEN_TTL = "7d";

export function getJwtSecret(): string {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw new Error(
      "ADMIN_JWT_SECRET env var is missing or too short (min 16 chars).",
    );
  }
  return JWT_SECRET;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

type JwtPayload = {
  sub: string;
  username: string;
  role: AdminRole;
  isRoot: boolean;
};

export function signAdminToken(admin: AdminDoc): string {
  const payload: JwtPayload = {
    sub: String(admin._id),
    username: admin.username,
    role: admin.role as AdminRole,
    isRoot: Boolean(admin.isRoot),
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_TTL,
    algorithm: "HS256",
  });
}

export function verifyAdminToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as JwtPayload;
    if (
      typeof decoded !== "object" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.username !== "string"
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  // Fallback: token in cookie (not used by current frontend, but cheap to support)
  const cookie = req.headers.cookie ?? "";
  const m = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired admin token" });
    return;
  }
  // Verify the admin still exists (in case it was deleted server-side).
  const admin = await Admin.findById(payload.sub).lean();
  if (!admin) {
    res.status(401).json({ error: "Admin account no longer exists" });
    return;
  }
  req.admin = {
    id: String(admin._id),
    username: admin.username,
    role: admin.role as AdminRole,
    isRoot: Boolean(admin.isRoot),
  };
  next();
}

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.admin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  if (req.admin.role !== "super_admin") {
    res
      .status(403)
      .json({ error: "Only super-admins can perform this action" });
    return;
  }
  next();
}

/**
 * Allow only roles capable of destructive / write actions on platform data.
 * `moderator` is read-mostly and may only delete messages/conversations
 * (handled inline). All other mutations require admin or super_admin.
 */
export function requireWriter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.admin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  if (req.admin.role !== "admin" && req.admin.role !== "super_admin") {
    res.status(403).json({
      error: "Action réservée aux administrateurs",
    });
    return;
  }
  next();
}

// ----- Login rate limiting (in-memory, per-process) ------------------------
// Simple sliding-window throttle: max 8 attempts per 15 min per IP+username.
// Sufficient defence-in-depth for a small ops UI; for HA deployments,
// promote to a shared store (Redis) later.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map<string, number[]>();

function loginKey(req: Request, username: string): string {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${ip}:${username.toLowerCase()}`;
}

export function checkLoginRateLimit(
  req: Request,
  username: string,
): { allowed: boolean; retryAfterSec: number } {
  const key = loginKey(req, username);
  const now = Date.now();
  const arr = (loginAttempts.get(key) ?? []).filter(
    (t) => now - t < LOGIN_WINDOW_MS,
  );
  if (arr.length >= LOGIN_MAX_ATTEMPTS) {
    const oldest = arr[0] ?? now;
    return {
      allowed: false,
      retryAfterSec: Math.ceil((LOGIN_WINDOW_MS - (now - oldest)) / 1000),
    };
  }
  arr.push(now);
  loginAttempts.set(key, arr);
  return { allowed: true, retryAfterSec: 0 };
}

export function clearLoginAttempts(req: Request, username: string): void {
  loginAttempts.delete(loginKey(req, username));
}

/**
 * Bootstrap the root admin from env on server start.
 *
 * - ROOT_ADMIN_USERNAME (default "root") + ROOT_ADMIN_PASSWORD must be present.
 * - If no admin with that username exists, create it with role=super_admin, isRoot=true.
 * - If it already exists, sync its password (so rotating the env var rotates the DB),
 *   force role=super_admin and isRoot=true (root can never be demoted).
 */
export async function bootstrapRootAdmin(): Promise<void> {
  const username = (process.env["ROOT_ADMIN_USERNAME"] || "root")
    .toLowerCase()
    .trim();
  const password = process.env["ROOT_ADMIN_PASSWORD"];
  if (!password || password.length < 8) {
    logger.warn(
      "ROOT_ADMIN_PASSWORD missing or too short — skipping root admin bootstrap. The admin web app will not be usable until this is set.",
    );
    return;
  }
  const passwordHash = await hashPassword(password);
  const existing = await Admin.findOne({ username });
  if (!existing) {
    await Admin.create({
      username,
      passwordHash,
      role: "super_admin",
      isRoot: true,
      createdBy: null,
    });
    logger.info({ username }, "Root admin created");
    return;
  }
  // Always re-sync password + role so rotating env var works and root can't be demoted.
  existing.passwordHash = passwordHash;
  existing.role = "super_admin";
  existing.isRoot = true;
  await existing.save();
  logger.info({ username }, "Root admin synchronized");
}

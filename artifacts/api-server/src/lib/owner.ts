import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      ownerId: string;
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireOwnerId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const raw = req.header("X-Owner-Id")?.trim();
  if (!raw || !UUID_RE.test(raw)) {
    res.status(400).json({ error: "Missing or invalid X-Owner-Id header (must be a UUID)" });
    return;
  }
  req.ownerId = raw;
  next();
}

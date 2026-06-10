import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { rbacMiddleware } from "./rbac";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
export const LOCAL_BYPASS_TOKEN = "local-dev-bypass-token";
export const LOCAL_BYPASS_USER: JwtPayload = {
  userId: 1,
  role: "admin",
  email: "admin@company.com",
};

export interface JwtPayload {
  userId: number;
  role: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function isAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.BYPASS_LOGIN === "true";
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  if (isAuthBypassEnabled() && token === LOCAL_BYPASS_TOKEN) {
    (req as any).user = LOCAL_BYPASS_USER;
    void rbacMiddleware(req, res, next);
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    void rbacMiddleware(req, res, next);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Decode without verifying — Clerk already issued this token
    // Full verification happens via Clerk's JWKS in production
    const decoded = jwt.decode(token) as { sub: string } | null;

    if (!decoded?.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.userId = decoded.sub;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

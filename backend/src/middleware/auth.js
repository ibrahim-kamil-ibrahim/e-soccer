import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "./errorHandler.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
  });
}

export function optionalAuth(req, _res, next) {
  const token =
    req.cookies?.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.authId = Number(payload.sub);
    req.authRole = payload.role;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export async function requireAuth(req, _res, next) {
  const token =
    req.cookies?.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) return next(new AppError(401, "Authentication required"));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.adminUser.findUnique({
      where: { id: Number(payload.sub) },
    });
    if (!user || user.status !== "ACTIVE") {
      return next(new AppError(401, "Account is inactive or does not exist"));
    }
    req.user = user;
    next();
  } catch {
    return next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}
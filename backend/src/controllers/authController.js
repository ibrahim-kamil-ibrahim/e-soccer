import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const identifier = (email || "").trim();

  let user = await prisma.adminUser.findUnique({
    where: { email: identifier.toLowerCase() },
  });
  if (!user) {
    user = await prisma.adminUser.findFirst({ where: { username: identifier } });
  }

  // Database-backed lockout survives restarts and works across instances
  if (user && user.lockedUntil && user.lockedUntil > new Date()) {
    const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(429, `Account locked. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.`);
  }

  if (!user || user.status !== "ACTIVE") {
    throw new AppError(401, "Invalid username or password");
  }

  const valid = await bcrypt.compare(password || "", user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });
    throw new AppError(401, "Invalid username or password");
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });

  const token = signToken(user);
  setAuthCookie(res, token);

  res.json({
    success: true,
    token,
    user: publicUser(user),
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out" });
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, preferences } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (preferences !== undefined) updates.preferences = preferences;
  if (email !== undefined) {
    const normalizedEmail = String(email).toLowerCase();
    const existing = await prisma.adminUser.findFirst({
      where: { email: normalizedEmail, NOT: { id: req.user.id } },
    });
    if (existing) throw new AppError(409, "Email is already in use");
    updates.email = normalizedEmail;
  }
  const user = await prisma.adminUser.update({
    where: { id: req.user.id },
    data: updates,
  });
  res.json({ success: true, user: publicUser(user) });
});

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}
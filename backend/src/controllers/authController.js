import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const identifier = (email || "").trim();

  let user = await prisma.adminUser.findUnique({
    where: { email: identifier.toLowerCase() },
  });
  if (!user) {
    user = await prisma.adminUser.findFirst({ where: { username: identifier } });
  }

  if (!user || user.status !== "ACTIVE") {
    throw new AppError(401, "Invalid username or password");
  }

  const valid = await bcrypt.compare(password || "", user.passwordHash);
  if (!valid) throw new AppError(401, "Invalid username or password");

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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
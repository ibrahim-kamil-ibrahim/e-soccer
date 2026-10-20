import { Router } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { doubleCsrf } from "csrf-csrf";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
import apiLimiter from "./middleware/rateLimit.js";
import { sanitizeObject } from "./middleware/sanitize.js";

import authRoutes from "./routes/auth.js";
import competitionRoutes from "./routes/competitions.js";
import teamRoutes from "./routes/teams.js";
import playerRoutes from "./routes/players.js";
import matchRoutes from "./routes/matches.js";
import newsRoutes from "./routes/news.js";
import mediaRoutes from "./routes/media.js";
import userRoutes from "./routes/users.js";
import settingRoutes from "./routes/settings.js";
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import cityRoutes from "./routes/cities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

setupSwagger(app);

app.use(apiLimiter);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
});

app.use(cookieParser());

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.jwtSecret,
  getSessionIdentifier: (req) => req.cookies?.token || "",
  cookieName: env.nodeEnv === "production" ? "__Host-psifi.x-csrf-token" : "psifi.x-csrf-token",
  cookieOptions: {
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});

app.get("/api/csrf-token", (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ success: true, token });
});

if (env.nodeEnv !== "production") app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const uploadDir = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// Uploaded files (incl. SVG) must never execute script in the API origin
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res) => {
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src * data:; sandbox");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "E-Soccer API is running" })
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cities", cityRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
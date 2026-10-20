import "dotenv/config";

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;

if (nodeEnv === "production" && !jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required in production");
}

export const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:9999",
  jwtSecret: jwtSecret || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  nodeEnv,
};
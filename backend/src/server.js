import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`[e-soccer] API listening on http://localhost:${env.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n[e-soccer] Port ${env.port} is already in use.`);
    console.error(`  Another process is occupying port ${env.port}.`);
    console.error(`  Find it:    netstat -ano | findstr :${env.port}`);
    console.error(`  Identify:   tasklist /FI "PID eq <PID>"`);
    console.error(`  Terminate:  taskkill /PID <PID> /F`);
    console.error(`  Then restart: npm run dev\n`);
    process.exit(1);
  }
  throw error;
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

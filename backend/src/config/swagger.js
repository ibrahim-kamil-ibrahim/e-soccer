import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Soccer API",
      version: "1.0.0",
      description: "REST API for the E-Soccer Ethiopian football platform",
      contact: {
        name: "E-Soccer Team",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app) {
  // Keep the API surface documentation out of production
  if (env.nodeEnv === "production") return;
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(specs));
  app.get("/api/docs.json", (_req, res) => res.json(specs));
}

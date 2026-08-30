// This Generates the OpenAPI document for swagger to display to UI for API docs

import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
import { registerAllPaths } from "./paths/registerPaths";

// Register all paths first
registerAllPaths();

export const openApiDocument = new OpenApiGeneratorV3(
  registry.definitions
).generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Support System API",
    version: "1.0.1",
    description: "API documentation for the Support System application",
    contact: {
      email: "animdevtests@gmail.com",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
    {
      url: "https://api.support-system.com",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "Endpoints for user authentication",
    },
    {
      name: "Admin",
      description: "Administrative endpoints",
    },
    {
      name: "Admins",
      description: "Get admin's data",
    },
    {
      name: "Tickets",
      description: "Endpoints for ticket management",
    },
    {
      name: "Comments",
      description: "Endpoints for ticket comments",
    },
  ],
  security: [
    {
      bearerAuth: [], // Default security for most endpoints
    },
  ],
});

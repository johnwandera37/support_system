// This Registers Zod schemas, a utility that collect definitions which
// would later be passed to an OpenApiGeneratorV3 or OpenApiGeneratorV31 instance.

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  signupSchema,
  loginSchema,
  ticketSchema,
  createTicketSchema,
  ticketUpdateSchema,
  commentSchema,
  commentCreateSchema,
  commentUpdateSchema,
  ticketListSchema,
  updateProfileSchema,
  agentProfileSchema,
  agentsListSchema,
  adminActionSchema,
  updateAgentDepartmentSchema,
} from "../zodSchema";

// Create registry instance without immediately registering paths
export const registry = new OpenAPIRegistry();

// Register security scheme (once) 
// Bearer token
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
    description: 'Standard JWT bearer token authentication'
});

// Cookie
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'refresh_token',
  description: 'Refresh token cookie for maintaining sessions'
})

export const getRegistry = () => {
  // This will be called after all path files are initialized
  return registry;
};

// ===================== SCHEMAS =====================
// Register each schema with a key, then simply pass register.defination to a generator will have an of the keys defined[]
// Auth
registry.register("Signup", signupSchema);
registry.register("Login", loginSchema);

// Tickets
registry.register("Ticket", ticketSchema);
registry.register("TicketCreate", createTicketSchema);
registry.register("TicketUpdate", ticketUpdateSchema);
registry.register("TicketList", ticketListSchema);

// Comments
registry.register("Comment", commentSchema);
registry.register("CommentCreate", commentCreateSchema);
registry.register("CommentUpdate", commentUpdateSchema);

// Admin
registry.register("AdminProfileUpdate", updateProfileSchema);
registry.register("AgentProfile", agentProfileSchema);
registry.register("AgentsList", agentsListSchema);
registry.register("AdminAction", adminActionSchema);
registry.register("UpdateAgentDepartment", updateAgentDepartmentSchema);

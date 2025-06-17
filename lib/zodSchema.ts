import { z } from "zod/v4";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// 🔐 Enums to ensure consistency
export const TicketStatusEnum = z.enum([
  "OPEN",
  "PENDING",
  "RESOLVED",
  "CLOSED",
]);
export const TicketPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

//Comments
export const commentSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    ticketId: z.string(),
    userId: z.string(),
    createdAt: z.iso.datetime(),
  })
  .openapi("Comment");

//Create Comments
export const commentCreateSchema = z
  .object({
    content: z.string().min(1),
    ticketId: z.string(),
    userId: z.string(), // If you manage auth elsewhere, this might be omitted from request body
  })
  .openapi("CommentCreate");

// Update comments
export const commentUpdateSchema = z
  .object({
    content: z.string().min(1).optional(),
  })
  .openapi("CommentUpdate");

// Grouped comments
export const commentSchemas = {
  base: commentSchema,
  create: commentCreateSchema,
  update: commentUpdateSchema,
};

// 👤 Auth Schemas
// Signup
export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2)
      .openapi({ example: "John Doe", description: "User's full name" }),
    email: z.email().openapi({ example: "johndoe@gmail.com" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .openapi({
        description: "Account password (min 8 characters)",
        example: "Doe@12345",
      }),
    wantsToBeAgent: z
      .boolean()
      .default(false)
      .optional()
      .openapi({
        description: "Request agent status (requires admin approval)",
        example: true,
      }),
  })
  .openapi("Signup");

//Login
export const loginSchema = z
  .object({
    email: z.email().openapi({ example: "johndoe@gmail.com" }),
    password: z.string().openapi({ example: "Doe@12345" }),
  })
  .openapi("Login");

// 🎫 Ticket Input Schemas
//Ticket creation schema
export const createTicketSchema = z
  .object({
    title: z
      .string()
      .min(5)
      .openapi({ example: "Unable to login to my account" }),
    description: z.string().min(10).openapi({
      example:
        "When I try to login, I get an error saying 'Invalid credentials' even though I'm sure my password is correct.",
    }),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  })
  .openapi("TicketCreate");

// Ticket Update Schema
export const ticketUpdateSchema = z
  .object({
    status: z
      .enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"])
      .optional()
      .openapi({ example: "RESOLVED" }),
    assignedTo: z
      .string()
      .optional()
      .openapi({ example: "cmbkl858h0002u44o97ovg0f1" }),
  })
  .openapi("TicketUpdate");

// 📦 Reusable Full Ticket Schema (for response and OpenAPI)
export const ticketSchema = z
  .object({
    id: z.string().openapi({example: "cmbkl858h0002u44o97ovg0f1"}),
    title: z.string().min(5).openapi({example: "Cannot access my account"}),
    description: z.string().min(10).openapi({example: "Getting 404 error when trying to login"}),
    status: TicketStatusEnum.default("OPEN").openapi({example: "OPEN"}),
    priority: TicketPriorityEnum.openapi({example: "HIGH"}),
    userId: z.string().openapi({example: "cmbkl858h0002u44o97ovdhdhh"}),
    assignedTo: z.string().nullable().openapi({example: null}),
    createdAt: z.iso.datetime().openapi({example: "2023-07-22T14:30:00Z"}),
    updatedAt: z.iso.datetime().openapi({example: "2023-07-22T14:30:00Z"}),
    comments: z.array(commentSchema).openapi({example: []}),
  })
  .openapi("Ticket");

// array schema for lists
export const ticketListSchema = z.array(ticketSchema).openapi("TicketList");

// Update admin profile
export const updateProfileSchema = z
  .object({
    name: z.string().min(2).openapi({
      description: "New name for the admin",
      example: "Jane Admin",
    }),
    email: z.email().openapi({
      description: "New email address",
      example: "jane.admin@example.com",
    }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .openapi({
        description: "New password required for the admin",
        example: "newSecurePassword123",
      }),
    currentPassword: z
      .string()
      .min(1, "Current default password is required")
      .openapi({ example: "seededPassword123" }),
  })
  .openapi("AdminProfileUpdate"); //check the docs, when "AdminProfileUpdate"
// create an openapi schema with the examples just like the above examples, no need to define examples the ones passed in updateProfileSchema will be used

//reusable department
const departmentSchema = z.string().openapi({
  example: "technical-support",
  description: "The department the agent is assigned to",
});
//Agent profile
export const agentProfileSchema = z
  .object({
    id: z.string().openapi({
      example: "cmblw47ka0005u43wyn26cytb",
    }),
    userId: z.string().openapi({
      example: "clxyz1234567890abcdefgh",
    }),
    department: departmentSchema,
    isAvailable: z.boolean().openapi({
      example: true,
    }),
  })
  .openapi("AgentProfile");

// Get all agents
export const agentsListSchema = z
  .array(
    z.object({
      id: z.string().openapi({
        example: "clxyz1234567890abcdefgh",
      }),
      name: z.string().openapi({
        example: "Jane Smith",
      }),
      email: z.email().openapi({
        example: "jane@example.com",
      }),
      role: z.string().openapi({
        example: "AGENT",
      }),
      createdAt: z.iso.datetime().openapi({
        example: "2023-07-20T08:45:00Z",
      }),
      agentProfile: z.object({
        department: departmentSchema,
      }),
    })
  )
  .openapi("AgentsList");

//The following gets rid of typescript error when globalThis.io is used
import type { Server as IOServer } from "socket.io";
import { TICKET_STATUS } from "./config/constants";

declare global {
  // Websoket type
  var io: IOServer | undefined;

  type UserRole = "USER" | "AGENT" | "ADMIN";

  interface User {
    id: string;
    name: string;
    role: UserRole;
    email: string;
  }

  interface Comment {
    id: string;
    content: string;
    ticketId: string;
    userId: string;
    createdAt: string;
    editedAt: string | null;
    deletedAt: string | null;
    user: User;
  }

  interface PrivateComment {
    id: string;
    content: string;
    ticketId: string;
    userId: string;
    createdAt: string;
    editedAt: string | null;
    deletedAt: string | null;
    user: User;
  }

  interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    userId: string;
    user: User;
    assignedTo: string | null;
    assignedAgent: User | null;
    createdAt: string;
    updatedAt: string;
    escalationReason: string | null;
    isEscalated: boolean;
    escalatedTo: string | null;
    escalatedBy: string | null;
    escalatedAt: string | null;
    comments: Comment[];
    privateComments: PrivateComment[];
  }

  interface TicketsApiResponse {
    tickets: Ticket[];
    totalPages: number;
    totalCount: number;
    page: number;
    limit: number;
  }

type TicketStatus = keyof typeof TICKET_STATUS;
}

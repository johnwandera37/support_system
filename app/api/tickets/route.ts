// The following API is responsible for getting all tickets based on all users
// and user(USER) creating a ticket

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { createTicketSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/responseUtils";

export async function GET(req: Request) {
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

  const user = auth.user; //Get user id and role from decoded access token
  //Filter agents/admins who need to access all tickets
  const isAgent = user.role === "AGENT" || user.role === "ADMIN";

  // Parse URL and query params
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const assignedTo = searchParams.get("assignedTo");

  const skip = (page - 1) * limit;

  try {
    const whereCondition: any = {
      ...(isAgent ? {} : { userId: user.id }),
      ...(status ? { status } : {}),
        ...(assignedTo ? { assignedTo } : {}),
    };

    const tickets = await prisma.ticket.findMany({
      where: whereCondition, //get all tickets for admin/agent, get specific tickets for agent/admin using id
      include: {
        // User who created the ticket
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        // User who is assigned to the tickets
        assignedAgent: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            // User who created the comments
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          where: {
            deletedAt: null, // Exclude soft-deleted comments
          },
        },
        privateComments: {
          orderBy: { createdAt: "asc" },
          include: {
            // Agent/admin who created the private comment
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          where: {
            deletedAt: null, // Exclude soft-deleted comments
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await prisma.ticket.count({
      where: whereCondition,
    });

    return NextResponse.json(
      {
        tickets,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
      { status: 200 }
    );
  } catch (error) {
    errLog("❌ API GET /tickets error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await authorize(["USER"])(req);
  if (!("authorized" in auth)) return auth;
  const user = auth.user; //Get user with role "USER" id from decoded access token
  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestFromZod(parsed.error);
    }

    const ticket = await prisma.ticket.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    // Trigger socket broadcast
    // Emit the ticket over socket to agents/admins
    if (globalThis.io) {
      globalThis.io.emit("new-ticket", ticket);
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    errLog("❌ API POST /tickets error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

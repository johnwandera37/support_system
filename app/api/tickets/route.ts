// The following API is responsible for getting all tickets based on all users
// and user(USER) creating a ticket

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog, log } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { createTicketSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/zodBadRequest";

export async function GET(req: Request) {
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

  const user = auth.user; //Get user id and role from decoded access token

  try {
    //Filter agents/admins who need to access all tickets
    const isAgent = user.role === "AGENT" || user.role === "ADMIN";

    const tickets = await prisma.ticket.findMany({
      where: isAgent ? {} : { userId: user.id }, //get all tickets for admin/agent, get specific tickets for agent
      include: { comments: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets, { status: 200 });
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

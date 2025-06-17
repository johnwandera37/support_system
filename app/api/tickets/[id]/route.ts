import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/middleware/authorize";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import { ticketUpdateSchema } from "@/lib/zodSchema";
import { badRequestFromZod } from "@/utils/zodBadRequest";

// The following API, gets a single ticket by id(all users), updates ticket status and assignedTo properties(admin/agent), deletes a ticket only if admin
// GET TICKET
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["USER", "AGENT", "ADMIN"])(req);
  if (!("authorized" in auth)) return auth;
  const user = auth.user; //Get user with role "USER" id from decoded access token

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { comments: true },
    });

    if (!ticket || (user.role === "USER" && ticket.userId !== user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(ticket, {status: 200});
  } catch (error) {
    errLog("GET TICKET ERROR", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE TICKET
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  //Ensure admin/agents can update tickets
  const auth = await authorize(["AGENT", "ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

  const body = await req.json(); //Get field passed to body

  const parsed = ticketUpdateSchema.safeParse(body);//validate using zod schema
  if (!parsed.success) {
    return badRequestFromZod(parsed.error);
  }

  try {
    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });
    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    //Validate assignedTo when ticket is being assigned to agent/admin
    if (parsed.data.assignedTo) {
      //Get agent or admin asscociated with assignedTo id
      const agent = await prisma.user.findUnique({
        where: { id: parsed.data.assignedTo },
      });

      if (!agent || !["AGENT", "ADMIN"].includes(agent.role)) {
        return NextResponse.json(
          { error: "Assigned user not found or not an agent/admin" },
          { status: 400 }
        );
      }

      //Use this to limit agents to assiged tickets to themselves and not to admin or other agents
      const authorizedAgentId = auth.user.id;
      const authorizedAgentRole = auth.user.role;

      //Ensure agents only assigned tickets to themselves
      if (
        agent.role === authorizedAgentRole &&
        agent.id !== authorizedAgentId
      ) {
        return NextResponse.json(
          { error: "Agents can only assigned tickets to themselves" },
          { status: 400 }
        );
      }

      //If same agent(Admin/Agent) is assigned to to the ticket return
      if (agent.id === existingTicket.assignedTo) {
        const errMsg =
          agent.role === "AGENT"
            ? "You have already assigned yourself this ticket"
            : "This ticket has already been assigned to the agent or admin";
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    errLog("TICKET PATCH ERROR", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE TICKET
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(["ADMIN"])(req);
  if (!("authorized" in auth)) return auth;

  try {
    await prisma.ticket.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    errLog("DELETE ERROR", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

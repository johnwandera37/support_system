import { endpoints } from "@/config/constants";
import { authorize } from "@/lib/auth";
import prisma from "@/lib/db";
import { nextErrorResponse } from "@/utils/responseUtils";
import { NextResponse } from "next/server";

// The following fetches all available admins, then front end can use it to display admins in a drop down
const ROUTE = endpoints.getAdmins;

export async function GET(req: Request) {
  const auth = await authorize(["ADMIN", "AGENT"])(req, ROUTE);
  if (!("authorized" in auth)) return auth;

  try {

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        // Optional: Add availability filter if needed
        // adminProfile: { isAvailable: true }
      },
      select: {
        id: true,
        name: true,
        email: true,
        // Include other relevant admin profile fields
        adminProfile: {
          select: {
            level: true
          }
        }
      },
      orderBy: {
        // Optional: Order by least busy admins
        // assignedTickets: { _count: 'asc' }
        name: 'asc'
      }
    });

    return NextResponse.json(admins);

  } catch (error) {
    return nextErrorResponse(error, 500, { route: ROUTE, message: "Failed to fetch admins" });
  }


}
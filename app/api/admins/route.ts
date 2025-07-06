import prisma from "@/lib/db";
import { NextResponse } from "next/server";

// The following fetches all available admins, then front end can use it to display admins in a drop down

export async function GET() {
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
}
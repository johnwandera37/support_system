"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketList, TicketListProps } from "@/components/ticket-list";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/context/AuthContext";

export default function AgentDashboardPage() {
  const { user, isLoading, userError } = useAuth(); // Get user from context
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user && userError === "unauthorized") {
        router.push("/");
        return;
      }

      if (user && user.role !== "AGENT") {
        router.push("/my-tickets");
        return;
      }
    }
  }, [user, isLoading, router]);

  if (!user || isLoading) {
    return null; // loader or redirect
  }

  const commonProps = {
  userId: user?.id
};

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold">Agent Dashboard</h1>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats Section */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Open Tickets"
              value="12"
              change="+2 since yesterday"
            />
            <StatCard
              title="Resolved Today"
              value="8"
              change="+3 from yesterday"
            />
            <StatCard
              title="Average Response Time"
              value="1.2h"
              change="-15min from last week"
            />
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="open">
            <TabsList className="overflow-x-auto flex-wrap sm:flex-nowrap whitespace-nowrap rounded-md bg-muted p-1 gap-1">
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
              <TabsTrigger value="inprogress">In Progress</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="escalated">Escalated</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>

            <TabsContentBlock
              value="open"
              title="Open Tickets"
              desc="All tickets that need attention from support agents."
              filter="OPEN"
            />
            <TabsContentBlock
              value="assigned"
              title="Assigned to Me"
              desc="Tickets that are currently assigned to you."
              filter="ASSIGNED"
              {...commonProps}
            />
            <TabsContentBlock
              value="inprogress"
              title="In Progress"
              desc="Tickets currently being worked on."
              filter="INPROGRESS"
              {...commonProps}
            />
            <TabsContentBlock
              value="pending"
              title="Pending"
              desc="Tickets waiting for customer or admin response."
              filter="PENDING"
              {...commonProps}
            />
            <TabsContentBlock
              value="escalated"
              title="Escalated Tickets"
              desc="Tickets that were escalated to higher-level support."
              filter="ESCALATED"
              {...commonProps}
            />
            <TabsContentBlock
              value="resolved"
              title="Resolved"
              desc="Tickets that have been resolved."
              filter="RESOLVED"
              {...commonProps}
            />
            <TabsContentBlock
              value="closed"
              title="Closed Tickets"
              desc="Tickets that have been fully closed."
              filter="CLOSED"
              {...commonProps}
            />
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{change}</p>
      </CardContent>
    </Card>
  );
}

function TabsContentBlock({
  value,
  title,
  desc,
  filter,
  userId,
}: {
  value: string;
  title: string;
  desc: string;
  filter: TicketListProps["filter"];
  userId?: string;
  userRole?: string;
}) {
  return (
    <TabsContent value={value} className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <TicketList userRole="AGENT" filter={filter} userId={userId} />
        </CardContent>
      </Card>
    </TabsContent>
  );
}

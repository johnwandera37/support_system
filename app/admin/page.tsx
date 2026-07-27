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
import { TicketList } from "@/components/ticket-list";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboardPage() {
  const { user, isLoading, userError } = useAuth(); // Get user from context
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is an admin
    if (!isLoading) {
      if (!user && userError === "unauthorized") {
        // If user is null (not authenticated), redirect to login page
        router.push("/");
        return;
      }

      if (user && user.role !== "ADMIN") {
        // If user is not admin, redirect to my-tickets
        router.push("/my-tickets");
        return;
      }
    }
  }, [isLoading, user, router, userError]);

  if (!user || isLoading) {
    return null; // Loading state or redirect will happen
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">124</div>
                <p className="text-xs text-muted-foreground">
                  +8 since last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
                <p className="text-xs text-muted-foreground">
                  +2 since yesterday
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Agents Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">Out of 8 total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Resolution Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2h</div>
                <p className="text-xs text-muted-foreground">
                  -30min from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
              <TabsTrigger value="escalated">Escalated</TabsTrigger>
              <TabsTrigger value="escalatedToMe">Escalated to me</TabsTrigger>
              <TabsTrigger value="agents">Agent Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Tickets</CardTitle>
                  <CardDescription>
                    Overview of all support tickets in the system.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList userRole="ADMIN" filter="ALL" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="escalated" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escalated Tickets</CardTitle>
                  <CardDescription>
                    Tickets that have been escalated to admin attention.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList userRole="ADMIN" filter="ESCALATED" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="escalatedToMe" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escalated to Me</CardTitle>
                  <CardDescription>
                    Escalated tickets currently assigned to you.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList
                    userRole="ADMIN"
                    filter="ESCALATED"
                    userId={user.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>
                    Overview of agent performance metrics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Agent performance metrics would be displayed here.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

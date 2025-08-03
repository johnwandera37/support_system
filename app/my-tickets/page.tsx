"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketList } from "@/components/ticket-list";
import { NewTicketForm } from "@/components/new-ticket-form";
import { useToast } from "@/hooks/use-toast";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/context/AuthContext";

export default function MyTicketsPage() {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const { user, isLoading, userError } = useAuth(); // Get user from context
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in and is USER(Only user can create tickets for this system for now)
    if (!isLoading) {
      if (!user && userError === "unauthorized") {
        router.push("/"); // redirect unauthenticated users
        return;
      }
    }
  }, [user, isLoading, router]);

  if (!user || isLoading) {
    return null; // Loading state or redirect will happen
  }

  const isUser = user.role === "USER";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <h1 className="text-lg font-semibold">Smart Support</h1>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">My Tickets</h2>
            {isUser && (
              <Button onClick={() => setShowNewTicketForm(!showNewTicketForm)}>
                {showNewTicketForm ? "Cancel" : "New Ticket"}
              </Button>
            )}
          </div>

          {isUser ? (
            showNewTicketForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submit a New Ticket</CardTitle>
                  <CardDescription>
                    Describe your issue and we'll get back to you as soon as
                    possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NewTicketForm
                    onSuccess={() => {
                      setShowNewTicketForm(false);
                      toast({
                        title: "Ticket submitted",
                        description: "We'll get back to you soon",
                      });
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <TicketList userRole="USER" />
            )
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Ticket Access Restricted</CardTitle>
                <CardDescription>
                  Agents and Admins are not allowed to create tickets. This
                  feature is coming soon!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  My Tickets' is currently unavailable. Use the navigation menu
                  to explore other sections or return to the dashboard.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

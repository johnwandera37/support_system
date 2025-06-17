"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TicketReplyForm } from "@/components/ticket-reply-form";
import { formatDistanceToNow } from "@/lib/utils";
import { SimpleAlert } from "@/components/simple-alert";

// Mock data for tickets
const mockTickets = [
  {
    id: "T-1001",
    title: "Payment failed on checkout",
    status: "open",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user: "john.doe@example.com",
    assignedTo: null,
    messages: [
      {
        id: "msg-1",
        content:
          "I tried to make a payment but it keeps failing with error code XYZ123. Can you help?",
        sender: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
  },
  {
    id: "T-1002",
    title: "Cannot login to my account",
    status: "assigned",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    user: "jane.smith@example.com",
    assignedTo: "agent@support.com",
    messages: [
      {
        id: "msg-2",
        content:
          "I'm trying to log in but it says my password is incorrect. I've reset it twice already.",
        sender: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "msg-3",
        content:
          "I'll help you with this. Can you tell me if you're using the correct email address to log in?",
        sender: "agent",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      },
    ],
  },
  {
    id: "T-1003",
    title: "Feature request: Dark mode",
    status: "resolved",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    user: "dev.user@example.com",
    assignedTo: "agent@support.com",
    messages: [
      {
        id: "msg-4",
        content:
          "Would it be possible to add a dark mode to the application? It would be easier on the eyes at night.",
        sender: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: "msg-5",
        content:
          "Thanks for the suggestion! We've added this to our feature request list and will consider it for a future update.",
        sender: "agent",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      },
      {
        id: "msg-6",
        content: "Great, thank you for considering it!",
        sender: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
      },
    ],
  },
  {
    id: "T-1004",
    title: "Billing discrepancy",
    status: "escalated",
    priority: "high",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    user: "finance@company.com",
    assignedTo: "agent@support.com",
    messages: [
      {
        id: "msg-7",
        content:
          "We were charged twice for our subscription this month. Please refund the extra charge.",
        sender: "user",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      },
      {
        id: "msg-8",
        content:
          "I'm looking into this issue and will need to escalate to our billing department.",
        sender: "agent",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
      },
    ],
  },
];

type TicketListProps = {
  userRole: "user" | "agent" | "admin";
  filter?: "all" | "open" | "assigned" | "resolved" | "escalated";
};

export function TicketList({ userRole, filter = "all" }: TicketListProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAlert, setShowAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    // In a real app, you would fetch tickets from your API
    // For demo purposes, we'll filter the mock data based on role and filter
    let filteredTickets = [...mockTickets];

    if (userRole === "user") {
      // For users, only show their own tickets
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      filteredTickets = filteredTickets.filter(
        (ticket) => ticket.user === user.email
      );
    } else if (userRole === "agent" && filter === "assigned") {
      // For agents, filter by assigned tickets
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      filteredTickets = filteredTickets.filter(
        (ticket) => ticket.assignedTo === user.email
      );
    } else if (filter !== "all") {
      // Filter by status
      filteredTickets = filteredTickets.filter(
        (ticket) => ticket.status === filter
      );
    }

    setTickets(filteredTickets);
  }, [userRole, filter]);

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
  };

  const handleReplySubmit = (ticketId: string, message: string) => {
    // In a real app, you would send this to your API
    // For demo purposes, we'll update the local state
    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === ticketId) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const newMessage = {
          id: `msg-${Date.now()}`,
          content: message,
          sender: userRole,
          timestamp: new Date().toISOString(),
        };

        return {
          ...ticket,
          messages: [...ticket.messages, newMessage],
          // If agent is replying to an open ticket, mark it as assigned
          status:
            userRole === "agent" && ticket.status === "open"
              ? "assigned"
              : ticket.status,
          assignedTo:
            userRole === "agent" && !ticket.assignedTo
              ? user.email
              : ticket.assignedTo,
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    setSelectedTicket(updatedTickets.find((t) => t.id === ticketId));
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    // In a real app, you would send this to your API
    // For demo purposes, we'll update the local state
    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          status: newStatus,
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    setSelectedTicket(updatedTickets.find((t) => t.id === ticketId));

    // Show success alert
    setShowAlert({
      type: "success",
      message: `Ticket ${ticketId} has been ${
        newStatus === "resolved" ? "resolved" : "escalated"
      } successfully.`,
    });

    // Hide alert after 3 seconds
    setTimeout(() => setShowAlert(null), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-purple-100 text-purple-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "escalated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="space-y-4">
        {showAlert && (
          <SimpleAlert type={showAlert.type} message={showAlert.message} />
        )}
        <div className="text-center py-8 text-muted-foreground">
          No tickets found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAlert && (
        <SimpleAlert type={showAlert.type} message={showAlert.message} />
      )}
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleTicketClick(ticket)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{ticket.id}</span>
                <Badge
                  variant="outline"
                  className={getStatusColor(ticket.status)}
                >
                  {ticket.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={getPriorityColor(ticket.priority)}
                >
                  {ticket.priority}
                </Badge>
              </div>
              <h3 className="font-semibold mt-1">{ticket.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {ticket.user} ·{" "}
                {formatDistanceToNow(new Date(ticket.createdAt))}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {ticket.messages.length} message
              {ticket.messages.length !== 1 ? "s" : ""}
            </div>
          </div>
        </Card>
      ))}

      {selectedTicket && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>
                  {selectedTicket.id}: {selectedTicket.title}
                </span>
                <Badge
                  variant="outline"
                  className={getStatusColor(selectedTicket.status)}
                >
                  {selectedTicket.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              {selectedTicket.messages.map((message: any) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-gray-100 mr-8"
                      : "bg-blue-50 ml-8"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">
                      {message.sender === "user"
                        ? selectedTicket.user
                        : "Support Agent"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.timestamp))}
                    </span>
                  </div>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            {(userRole === "agent" || userRole === "admin") &&
              selectedTicket.status !== "resolved" && (
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleStatusChange(selectedTicket.id, "resolved")
                    }
                  >
                    Mark as Resolved
                  </Button>
                  {userRole === "agent" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(selectedTicket.id, "escalated")
                      }
                    >
                      Escalate to Admin
                    </Button>
                  )}
                </div>
              )}

            {selectedTicket.status !== "resolved" && (
              <TicketReplyForm
                ticketId={selectedTicket.id}
                onSubmit={handleReplySubmit}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
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
import Loader from "./ui/loader";
import { formatDistanceToNow } from "@/lib/utils";
import { getPriorityColor, getStatusColor } from "@/lib/utils";
import { useTickets } from "@/hooks/useTickets";

export type TicketListProps = {
  userRole: "USER" | "AGENT" | "ADMIN";
  filter?: "ALL" | "OPEN" | "ASSIGNED" | "INPROGRESS" | "PENDING" | "ESCALATED" | "RESOLVED" | "CLOSED";
  userId?: string;
};

export function TicketList({ userRole, filter = "ALL", userId }: TicketListProps) {
  const { tickets, loading } = useTickets({
    userRole, //ADMIN, AGENT OR USER
    filter, // Ticket status, ALL is for all status
    userId,
    page: 1,
    limit: 10,
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
  };

  // , message: string add this arg later
  const handleReplySubmit = (ticketId: string) => {
    // In a real app, you would send this to your API
    // For demo purposes, we'll update the local state
    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === ticketId) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        //will uncomment and proceed later
        // const newMessage = {
        //   id: `msg-${Date.now()}`,
        //   content: message,
        //   sender: userRole,
        //   timestamp: new Date().toISOString(),
        // };

        return {
          ...ticket,
          // messages: [...ticket.messages, newMessage],
          // If agent is replying to an open ticket, mark it as assigned, well according to my backend, an agent can only reply to a ticket when they are assigned to it, we get to that
          status:
            userRole === "AGENT" && ticket.status === "OPEN"
              ? "ASSIGNED"
              : ticket.status,
          assignedTo:
            userRole === "AGENT" && !ticket.assignedTo
              ? user.email
              : ticket.assignedTo,
        };
      }
      return ticket;
    });

    // setTickets(updatedTickets);
    const updated = updatedTickets.find((t) => t.id === ticketId);
    if (updated) {
      setSelectedTicket(updated);
    }
  };

  // const handleStatusChange = (ticketId: string, newStatus: string) => {
  //   // In a real app, you would send this to your API
  //   // For demo purposes, we'll update the local state
  //   const updatedTickets = tickets.map((ticket) => {
  //     if (ticket.id === ticketId) {
  //       return {
  //         ...ticket,
  //         status: newStatus,
  //       };
  //     }
  //     return ticket;
  //   });

  //   setTickets(updatedTickets);
  //   setSelectedTicket(updatedTickets.find((t) => t.id === ticketId));

  //   // Show success alert
  //   setShowAlert({
  //     type: "success",
  //     message: `Ticket ${ticketId} has been ${
  //       newStatus === "resolved" ? "resolved" : "escalated"
  //     } successfully.`,
  //   });

  //   // Hide alert after 3 seconds
  //   setTimeout(() => setShowAlert(null), 3000);
  // };

  if (!tickets || tickets.length === 0) {
    return (
      <>
        {loading ? (
          // Show loader when ticket data is being fetched
          <div className="flex justify-center items-center py-10">
            <Loader variant="inline" size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* {showAlert && (
              <SimpleAlert type={showAlert.type} message={showAlert.message} />
            )} */}
            <div className="text-center py-8 text-muted-foreground">
              No tickets found.
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* {showAlert && (
        <SimpleAlert type={showAlert.type} message={showAlert.message} />
      )} */}

      {/* List of tickets */}
      {tickets.map((ticket) => {
        const publicCount = ticket.comments?.length ?? 0;
        const privateCount = ticket.privateComments?.length ?? 0;
        const total =
          userRole === "USER" ? publicCount : publicCount + privateCount;

        return (
          <Card
            key={ticket.id}
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleTicketClick(ticket)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Left */}
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
                  {ticket.user.name} ·{" "}
                  {formatDistanceToNow(new Date(ticket.createdAt))}
                </p>
              </div>

              {/* Right */}
              <div>
                <div className="flex flex-col sm:items-end gap-2 text-left sm:text-right">
                  <div className="text-sm text-muted-foreground">
                    {total} message{total !== 1 ? "s" : ""}
                  </div>
                  <h3 className="font-semibold mt-1">
                    {(ticket.assignedTo && ticket.assignedAgent)
                      ? `Assigned to: ${ticket.assignedAgent.name}`
                      : "Unassigned"}
                  </h3>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

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

            {/* <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
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
            </div> */}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              {[
                ...selectedTicket.comments,
                ...(userRole !== "USER" ? selectedTicket.privateComments : []),
              ]
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                )
                .map((message: Comment | PrivateComment) => {
                  const person = "author" in message ? message.author : message.user;
                  const isUser = person?.role === "USER";

                  const name = person?.name || "Unknown";
                  const timestamp = message.createdAt;

                  return (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${isUser ? "bg-gray-100 mr-8" : "bg-blue-50 ml-8"
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(timestamp))}
                        </span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  );
                })}
            </div>

            {/* Agent or admin side */}
            {(userRole === "AGENT" || userRole === "ADMIN") &&
              selectedTicket.status !== "resolved" && (
                <div className="flex gap-2 mt-2">
                  {userRole === "AGENT" && (
                    <Button
                      variant="outline"
                      size="sm"
                    // onClick={() =>
                    //   handleStatusChange(selectedTicket.id, "escalated")
                    // }
                    >
                      In Progress
                    </Button>
                  )}

                  {userRole === "AGENT" && (
                    <Button
                      variant="outline"
                      size="sm"
                    // onClick={() =>
                    //   handleStatusChange(selectedTicket.id, "escalated")
                    // }
                    >
                      Pending
                    </Button>
                  )}

                  {userRole === "AGENT" && (
                    <Button
                      variant="outline"
                      size="sm"
                    // onClick={() =>
                    //   handleStatusChange(selectedTicket.id, "escalated")
                    // }
                    >
                      Escalate to Admin
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                  // onClick={() =>
                  //   handleStatusChange(selectedTicket.id, "resolved")
                  // }
                  >
                    Mark as Resolved
                  </Button>

                  {userRole === "AGENT" && (
                    <Button
                      variant="outline"
                      size="sm"
                    // onClick={() =>
                    //   handleStatusChange(selectedTicket.id, "escalated")
                    // }
                    >
                      Close
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


// const [showAlert, setShowAlert] = useState<{
//   type: "success" | "error" | "warning" | "info";
//   message: string;
// } | null>(null);

// // This will be moved into a hook
// useEffect(() => {
//   async function fetchTickets() {
//     setLoading(true);
//     try {
//       const res = await api.get(endpoints.tickets);
//       log("Fetch tickets res", res);
//       if (!res) throw new Error("Failed to fetch tickets");

//       const ticketData = res.data.tickets;

//       // Apply basic filtering here if needed, for now we’ll just set them
//       setTickets(ticketData);
//     } catch (error) {
//       errLog("Error fetching tickets:", getErrorMessage(error));
//       setShowAlert({
//         type: "error",
//         message: "Failed to load tickets. Please try again later.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   }

//   fetchTickets();

//   // setTickets(filteredTickets);
// }, [userRole, filter]);
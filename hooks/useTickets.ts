import { endpoints } from "@/config/constants";
import api from "@/lib/axios";
import { getErrorMessage } from "@/utils/errMsg";
import { errLog } from "@/utils/logger";
import { useState, useEffect } from "react";
import { useAlert } from "@/context/AlertContext";

type TicketStatusFilter =
  | "ALL"
  | "OPEN"
  | "ASSIGNED"
  | "INPROGRESS"
  | "PENDING"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

interface UseTicketsOptions {
  userRole: "USER" | "AGENT" | "ADMIN";
  filter?: TicketStatusFilter;
  userId?: string;
  page?: number;
  limit?: number;
}

export function useTickets({
  userRole,
  filter = "ALL",
  userId,
  page = 1,
  limit = 10,
}: UseTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const { showAlert } = useAlert();

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, string | number | undefined | null> = {
          page,
          limit,
        };

        if (filter && filter !== "ALL") {
          params.status = filter; // The passed fllter
        }

        // Adding id to params to help filter on id
        if (userRole === "AGENT" && userId) {
          if (filter === "ASSIGNED") {
            params.assignedTo = userId;
          } else if (
            [
              "INPROGRESS",
              "PENDING",
              "ESCALATED",
              "RESOLVED",
              "CLOSED",
            ].includes(filter)
          ) {
            params.status = filter;
            params.assignedTo = userId;
          }
        } else if (userRole === "ADMIN" && userId) {
          if (filter === "ESCALATED") {
            params.status = "ESCALATED";
            params.assignedTo = userId;
          }
        } else {
          // For OPEN: show unassigned tickets
          if (filter === "OPEN") {
            params.assignedTo = null;
            params.status = "OPEN";
          }
        }

        const res = await api.get<TicketsApiResponse>(endpoints.tickets, {
          params,
        });

        setTickets(res.data.tickets);
        setTotalPages(res.data.totalPages);
        setTotalTickets(res.data.totalCount);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        errLog("Error fetching tickets:", message);
        showAlert({
          type: "error",
          title: "Fetch tickets",
          message: "Failed to load tickets. Please try again later.",
          timeout: 5, // optional, dismiss after 5 seconds
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [userRole, filter, userId, page, limit]);

  return {
    tickets,
    loading,
    error,
    totalPages,
    totalTickets,
  };
}

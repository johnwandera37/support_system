import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { log } from "@/utils/console-logger";

export function useTicketSocket() {
  const [newTicket, setNewTicket] = useState<any | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleNewTicket = (ticket: any) => {
      log("🎉 New ticket received:", ticket);
      setNewTicket(ticket);
    };

    socket.on("new-ticket", handleNewTicket);

    return () => {
      socket.off("new-ticket", handleNewTicket);
    };
  }, []);

  return { newTicket };
}

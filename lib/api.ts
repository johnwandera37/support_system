// Front end APIs execution helpers
import api from "./axios";

export async function createTicket(payload: {
  title: string;
  description: string;
  priority: string;
}) {
  const response = await api.post("/api/tickets", payload);
  return response.data;
}
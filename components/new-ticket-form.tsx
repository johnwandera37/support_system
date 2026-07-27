"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTicket } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { errLog } from "@/utils/logger";
import { getErrorMessage } from "@/utils/errMsg";
import Loader from "./ui/loader";

type NewTicketFormProps = {
  onSuccess: () => void;
};

export function NewTicketForm({ onSuccess }: NewTicketFormProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "LOW", // or "MEDIUM", "HIGH"
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // const ticket = await createTicket(form);
      // const socket = getSocket();
      // socket.emit("create-ticket", ticket); // Optional: can be removed if backend already emits it
      await createTicket(form);
      getSocket(); // Optional: can be removed if backend already emits it

      // Call the success callback
      onSuccess();

      // Reset the form
      setForm({
        title: "",
        description: "",
        priority: "",
      });
    } catch (error) {
      errLog("❌ Failed to create ticket", getErrorMessage(error));
      toast({
        title: "Ticket creation failed",
        description: "Error creating ticket",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          name="title"
          placeholder="Brief description of your issue"
          value={form.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          name="description"
          placeholder="Please provide details about your issue"
          rows={5}
          value={form.description}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={form.priority}
          onValueChange={(value) => handleSelectChange("priority", value)}
        >
          <SelectTrigger name="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low - Not urgent</SelectItem>
            <SelectItem value="MEDIUM">Medium - Needs attention</SelectItem>
            <SelectItem value="HIGH">High - Urgent issue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader variant="button" size="sm" />
            Submitting...
          </>
        ) : (
          "Submit Ticket"
        )}
      </Button>
    </form>
  );
}

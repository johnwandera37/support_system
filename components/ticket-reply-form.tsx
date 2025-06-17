"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type TicketReplyFormProps = {
  ticketId: string
  onSubmit: (ticketId: string, message: string) => void
}

export function TicketReplyForm({ ticketId, onSubmit }: TicketReplyFormProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)

    try {
      // In a real app, you would send this to your API
      // For demo purposes, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Call the submit callback
      onSubmit(ticketId, message)

      // Reset the form
      setMessage("")
    } catch (error) {
      console.error("Error submitting reply:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Type your reply..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        className="min-h-[100px]"
      />

      <Button type="submit" disabled={isSubmitting || !message.trim()}>
        {isSubmitting ? "Sending..." : "Send Reply"}
      </Button>
    </form>
  )
}

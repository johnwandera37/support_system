"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TicketList } from "@/components/ticket-list"
import { UserNav } from "@/components/user-nav"

export default function AgentDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and is an agent
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "agent" && parsedUser.role !== "admin") {
      router.push("/my-tickets")
      return
    }

    setUser(parsedUser)
  }, [router])

  if (!user) {
    return null // Loading state or redirect will happen
  }

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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">+2 since yesterday</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">+3 from yesterday</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2h</div>
                <p className="text-xs text-muted-foreground">-15min from last week</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open Tickets</TabsTrigger>
              <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
              <TabsTrigger value="resolved">Recently Resolved</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Open Tickets</CardTitle>
                  <CardDescription>All tickets that need attention from support agents.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList userRole="agent" filter="open" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="assigned" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned to Me</CardTitle>
                  <CardDescription>Tickets that are currently assigned to you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList userRole="agent" filter="assigned" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="resolved" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recently Resolved</CardTitle>
                  <CardDescription>Tickets that were resolved in the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TicketList userRole="agent" filter="resolved" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

// GET /api/tickets (list)

import { GET } from "@/app/api/tickets/route";
import { createAndTrackTicket, createRouteRequest, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";

export default function describeGET(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
    describe("GET /api/tickets", () => {
        // All three roles are allowed here, and this route never returns 403 —
        // so the helper only exercises the free 401 (missing/invalid token) cases.
        authorizationRoleChecks({
            method: "GET",
            url: "http://localhost/api/tickets",
            routeHandler: GET,
            rolesAllowed: ["USER", "AGENT", "ADMIN"],
            getTokens: () => ctx.tokens,
        });

        it("should only return the requesting user's own tickets for a USER", async () => {
            const ownTicket = await createAndTrackTicket(tracker, ctx.users.user.id);
            const othersTicket = await createAndTrackTicket(tracker, ctx.users.agent.id);

            const { req } = createRouteRequest("GET", "http://localhost/api/tickets", ctx.tokens.userToken);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            const ids = data.tickets.map((t: any) => t.id);
            expect(ids).toContain(ownTicket.id);
            expect(ids).not.toContain(othersTicket.id);
        });

        it("should return tickets across all users for an AGENT", async () => {
            const ownTicket = await createAndTrackTicket(tracker, ctx.users.user.id);

            const { req } = createRouteRequest("GET", "http://localhost/api/tickets", ctx.tokens.agentToken);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            const ids = data.tickets.map((t: any) => t.id);
            expect(ids).toContain(ownTicket.id);
        });

        it("should filter by status query param", async () => {
            const openTicket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "OPEN" });
            const resolvedTicket = await createAndTrackTicket(tracker, ctx.users.user.id, { status: "RESOLVED" });

            const { req } = createRouteRequest("GET", "http://localhost/api/tickets?status=RESOLVED", ctx.tokens.userToken);
            const res = await GET(req);
            const data = await res.json();

            const ids = data.tickets.map((t: any) => t.id);
            expect(ids).toContain(resolvedTicket.id);
            expect(ids).not.toContain(openTicket.id);
        });

        it("should paginate results according to page/limit", async () => {
            const { req } = createRouteRequest("GET", "http://localhost/api/tickets?page=1&limit=1", ctx.tokens.agentToken);
            const res = await GET(req);
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.limit).toBe(1);
            expect(data.page).toBe(1);
            expect(data.tickets.length).toBeLessThanOrEqual(1);
        });
    });
}
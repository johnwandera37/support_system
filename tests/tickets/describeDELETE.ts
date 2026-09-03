// DELETE /api/tickets/{id}

import { DELETE } from "@/app/api/tickets/[id]/route";
import { createAndTrackTicket, createRouteRequest, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";

export default function describeDELETE(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
    describe("DELETE /api/tickets/{id}", () => {
        // Pure role gate (ADMIN only) — ideal fit for the shared helper.
        authorizationRoleChecks({
            method: "DELETE",
            url: "http://localhost/api/tickets/placeholder",
            routeHandler: DELETE,
            rolesAllowed: ["ADMIN"],
            getTokens: () => ctx.tokens,
            getParams: () => ({ id: "placeholder" }),
        });

        it("should allow ADMIN to delete a ticket", async () => {
            const ticket = await createAndTrackTicket(tracker, ctx.users.user.id);
            const { req, params } = createRouteRequest("DELETE", `http://localhost/api/tickets/${ticket.id}`, ctx.tokens.adminToken, {
                id: ticket.id,
            });

            const res = await DELETE(req, { params });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe("Ticket deleted successfully");
            // no need to also call tracker.cleanup for this ticket — it's already gone
        });

        it("should return 404 for a non-existent ticket id", async () => {
            const { req, params } = createRouteRequest(
                "DELETE",
                "http://localhost/api/tickets/does-not-exist",
                ctx.tokens.adminToken,
                { id: "does-not-exist" }
            );

            const res = await DELETE(req, { params });
            const data = await res.json();

            expect(res.status).toBe(404);
            expect(data.error).toBe("Ticket not found");
        });
    });
}
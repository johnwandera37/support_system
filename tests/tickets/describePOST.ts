// POST /api/tickets

import { POST } from "@/app/api/tickets/route";
import { createRouteRequest, TestContext, createTestTracker } from "../testHelpers";
import { authorizationRoleChecks } from "../authorizationsChecks";

export default function describePOST(ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) {
    describe("POST /api/tickets", () => {
        // Pure role gate (USER only, no competing business-rule 403s) — safe for the shared helper.
        authorizationRoleChecks({
            method: "POST",
            url: "http://localhost/api/tickets",
            routeHandler: POST,
            rolesAllowed: ["USER"],
            getTokens: () => ctx.tokens,
            getBody: () => ({
                title: "Sample ticket title",
                description: "Sample ticket description long enough",
                priority: "MEDIUM",
            }),
            onSuccess: (data) => tracker.trackTicket(data.id), // fixes the orphaned-ticket bug
        });

        it("should create a ticket for a valid USER request", async () => {
            const { req } = createRouteRequest("POST", "http://localhost/api/tickets", ctx.tokens.userToken, undefined, {
                title: "Unable to login",
                description: "Getting invalid credentials error repeatedly",
                priority: "HIGH",
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data).toHaveProperty("id");
            expect(data.title).toBe("Unable to login");
            expect(data.status).toBe("OPEN");
            expect(data.userId).toBe(ctx.users.user.id);

            tracker.trackTicket(data.id);
        });

        it("should reject a title shorter than 5 characters", async () => {
            const { req } = createRouteRequest("POST", "http://localhost/api/tickets", ctx.tokens.userToken, undefined, {
                title: "Bad",
                description: "Long enough description here",
                priority: "LOW",
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data).toHaveProperty("error.title");
        });

        it("should reject a description shorter than 10 characters", async () => {
            const { req } = createRouteRequest("POST", "http://localhost/api/tickets", ctx.tokens.userToken, undefined, {
                title: "Valid title here",
                description: "short",
                priority: "LOW",
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data).toHaveProperty("error.description");
        });

        it("should reject an invalid priority value", async () => {
            const { req } = createRouteRequest("POST", "http://localhost/api/tickets", ctx.tokens.userToken, undefined, {
                title: "Valid title here",
                description: "Valid description long enough",
                priority: "SUPER_URGENT",
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data).toHaveProperty("error.priority");
        });

        it("should reject malformed JSON body", async () => {
            const req = new Request("http://localhost/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.tokens.userToken}` },
                body: "{not valid json",
            });

            const res = await POST(req);
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toBe("Request body must be valid JSON");
        });
    });
}
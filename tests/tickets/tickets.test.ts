// tests/tickets/tickets.test.ts
import { setupUserContext, createTestTracker, TestContext } from "../testHelpers";
import { describeTicketRoutes } from ".";

const ctx: TestContext = {} as TestContext;
const tracker = createTestTracker();

describe.only("Tickets API", () => {
  beforeAll(async () => {
    Object.assign(ctx, await setupUserContext());
  });

  afterAll(async () => {
    await tracker.cleanup([ctx.users.user.email, ctx.users.agent.email, ctx.users.admin.email]);
  });

  describeTicketRoutes(ctx, tracker);
});
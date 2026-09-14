// tests/tickets/admin.test.ts
import { describeAdminRoutes } from ".";
import { setupUserContext, createTestTracker, TestContext, closeTestConnections } from "../testHelpers";

const ctx: TestContext = {} as TestContext;
const tracker = createTestTracker();

describe.only("Admin API", () => {
  beforeAll(async () => {
    Object.assign(ctx, await setupUserContext());
  });

  afterAll(async () => {
    await tracker.cleanup([ctx.users.user.email, ctx.users.agent.email, ctx.users.admin.email]);
    await closeTestConnections();
  });

  describeAdminRoutes(ctx, tracker);
});
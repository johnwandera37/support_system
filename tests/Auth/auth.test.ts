// tests/auth/auth.test.ts
import { setupUserContext, createTestTracker, TestContext, closeTestConnections } from "../testHelpers";
import { describeAuthRoutes } from ".";

const ctx: TestContext = {} as TestContext;
const tracker = createTestTracker();

describe("Auth API", () => {
  beforeAll(async () => {
    Object.assign(ctx, await setupUserContext());
  });

  afterAll(async () => {
    await tracker.cleanup([ctx.users.user.email, ctx.users.agent.email, ctx.users.admin.email]);
    await closeTestConnections();
  });

  describeAuthRoutes(ctx, tracker);
});
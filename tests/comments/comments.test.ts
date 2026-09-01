import {
  createTestTracker,
  setupUserContext,
  TestContext,
} from "../testHelpers";
import { describeCommentRoutes } from ".";

const ctx: TestContext = {} as TestContext;
const tracker = createTestTracker();

describe("Comments API", () => {
  // Seed db
  beforeAll(async () => {
    // Assign everything to context
    Object.assign(ctx, await setupUserContext());
  });

  // Clear db in the end, regardless of how test ran
  afterAll(async () => {
    await tracker.cleanup([ctx.users.user.email, ctx.users.agent.email, ctx.users.admin.email]);
  });

  describeCommentRoutes(ctx, tracker);
});

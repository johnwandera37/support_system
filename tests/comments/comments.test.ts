import {
  cleanupTestContext,
  setupCommentTestContext,
  TestContext,
} from "../testHelpers";
import { describeCommentRoutes } from ".";
import { getErrorMessage } from "@/utils/errMsg";
import { describeDELETE } from "./describeDELETE";
import describePOST from "./describePOST";
import describePUT from "./describePUT";

const ctx: TestContext = {} as TestContext;

describe("Comments API", () => {
  // Seed db
  beforeAll(async () => {
    const context = await setupCommentTestContext();

    // Assign everything to context
    Object.assign(ctx, context);
  });

  // Clear db in the end
  afterAll(async () => await cleanupTestContext(ctx));

  describeCommentRoutes(ctx);
});

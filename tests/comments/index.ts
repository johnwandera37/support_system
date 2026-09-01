
import { createTestTracker, TestContext } from "../testHelpers";
import describeDELETE from "./describeDELETE";
import describePOST from "./describePOST";
import describePUT from "./describePUT";

export const describeCommentRoutes = (ctx: TestContext,  tracker: ReturnType<typeof createTestTracker>) => {
  describePOST(ctx, tracker);
  describePUT(ctx, tracker);
  describeDELETE(ctx, tracker);
};

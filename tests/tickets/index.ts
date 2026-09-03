// tests/tickets/index.ts
import { TestContext, createTestTracker } from "../testHelpers";
import describePOST from "./describePOST";
import describeGET from "./describeGET";
import describeGETById from "./describeGETById";
import describeDELETE from "./describeDELETE";

export const describeTicketRoutes = (ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) => {
  describePOST(ctx, tracker);
  describeGET(ctx, tracker);
  describeGETById(ctx, tracker);
  describeDELETE(ctx, tracker);
};
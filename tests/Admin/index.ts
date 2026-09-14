// tests/admin/index.ts
import { TestContext, createTestTracker } from "../testHelpers";
import describeAction from "./describeAction";
import describeReadRoutes from "./describeReadRoutes";
import describeUpdateDepartment from "./describeUpdateDepartment";

export const describeAdminRoutes = (ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) => {
  describeAction(ctx, tracker);
  describeUpdateDepartment(ctx, tracker);
  describeReadRoutes(ctx, tracker);
};
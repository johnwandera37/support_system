
import { TestContext } from "../testHelpers";
import { describeDELETE } from "./describeDELETE";
import describePOST from "./describePOST";

import describePUT from "./describePUT";

export const describeCommentRoutes = (ctx: TestContext) => {
  describePOST(ctx);
  describePUT(ctx);
  describeDELETE(ctx);
};

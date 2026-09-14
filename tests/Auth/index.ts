// tests/auth/index.ts
import { TestContext, createTestTracker } from "../testHelpers";
import describeAccessToken from "./describeAccessToken";
import describeLogin from "./describeLogin";
import describeLogout from "./describeLogout";
import describeMe from "./describeMe";
import describeRefresh from "./describeRefresh";
import describeSignup from "./describeSignup";


export const describeAuthRoutes = (ctx: TestContext, tracker: ReturnType<typeof createTestTracker>) => {
  describeSignup(ctx, tracker);
  describeLogin(ctx, tracker);
  describeLogout(ctx);
   describeRefresh(ctx);
  describeMe(ctx);
  describeAccessToken(ctx);
};
import { z } from "zod/v4";

export const zodTreeifiedErrorSchema = z.object({
  error: z.object({
    errors: z.array(z.string()).optional(),
    properties: z.record(
      z.string(),
      z.object({
        errors: z.array(z.string()),
      })
    ).optional(),
  }),
});

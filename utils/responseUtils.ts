import { NextResponse } from "next/server";
import { treeifyError, ZodError } from "zod/v4";

// bad request from zod
export function badRequestFromZod(error: ZodError, statusVal: number = 400) {
  return NextResponse.json({ error: treeifyError(error) }, { status: statusVal });
}

// Common next error response
export function nextErrorResponse(error: string, statusVal: number) {
  return NextResponse.json({ error: error }, { status: statusVal });
}

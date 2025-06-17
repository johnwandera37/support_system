import { NextResponse } from "next/server";
import { treeifyError, ZodError } from "zod/v4";

export function badRequestFromZod(error: ZodError, statusVal: number = 400) {
  return NextResponse.json({ error: treeifyError(error) }, { status: statusVal });
}

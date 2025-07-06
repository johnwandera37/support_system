// API route to serve OpenAPI JSON
import { openApiDocument } from "@/lib/openapi/generator";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(openApiDocument);
}

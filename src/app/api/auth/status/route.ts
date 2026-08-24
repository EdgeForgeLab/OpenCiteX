import { NextResponse } from "next/server";
import { hasValidSession, isSetupComplete } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [setupComplete, authenticated] = await Promise.all([isSetupComplete(), hasValidSession()]);
  return NextResponse.json({
    setupComplete,
    authenticated,
  });
}

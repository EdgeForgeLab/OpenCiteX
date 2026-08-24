import { NextResponse } from "next/server";
import { z } from "zod";
import { errorMessage, jsonError } from "@/lib/api";
import { attachSession, isSetupComplete, verifyAdminPassword } from "@/lib/auth";
import { clientKey, consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!(consumeRateLimit(`login:${clientKey(request)}`))) {
      return jsonError("Too many attempts. Try again in a few minutes.", 429);
    }
    if (!(await isSetupComplete())) {
      return jsonError("Setup is not complete.", 409);
    }
    const payload = schema.parse(await request.json());
    const ok = await verifyAdminPassword(payload.password);
    if (!ok) return jsonError("Invalid password.", 401);
    const response = NextResponse.json({ ok: true });
    return attachSession(response);
  } catch (error) {
    return jsonError(errorMessage(error, "Could not sign in."), 400);
  }
}

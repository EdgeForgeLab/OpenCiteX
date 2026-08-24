import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import {
  generateRecoveryCode,
  hashSecret,
  MIN_PASSWORD_LENGTH,
  normalizeRecoveryCode,
  verifySecret,
} from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  verifySessionToken,
} from "@/lib/session";

export const ADMIN_ID = "admin";

export async function isSetupComplete(): Promise<boolean> {
  const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  return Boolean(admin);
}

export async function createAdmin(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const existing = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  if (existing) throw new Error("Admin password is already set.");

  const recoveryCode = generateRecoveryCode();
  await prisma.admin.create({
    data: {
      id: ADMIN_ID,
      passwordHash: await hashSecret(password),
      recoveryCodeHash: await hashSecret(normalizeRecoveryCode(recoveryCode)),
    },
  });
  return recoveryCode;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  if (!admin) return false;
  return verifySecret(password, admin.passwordHash);
}

export async function resetAdminWithRecoveryCode(
  recoveryCode: string,
  nextPassword: string,
): Promise<string> {
  if (nextPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  if (!admin) throw new Error("Setup is not complete.");

  const ok = await verifySecret(normalizeRecoveryCode(recoveryCode), admin.recoveryCodeHash);
  if (!ok) throw new Error("Invalid recovery code.");

  const nextRecovery = generateRecoveryCode();
  await prisma.admin.update({
    where: { id: ADMIN_ID },
    data: {
      passwordHash: await hashSecret(nextPassword),
      recoveryCodeHash: await hashSecret(normalizeRecoveryCode(nextRecovery)),
    },
  });
  return nextRecovery;
}

export async function attachSession(response: NextResponse) {
  const token = await createSessionToken();
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}

export function clearSession(response: NextResponse) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export async function hasValidSession(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function unauthorizedIfGuest() {
  if (await hasValidSession()) return null;
  return jsonError("Sign in required.", 401);
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "ocx_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

function getSessionSecret(): string | null {
  const authSecret = process.env.AUTH_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const raw = authSecret?.trim() || encryptionKey?.trim();
  return raw || null;
}

function getCrypto(): Crypto {
  if (globalThis.crypto?.subtle) return globalThis.crypto;
  throw new Error("Web Crypto is not available.");
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoApi = getCrypto();
  const keyBytes = await cryptoApi.subtle.digest("SHA-256", encoder.encode(secret));
  const key = await cryptoApi.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await cryptoApi.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(signature);
}

export async function createSessionToken(): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("Set AUTH_SECRET or ENCRYPTION_KEY before creating a session.");
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  const signature = await hmacSign(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = getSessionSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [, expRaw, signature] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmacSign(secret, `v1.${expRaw}`);
  const left = fromBase64Url(signature ?? "");
  const right = fromBase64Url(expected);
  return timingSafeEqual(left, right);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

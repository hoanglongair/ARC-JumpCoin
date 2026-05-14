import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";

export const sessionCookieName = "arc_jumpcoin_session";

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry() {
  return new Date(Date.now() + appConfig.sessionTtlMinutes * 60 * 1000);
}

export async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

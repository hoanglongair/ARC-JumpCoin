import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookie } from "@/lib/session";

export async function GET() {
  const sessionToken = await getSessionCookie();

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const session = await prisma.gameSession.findUnique({
    where: { sessionToken }
  });

  if (!session || session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, sessionId: session.id });
}

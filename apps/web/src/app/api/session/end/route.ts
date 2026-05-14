import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSessionCookie } from "@/lib/session";

export async function POST() {
  const sessionToken = await getSessionCookie();

  if (sessionToken) {
    await prisma.gameSession.updateMany({
      where: { sessionToken, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() }
    });
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}

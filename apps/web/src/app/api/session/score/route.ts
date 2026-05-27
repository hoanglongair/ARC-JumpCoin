import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionToken = await getSessionCookie();
    if (!sessionToken) {
      return NextResponse.json({ ok: false, error: "No active game session." }, { status: 401 });
    }

    const body = (await request.json()) as { score?: unknown };
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0) {
      return NextResponse.json({ ok: false, error: "Invalid score." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findUnique({
        where: { sessionToken },
        include: { user: true }
      });

      if (!session || session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
        throw new Error("Game session is not active.");
      }

      const displayName = session.user.displayName ?? compactWallet(session.walletAddress);
      const entry = await tx.leaderboardEntry.create({
        data: {
          walletAddress: session.walletAddress,
          displayName,
          score,
          sessionId: session.id
        }
      });

      await tx.gameSession.update({
        where: { id: session.id },
        data: { status: "ENDED", endedAt: new Date() }
      });

      return entry;
    });

    await clearSessionCookie();
    return NextResponse.json({ ok: true, entry: result });
  } catch (caught) {
    if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Score was already submitted for this session." }, { status: 409 });
    }

    const error = caught instanceof Error ? caught.message : "Failed to save score.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}

function compactWallet(walletAddress: string) {
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

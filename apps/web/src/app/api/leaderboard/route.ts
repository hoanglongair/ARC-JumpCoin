import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LeaderboardEntryRow = {
  id: string;
  walletAddress: string;
  displayName: string;
  score: number;
  createdAt: Date;
};

export async function GET() {
  const entries = await prisma.$queryRaw<LeaderboardEntryRow[]>`
    SELECT *
    FROM (
      SELECT DISTINCT ON ("walletAddress")
        "id",
        "walletAddress",
        "displayName",
        "score",
        "createdAt"
      FROM "LeaderboardEntry"
      ORDER BY "walletAddress", "score" DESC, "createdAt" ASC
    ) AS best_scores
    ORDER BY "score" DESC, "createdAt" ASC
    LIMIT 10
  `;

  return NextResponse.json({ ok: true, entries });
}

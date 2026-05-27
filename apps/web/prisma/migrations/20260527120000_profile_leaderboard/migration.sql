ALTER TABLE "User" ADD COLUMN "displayName" TEXT;

CREATE TABLE "LeaderboardEntry" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "sessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaderboardEntry_sessionId_key" ON "LeaderboardEntry"("sessionId");
CREATE INDEX "LeaderboardEntry_score_idx" ON "LeaderboardEntry"("score");
CREATE INDEX "LeaderboardEntry_walletAddress_idx" ON "LeaderboardEntry"("walletAddress");
CREATE INDEX "LeaderboardEntry_createdAt_idx" ON "LeaderboardEntry"("createdAt");

ALTER TABLE "LeaderboardEntry"
  ADD CONSTRAINT "LeaderboardEntry_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeaderboardEntry"
  ADD CONSTRAINT "LeaderboardEntry_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

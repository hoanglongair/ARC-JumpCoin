CREATE TYPE "PaymentStatus" AS ENUM ('VERIFIED', 'REJECTED');
CREATE TYPE "GameSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "txHash" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "paymentContract" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameSession" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "status" "GameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
CREATE UNIQUE INDEX "Payment_txHash_key" ON "Payment"("txHash");
CREATE INDEX "Payment_walletAddress_idx" ON "Payment"("walletAddress");
CREATE UNIQUE INDEX "GameSession_sessionToken_key" ON "GameSession"("sessionToken");
CREATE UNIQUE INDEX "GameSession_paymentId_key" ON "GameSession"("paymentId");
CREATE INDEX "GameSession_walletAddress_idx" ON "GameSession"("walletAddress");
CREATE INDEX "GameSession_expiresAt_idx" ON "GameSession"("expiresAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

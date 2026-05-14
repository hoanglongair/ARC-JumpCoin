import { NextResponse } from "next/server";
import { getAddress, isHash, type Hash } from "viem";
import { Prisma } from "@prisma/client";
import { appConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionExpiry, setSessionCookie } from "@/lib/session";
import { verifyPaymentOnchain } from "@/lib/verify-payment";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { txHash?: string; walletAddress?: string };

    if (!body.txHash || !isHash(body.txHash)) {
      return NextResponse.json({ ok: false, error: "Invalid txHash." }, { status: 400 });
    }

    if (!body.walletAddress) {
      return NextResponse.json({ ok: false, error: "Missing walletAddress." }, { status: 400 });
    }

    const walletAddress = getAddress(body.walletAddress);
    const verified = await verifyPaymentOnchain(body.txHash as Hash, walletAddress);
    const sessionToken = createSessionToken();
    const expiresAt = sessionExpiry();

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { walletAddress },
        update: {},
        create: { walletAddress }
      });

      const payment = await tx.payment.create({
        data: {
          txHash: verified.txHash,
          walletAddress,
          chainId: appConfig.chainId,
          tokenAddress: appConfig.tokenAddress,
          paymentContract: appConfig.paymentContractAddress,
          amount: verified.amount.toString(),
          status: "VERIFIED",
          verifiedAt: new Date()
        }
      });

      const session = await tx.gameSession.create({
        data: {
          sessionToken,
          walletAddress,
          paymentId: payment.id,
          expiresAt
        }
      });

      return { payment, session };
    });

    await setSessionCookie(sessionToken, expiresAt);

    return NextResponse.json({
      ok: true,
      sessionToken,
      sessionId: result.session.id
    });
  } catch (caught) {
    if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Transaction was already used." }, { status: 409 });
    }

    const error = caught instanceof Error ? caught.message : "Payment verification failed.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}

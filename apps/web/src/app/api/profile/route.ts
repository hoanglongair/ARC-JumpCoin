import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { prisma } from "@/lib/prisma";

function validateDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Display name is required.");
  }

  const displayName = value.trim();
  if (displayName.length < 2 || displayName.length > 20) {
    throw new Error("Display name must be between 2 and 20 characters.");
  }

  return displayName;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddressParam = searchParams.get("walletAddress");

  if (!walletAddressParam) {
    return NextResponse.json({ ok: false, error: "Missing walletAddress." }, { status: 400 });
  }

  const walletAddress = getAddress(walletAddressParam);
  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: { walletAddress: true, displayName: true }
  });

  return NextResponse.json({
    ok: true,
    profile: user ?? { walletAddress, displayName: null }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string; displayName?: string };

    if (!body.walletAddress) {
      return NextResponse.json({ ok: false, error: "Missing walletAddress." }, { status: 400 });
    }

    const walletAddress = getAddress(body.walletAddress);
    const displayName = validateDisplayName(body.displayName);

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { displayName },
      create: { walletAddress, displayName },
      select: { walletAddress: true, displayName: true }
    });

    return NextResponse.json({ ok: true, profile: user });
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : "Failed to save profile.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}

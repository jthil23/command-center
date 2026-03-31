import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = searchParams.get("app");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 100);

    const where = app ? { app } : {};

    const runs = await prisma.huntRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch hunt history" },
      { status: 500 }
    );
  }
}

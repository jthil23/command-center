import { NextRequest, NextResponse } from "next/server";
import { getHuntStatus, runHunt } from "@/lib/hunt/engine";
import type { SupportedApp } from "@/lib/hunt/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apps: SupportedApp[] = ["sonarr", "radarr"];
    const statuses = [];

    for (const app of apps) {
      try {
        statuses.push(await getHuntStatus(app));
      } catch {
        // App not configured, skip
      }
    }

    return NextResponse.json({ status: statuses });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch hunt status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { app: string; runType?: string };
    const { app, runType = "missing" } = body;

    if (!app || !["sonarr", "radarr"].includes(app)) {
      return NextResponse.json(
        { error: "Invalid app. Must be sonarr or radarr" },
        { status: 400 }
      );
    }

    const result = await runHunt(
      app as SupportedApp,
      runType as "missing" | "upgrade"
    );

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start hunt" },
      { status: 500 }
    );
  }
}

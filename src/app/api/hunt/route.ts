import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { HuntEngine } from "@/lib/hunt/engine";
import { HuntScanner } from "@/lib/hunt/scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getConfig();
    const apps = ["sonarr", "radarr", "bazarr", "whisparr"] as const;

    const status = await Promise.all(
      apps
        .filter((app) => config.hunt[app]?.enabled !== false && config.services[app])
        .map(async (app) => {
          const lastRun = await prisma.huntRun.findFirst({
            where: { app },
            orderBy: { startedAt: "desc" },
          });

          const activeItems = await prisma.huntState.count({
            where: { app, expiresAt: { gt: new Date() } },
          });

          return {
            app,
            enabled: true,
            lastRun: lastRun
              ? {
                  id: lastRun.id,
                  status: lastRun.status,
                  itemsSearched: lastRun.itemsSearched,
                  itemsFound: lastRun.itemsFound,
                  errors: lastRun.errors,
                  duration: lastRun.duration,
                  startedAt: lastRun.startedAt,
                  completedAt: lastRun.completedAt,
                }
              : null,
            activeItems,
          };
        })
    );

    return NextResponse.json({ status });
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

    if (!app) {
      return NextResponse.json(
        { error: "Missing required field: app" },
        { status: 400 }
      );
    }

    const config = getConfig();
    const service = config.services[app];

    if (!service) {
      return NextResponse.json(
        { error: `Unknown service: ${app}` },
        { status: 400 }
      );
    }

    const engine = new HuntEngine(config);
    const scanner = new HuntScanner(config);

    const result = await engine.run(app, scanner, runType as "missing" | "upgrade");

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to start hunt" },
      { status: 500 }
    );
  }
}

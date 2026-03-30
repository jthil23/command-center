import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = searchParams.get("app");

    if (!app) {
      return NextResponse.json(
        { error: "Missing required query parameter: app" },
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

    switch (app) {
      case "sonarr": {
        const client = new SonarrClient(service.url, service.apiKey!);
        const missing = await client.getMissing();
        return NextResponse.json({ app, items: missing });
      }
      case "radarr": {
        const client = new RadarrClient(service.url, service.apiKey!);
        const missing = await client.getMissing();
        return NextResponse.json({ app, items: missing });
      }
      default:
        return NextResponse.json(
          { error: `Missing items not supported for: ${app}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch missing items" },
      { status: 500 }
    );
  }
}

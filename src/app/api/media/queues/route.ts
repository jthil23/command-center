import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { SeerrClient } from "@/lib/arr/seerr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getConfig();

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    const tasks: Promise<void>[] = [];

    if (config.services.sonarr) {
      const client = new SonarrClient(
        config.services.sonarr.url,
        config.services.sonarr.apiKey!
      );
      tasks.push(
        client
          .getQueue()
          .then((q) => {
            results.sonarr = q;
          })
          .catch((e) => {
            errors.sonarr = String(e);
          })
      );
    }

    if (config.services.radarr) {
      const client = new RadarrClient(
        config.services.radarr.url,
        config.services.radarr.apiKey!
      );
      tasks.push(
        client
          .getQueue()
          .then((q) => {
            results.radarr = q;
          })
          .catch((e) => {
            errors.radarr = String(e);
          })
      );
    }

    if (config.services.seerr) {
      const client = new SeerrClient(
        config.services.seerr.url,
        config.services.seerr.apiKey!
      );
      tasks.push(
        client
          .getPendingRequests()
          .then((r) => {
            results.seerr = r;
          })
          .catch((e) => {
            errors.seerr = String(e);
          })
      );
    }

    await Promise.all(tasks);

    return NextResponse.json({ queues: results, errors });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}

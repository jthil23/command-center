import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { SeerrClient } from "@/lib/arr/seerr";

type TriggerAction =
  | "rssSync"
  | "searchMissing"
  | "approveRequest"
  | "denyRequest";

interface TriggerBody {
  app: string;
  action: TriggerAction;
  requestId?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TriggerBody;
    const { app, action, requestId } = body;

    if (!app || !action) {
      return NextResponse.json(
        { error: "Missing required fields: app, action" },
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
        if (action === "rssSync") {
          await client.rssSync();
        } else if (action === "searchMissing") {
          await client.searchAllMissing();
        } else {
          return NextResponse.json(
            { error: `Unsupported action for sonarr: ${action}` },
            { status: 400 }
          );
        }
        break;
      }
      case "radarr": {
        const client = new RadarrClient(service.url, service.apiKey!);
        if (action === "rssSync") {
          await client.rssSync();
        } else if (action === "searchMissing") {
          await client.searchAllMissing();
        } else {
          return NextResponse.json(
            { error: `Unsupported action for radarr: ${action}` },
            { status: 400 }
          );
        }
        break;
      }
      case "seerr": {
        const client = new SeerrClient(service.url, service.apiKey!);
        if (action === "approveRequest") {
          if (requestId == null) {
            return NextResponse.json(
              { error: "requestId is required for approveRequest" },
              { status: 400 }
            );
          }
          await client.approveRequest(requestId);
        } else if (action === "denyRequest") {
          if (requestId == null) {
            return NextResponse.json(
              { error: "requestId is required for denyRequest" },
              { status: 400 }
            );
          }
          await client.denyRequest(requestId);
        } else {
          return NextResponse.json(
            { error: `Unsupported action for seerr: ${action}` },
            { status: 400 }
          );
        }
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unsupported app: ${app}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, app, action });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute trigger" },
      { status: 500 }
    );
  }
}

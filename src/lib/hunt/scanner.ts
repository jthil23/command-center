import { SonarrClient } from "@/lib/arr/sonarr";
import { RadarrClient } from "@/lib/arr/radarr";
import { getConfig } from "@/lib/config";
import type { MissingItem } from "@/lib/arr/common";

export type SupportedApp = "sonarr" | "radarr";

export function createAppClient(app: SupportedApp): SonarrClient | RadarrClient {
  const config = getConfig();
  const svc = config.services[app];
  if (!svc?.url || !svc?.apiKey) {
    throw new Error(`${app} is not configured (missing url or apiKey)`);
  }

  switch (app) {
    case "sonarr":
      return new SonarrClient(svc.url, svc.apiKey);
    case "radarr":
      return new RadarrClient(svc.url, svc.apiKey);
  }
}

export async function scanMissing(app: SupportedApp): Promise<MissingItem[]> {
  const client = createAppClient(app);
  return client.getMissing();
}

export async function scanCutoffUnmet(app: SupportedApp): Promise<MissingItem[]> {
  const client = createAppClient(app);
  return client.getCutoffUnmet();
}

export async function triggerSearch(app: SupportedApp, itemIds: number[]): Promise<void> {
  const client = createAppClient(app);
  if (app === "sonarr") {
    const sonarr = client as SonarrClient;
    await sonarr.searchEpisodes(itemIds);
  } else {
    const radarr = client as RadarrClient;
    await radarr.searchMovies(itemIds);
  }
}

export async function getQueueDepth(app: SupportedApp): Promise<number> {
  const client = createAppClient(app);
  const queue = await client.getQueue();
  return queue.totalRecords;
}

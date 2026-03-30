import { ArrClient } from "./client";
import type { ArrQueueResponse, SonarrEpisode, SonarrSeries, MissingItem } from "./common";

export class SonarrClient {
  private client: ArrClient;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new ArrClient(baseUrl, apiKey);
  }

  async getQueue(): Promise<ArrQueueResponse> {
    return this.client.get("/api/v3/queue", {
      pageSize: "50",
      includeUnknownSeriesItems: "true",
    });
  }

  async getMissing(): Promise<MissingItem[]> {
    const series = await this.client.get<SonarrSeries[]>("/api/v3/series");
    const missing: MissingItem[] = [];

    for (const s of series) {
      if (!s.monitored) continue;
      const episodes = await this.client.get<SonarrEpisode[]>("/api/v3/episode", {
        seriesId: String(s.id),
      });

      for (const ep of episodes) {
        if (!ep.monitored || ep.hasFile) continue;
        // Skip future episodes
        if (ep.airDateUtc && new Date(ep.airDateUtc) > new Date()) continue;

        missing.push({
          id: ep.id,
          appId: `sonarr-${ep.id}`,
          title: s.title,
          subtitle: `S${String(ep.seasonNumber).padStart(2, "0")}E${String(ep.episodeNumber).padStart(2, "0")} - ${ep.title}`,
          monitored: ep.monitored,
          airDate: ep.airDateUtc,
        });
      }
    }

    return missing;
  }

  async getCutoffUnmet(): Promise<MissingItem[]> {
    const response = await this.client.get<{ records: Array<{ id: number; series: { title: string }; seasonNumber: number; episodeNumber: number; title: string }> }>(
      "/api/v3/wanted/cutoff",
      { pageSize: "100" }
    );

    return response.records.map((r) => ({
      id: r.id,
      appId: `sonarr-cutoff-${r.id}`,
      title: r.series.title,
      subtitle: `S${String(r.seasonNumber).padStart(2, "0")}E${String(r.episodeNumber).padStart(2, "0")} - ${r.title}`,
      monitored: true,
    }));
  }

  async rssSync(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "RssSync" });
  }

  async searchEpisodes(episodeIds: number[]): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "EpisodeSearch",
      episodeIds,
    });
  }

  async searchSeason(seriesId: number, seasonNumber: number): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "SeasonSearch",
      seriesId,
      seasonNumber,
    });
  }

  async searchAllMissing(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "MissingEpisodeSearch" });
  }
}

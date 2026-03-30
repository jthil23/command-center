import { ArrClient } from "./client";
import type { ArrQueueResponse, RadarrMovie, MissingItem } from "./common";

export class RadarrClient {
  private client: ArrClient;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new ArrClient(baseUrl, apiKey);
  }

  async getQueue(): Promise<ArrQueueResponse> {
    return this.client.get("/api/v3/queue", { pageSize: "50" });
  }

  async getMissing(): Promise<MissingItem[]> {
    const movies = await this.client.get<RadarrMovie[]>("/api/v3/movie");

    return movies
      .filter((m) => m.monitored && !m.hasFile)
      .filter((m) => {
        // Skip movies not yet released
        const releaseDate = m.digitalRelease ?? m.physicalRelease ?? m.inCinemas;
        if (releaseDate && new Date(releaseDate) > new Date()) return false;
        return true;
      })
      .map((m) => ({
        id: m.id,
        appId: `radarr-${m.id}`,
        title: m.title,
        year: m.year,
        monitored: m.monitored,
      }));
  }

  async getCutoffUnmet(): Promise<MissingItem[]> {
    const response = await this.client.get<{ records: RadarrMovie[] }>(
      "/api/v3/wanted/cutoff",
      { pageSize: "100" }
    );

    return response.records.map((m) => ({
      id: m.id,
      appId: `radarr-cutoff-${m.id}`,
      title: m.title,
      year: m.year,
      monitored: m.monitored,
    }));
  }

  async rssSync(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "RssSync" });
  }

  async searchMovies(movieIds: number[]): Promise<void> {
    await this.client.post("/api/v3/command", {
      name: "MoviesSearch",
      movieIds,
    });
  }

  async searchAllMissing(): Promise<void> {
    await this.client.post("/api/v3/command", { name: "MissingMoviesSearch" });
  }
}

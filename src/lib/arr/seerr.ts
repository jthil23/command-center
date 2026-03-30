import type { SeerrRequest } from "./common";

export class SeerrClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  async getPendingRequests(): Promise<SeerrRequest[]> {
    const data = await this.fetch<{ results: SeerrRequest[] }>(
      "/api/v1/request?take=50&filter=pending&sort=added"
    );
    return data.results;
  }

  async approveRequest(requestId: number): Promise<void> {
    await this.fetch(`/api/v1/request/${requestId}/approve`, {
      method: "POST",
    });
  }

  async denyRequest(requestId: number): Promise<void> {
    await this.fetch(`/api/v1/request/${requestId}/decline`, {
      method: "POST",
    });
  }
}

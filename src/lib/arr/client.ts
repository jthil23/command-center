export class ArrClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private timeoutMs: number = 30000
  ) {}

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": this.apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${url.pathname}`);
    }

    return res.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${url.pathname}`);
    }

    return res.json() as Promise<T>;
  }
}

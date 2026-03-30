import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArrClient } from "@/lib/arr/client";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ArrClient", () => {
  let client: ArrClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ArrClient("http://localhost:8989", "test-api-key");
  });

  it("makes GET requests with API key header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: "4.0" }),
    });

    const result = await client.get("/api/v3/system/status");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8989/api/v3/system/status",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Api-Key": "test-api-key" }),
      })
    );
    expect(result).toEqual({ version: "4.0" });
  });

  it("makes POST requests with JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const result = await client.post("/api/v3/command", { name: "RssSync" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8989/api/v3/command",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "RssSync" }),
      })
    );
    expect(result).toEqual({ success: true });
  });

  it("throws on non-OK responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(client.get("/api/v3/system/status")).rejects.toThrow("401");
  });

  it("respects timeout", async () => {
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => _resolve({ ok: true, json: () => ({}) }), 10000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(init.signal!.reason ?? new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const fastClient = new ArrClient("http://localhost:8989", "key", 100);
    await expect(fastClient.get("/test")).rejects.toThrow();
  });
});

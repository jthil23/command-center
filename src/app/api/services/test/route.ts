import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, apiKey, token } = await request.json();

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["X-Api-Key"] = apiKey;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Most *arr apps respond to /api/v3/system/status or /api/v1/system/status
    // Try common health endpoints
    const endpoints = [
      `${url}/api/v3/system/status`,
      `${url}/api/v1/system/status`,
      `${url}/api/v1/health`,
      `${url}/system/status`,
      url,
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, status: res.status });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { success: false, error: "Could not connect to service" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { listContainers, getContainerLogs } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const containersParam = url.searchParams.get("containers");
    const tail = parseInt(url.searchParams.get("tail") ?? "200", 10);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";

    if (!containersParam) {
      return NextResponse.json({ logs: [] });
    }

    const requestedNames = containersParam.split(",").filter(Boolean);

    // Resolve names to IDs
    const allContainers = await listContainers();
    const matched = allContainers.filter((c) =>
      requestedNames.includes(c.name)
    );

    const results = await Promise.all(
      matched.map(async (c) => {
        try {
          const raw = await getContainerLogs(c.id, tail);
          const lines = raw
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => `[${c.name}] ${line}`);
          return lines;
        } catch {
          return [`[${c.name}] Failed to fetch logs`];
        }
      })
    );

    let combined = results.flat();

    if (search) {
      combined = combined.filter((line) =>
        line.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ logs: combined });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

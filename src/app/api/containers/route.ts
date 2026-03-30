import { NextResponse } from "next/server";
import { listContainers, getContainerStats } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [containers, stats] = await Promise.all([
      listContainers(),
      getContainerStats(),
    ]);

    const enriched = containers.map((c) => {
      const s = stats.get(c.name);
      return {
        ...c,
        cpu: s?.cpu ?? 0,
        memory: s?.memory ?? { used: 0, limit: 0 },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list containers" },
      { status: 500 }
    );
  }
}

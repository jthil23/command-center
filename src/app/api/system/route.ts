import { NextResponse } from "next/server";
import { getSystemInfo, getNetworkInfo } from "@/lib/system/unraid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [system, network] = await Promise.all([
      getSystemInfo(),
      getNetworkInfo(),
    ]);

    return NextResponse.json({ system, network });
  } catch (error) {
    // SSH unavailable — return fallback with empty data
    return NextResponse.json(
      {
        system: {
          hostname: "SOL",
          uptime: "unavailable",
          kernel: "unavailable",
          cpuModel: "unavailable",
          totalRam: "unavailable",
          usedRam: "unavailable",
        },
        network: [],
        error: "SSH connection unavailable",
      },
      { status: 200 }
    );
  }
}

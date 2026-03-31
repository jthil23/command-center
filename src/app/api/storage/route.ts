import { NextResponse } from "next/server";
import {
  getDiskArray,
  getShareUsage,
  getParityStatus,
  triggerParityCheck,
  type DiskInfo,
  type ShareUsage,
  type ParityStatus,
} from "@/lib/system/unraid";

export const dynamic = "force-dynamic";

export interface StorageData {
  disks: DiskInfo[];
  shares: ShareUsage[];
  parity: ParityStatus;
  error?: string;
}

export async function GET() {
  try {
    const [disks, shares, parity] = await Promise.all([
      getDiskArray(),
      getShareUsage(),
      getParityStatus(),
    ]);

    return NextResponse.json({ disks, shares, parity } satisfies StorageData);
  } catch {
    // SSH unavailable — return empty data with error flag
    return NextResponse.json({
      disks: [],
      shares: [],
      parity: { running: false, progress: "0%", speed: "N/A", errors: "0" },
      error: "Unable to connect to server via SSH",
    } satisfies StorageData);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "parityCheck") {
      await triggerParityCheck();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 }
    );
  }
}

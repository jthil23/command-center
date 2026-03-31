import { NextResponse } from "next/server";
import { rebootServer, shutdownServer } from "@/lib/system/unraid";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as "reboot" | "shutdown";

    if (!["reboot", "shutdown"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reboot") {
      await rebootServer();
    } else {
      await shutdownServer();
    }

    await prisma.activityLog.create({
      data: {
        source: "system",
        type: action,
        message: `Server ${action} initiated`,
        metadata: JSON.stringify({ action }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform system action" },
      { status: 500 }
    );
  }
}

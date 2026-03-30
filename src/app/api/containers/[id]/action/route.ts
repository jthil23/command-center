import { NextResponse } from "next/server";
import { containerAction } from "@/lib/docker";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as "start" | "stop" | "restart";

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await containerAction(id, action);

    // Log the activity
    await prisma.activityLog.create({
      data: {
        source: "containers",
        type: action,
        message: `Container ${id.slice(0, 12)} ${action}ed`,
        metadata: JSON.stringify({ containerId: id, action }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to perform action` },
      { status: 500 }
    );
  }
}

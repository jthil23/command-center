import { NextResponse } from "next/server";
import { getContainerLogs } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const tail = parseInt(url.searchParams.get("tail") ?? "200", 10);
    const logs = await getContainerLogs(id, tail);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

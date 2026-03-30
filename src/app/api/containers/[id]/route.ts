import { NextResponse } from "next/server";
import { getContainer } from "@/lib/docker";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = await getContainer(id);
    return NextResponse.json(container);
  } catch (error) {
    return NextResponse.json(
      { error: "Container not found" },
      { status: 404 }
    );
  }
}

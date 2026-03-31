import { NextResponse } from "next/server";
import { NodeRedClient } from "@/lib/automation/nodered";
import { HomeAssistantClient } from "@/lib/automation/homeassistant";

export const dynamic = "force-dynamic";

export async function GET() {
  const [flows, automations] = await Promise.allSettled([
    new NodeRedClient().getFlows().then(async (flows) => {
      const client = new NodeRedClient();
      return Promise.all(
        flows.map(async (f) => {
          try {
            const status = await client.getFlowStatus(f.id);
            return { ...f, state: status.state };
          } catch {
            return { ...f, state: f.disabled ? "disabled" : "unknown" };
          }
        })
      );
    }),
    new HomeAssistantClient().getAutomations(),
  ]);

  return NextResponse.json({
    flows: flows.status === "fulfilled" ? flows.value : [],
    automations: automations.status === "fulfilled" ? automations.value : [],
    errors: {
      nodered: flows.status === "rejected" ? flows.reason?.message : null,
      ha: automations.status === "rejected" ? automations.reason?.message : null,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source, id } = body as { source: string; id: string };

    if (!source || !id) {
      return NextResponse.json(
        { error: "source and id are required" },
        { status: 400 }
      );
    }

    if (source === "nodered") {
      await new NodeRedClient().triggerFlow(id);
    } else if (source === "ha") {
      await new HomeAssistantClient().triggerAutomation(id);
    } else {
      return NextResponse.json(
        { error: `Unknown source: ${source}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trigger failed" },
      { status: 500 }
    );
  }
}

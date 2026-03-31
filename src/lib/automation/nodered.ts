import { getConfig } from "@/lib/config";

interface NodeRedFlow {
  id: string;
  label: string;
  type: string;
  disabled: boolean;
}

interface NodeRedFlowStatus {
  state: string;
}

export class NodeRedClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? getConfig().services.nodered?.url ?? "";
  }

  async getFlows(): Promise<NodeRedFlow[]> {
    const res = await fetch(`${this.baseUrl}/flows`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Node-RED /flows responded ${res.status}`);
    }

    const raw: Array<Record<string, unknown>> = await res.json();

    return raw
      .filter((n) => n.type === "tab")
      .map((flow) => ({
        id: flow.id as string,
        label: (flow.label as string) ?? "",
        type: flow.type as string,
        disabled: (flow.disabled as boolean) ?? false,
      }));
  }

  async triggerFlow(flowId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/inject/${flowId}`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Node-RED inject responded ${res.status}`);
    }
  }

  async getFlowStatus(flowId: string): Promise<NodeRedFlowStatus> {
    const res = await fetch(`${this.baseUrl}/flow/${flowId}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Node-RED flow status responded ${res.status}`);
    }

    const data = await res.json();
    return { state: (data.disabled as boolean) ? "disabled" : "enabled" };
  }
}

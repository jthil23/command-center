import { getConfig } from "@/lib/config";

interface HAAutomation {
  entityId: string;
  name: string;
  state: string;
  lastTriggered: string | null;
}

interface HAEntityState {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged: string;
  lastUpdated: string;
}

export class HomeAssistantClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    const cfg = getConfig().services.homeassistant;
    this.baseUrl = baseUrl ?? cfg?.url ?? "";
    this.token = token ?? cfg?.token ?? "";
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async getAutomations(): Promise<HAAutomation[]> {
    const res = await fetch(`${this.baseUrl}/api/states`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`HA /api/states responded ${res.status}`);
    }

    const states: Array<Record<string, unknown>> = await res.json();

    return states
      .filter(
        (s) =>
          typeof s.entity_id === "string" &&
          (s.entity_id as string).startsWith("automation.")
      )
      .map((s) => {
        const attrs = (s.attributes ?? {}) as Record<string, unknown>;
        return {
          entityId: s.entity_id as string,
          name: (attrs.friendly_name as string) ?? (s.entity_id as string),
          state: s.state as string,
          lastTriggered: (attrs.last_triggered as string) ?? null,
        };
      });
  }

  async triggerAutomation(entityId: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/services/automation/trigger`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ entity_id: entityId }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      throw new Error(`HA automation/trigger responded ${res.status}`);
    }
  }

  async getEntityState(entityId: string): Promise<HAEntityState> {
    const res = await fetch(
      `${this.baseUrl}/api/states/${encodeURIComponent(entityId)}`,
      {
        headers: this.headers(),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      throw new Error(`HA /api/states/${entityId} responded ${res.status}`);
    }

    const data = await res.json();
    return {
      entityId: data.entity_id as string,
      state: data.state as string,
      attributes: (data.attributes ?? {}) as Record<string, unknown>,
      lastChanged: data.last_changed as string,
      lastUpdated: data.last_updated as string,
    };
  }
}

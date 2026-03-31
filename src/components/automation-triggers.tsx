"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, RefreshCw, Loader2 } from "lucide-react";

interface NodeRedFlow {
  id: string;
  label: string;
  type: string;
  disabled: boolean;
  state: string;
}

interface HAAutomation {
  entityId: string;
  name: string;
  state: string;
  lastTriggered: string | null;
}

interface TriggersData {
  flows: NodeRedFlow[];
  automations: HAAutomation[];
  errors: { nodered: string | null; ha: string | null };
}

export function AutomationTriggers() {
  const [data, setData] = useState<TriggersData>({
    flows: [],
    automations: [],
    errors: { nodered: null, ha: null },
  });
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const fetchTriggers = useCallback(async () => {
    try {
      const res = await fetch("/api/automations/triggers");
      const json: TriggersData = await res.json();
      setData(json);
    } catch {
      // Keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTriggers();
    const interval = setInterval(fetchTriggers, 30_000);
    return () => clearInterval(interval);
  }, [fetchTriggers]);

  async function handleTrigger(source: "nodered" | "ha", id: string) {
    setTriggeringId(id);
    try {
      await fetch("/api/automations/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id }),
      });
      // Brief delay then refresh to show updated state
      setTimeout(fetchTriggers, 1000);
    } catch {
      // ignore
    } finally {
      setTriggeringId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Node-RED Flows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Node-RED Flows</h3>
          <Button variant="ghost" size="icon" onClick={fetchTriggers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {data.errors.nodered ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Could not connect to Node-RED: {data.errors.nodered}
            </CardContent>
          </Card>
        ) : data.flows.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              No Node-RED flows found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.flows.map((flow) => (
              <Card key={flow.id} size="sm">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="truncate">{flow.label || flow.id}</CardTitle>
                  <Badge
                    variant={
                      flow.state === "enabled" ? "default" : "secondary"
                    }
                  >
                    {flow.state}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={triggeringId === flow.id || flow.disabled}
                    onClick={() => handleTrigger("nodered", flow.id)}
                  >
                    {triggeringId === flow.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Trigger
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Home Assistant Automations */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Home Assistant Automations</h3>
        {data.errors.ha ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Could not connect to Home Assistant: {data.errors.ha}
            </CardContent>
          </Card>
        ) : data.automations.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              No Home Assistant automations found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.automations.map((auto) => (
              <Card key={auto.entityId} size="sm">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="truncate">{auto.name}</CardTitle>
                  <Badge
                    variant={auto.state === "on" ? "default" : "secondary"}
                  >
                    {auto.state}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {auto.lastTriggered && (
                    <p className="text-xs text-muted-foreground">
                      Last triggered:{" "}
                      {new Date(auto.lastTriggered).toLocaleString()}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={triggeringId === auto.entityId}
                    onClick={() => handleTrigger("ha", auto.entityId)}
                  >
                    {triggeringId === auto.entityId ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Trigger
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

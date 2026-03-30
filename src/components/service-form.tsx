"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";

interface ServiceConfig {
  url: string;
  apiKey?: string;
  token?: string;
}

interface ServiceFormProps {
  name: string;
  config: ServiceConfig;
}

export function ServiceForm({ name, config }: ServiceFormProps) {
  const [status, setStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const icon = getServiceIcon(name);

  async function testConnection() {
    setStatus("testing");
    try {
      const res = await fetch("/api/services/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon ? (
            <Image src={icon} alt="" width={24} height={24} />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold">
              {getServiceInitial(name)}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold capitalize">{name}</div>
            <div className="text-xs text-muted-foreground">{config.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {status === "error" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={status === "testing"}
          >
            {status === "testing" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Test
          </Button>
        </div>
      </div>
    </Card>
  );
}

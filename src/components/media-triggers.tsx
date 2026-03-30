"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { RefreshCw, Search, ArrowUpCircle, Loader2 } from "lucide-react";

interface TriggerAction {
  action: string;
  label: string;
  icon: React.ReactNode;
}

const APP_TRIGGERS: { app: string; actions: TriggerAction[] }[] = [
  {
    app: "sonarr",
    actions: [
      { action: "rss-sync", label: "RSS Sync", icon: <RefreshCw className="h-3.5 w-3.5" /> },
      { action: "search-missing", label: "Search All Missing", icon: <Search className="h-3.5 w-3.5" /> },
      { action: "search-cutoff", label: "Search Cutoff Unmet", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
    ],
  },
  {
    app: "radarr",
    actions: [
      { action: "rss-sync", label: "RSS Sync", icon: <RefreshCw className="h-3.5 w-3.5" /> },
      { action: "search-missing", label: "Search All Missing", icon: <Search className="h-3.5 w-3.5" /> },
      { action: "search-cutoff", label: "Search Cutoff Unmet", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
    ],
  },
];

export function MediaTriggers() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function handleTrigger(app: string, action: string) {
    const key = `${app}-${action}`;
    setLoadingKey(key);
    try {
      await fetch("/api/media/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, action }),
      });
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {APP_TRIGGERS.map(({ app, actions }) => {
        const icon = getServiceIcon(app);
        return (
          <Card key={app} className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {icon ? (
                  <Image src={icon} alt="" width={20} height={20} />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                    {getServiceInitial(app)}
                  </div>
                )}
                <span className="capitalize">{app}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {actions.map(({ action, label, icon: actionIcon }) => {
                  const key = `${app}-${action}`;
                  const isLoading = loadingKey === key;
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      disabled={loadingKey !== null}
                      onClick={() => handleTrigger(app, action)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        actionIcon
                      )}
                      {label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

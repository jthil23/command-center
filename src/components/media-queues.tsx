"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServiceIcon, getServiceInitial } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface QueueItem {
  id: number;
  title: string;
  status: string;
  size: number;
  sizeleft: number;
}

interface SeerrRequest {
  id: number;
  title: string;
  user: string;
  status: string;
}

interface AppQueue {
  app: string;
  items: QueueItem[];
  seerrRequests?: SeerrRequest[];
}

const REFRESH_INTERVAL = 30_000;

export function MediaQueues() {
  const [queues, setQueues] = useState<AppQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await fetch("/api/media/queues");
      if (res.ok) {
        const data = await res.json();
        setQueues(data);
      }
    } catch {
      // silently fail, will retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  async function handleSeerrAction(requestId: number, action: "approve" | "deny") {
    setActionLoading(`${requestId}-${action}`);
    try {
      await fetch("/api/media/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      await fetchQueues();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading queues...
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No queue data available.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {queues.map((q) => {
        const icon = getServiceIcon(q.app);
        return (
          <Card key={q.app} className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {icon ? (
                  <Image src={icon} alt="" width={20} height={20} />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                    {getServiceInitial(q.app)}
                  </div>
                )}
                <span className="capitalize">{q.app}</span>
                <Badge variant="secondary" className="ml-auto">
                  {q.items.length} in queue
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {q.items.length === 0 && !q.seerrRequests?.length && (
                <p className="text-xs text-muted-foreground">Queue is empty.</p>
              )}

              {q.items.map((item) => {
                const progress =
                  item.size > 0
                    ? Math.round(((item.size - item.sizeleft) / item.size) * 100)
                    : 0;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          progress === 100
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {q.seerrRequests && q.seerrRequests.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    Pending Requests
                    <Badge variant="outline" className="text-[10px]">
                      {q.seerrRequests.length}
                    </Badge>
                  </div>
                  {q.seerrRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {req.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          by {req.user}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Approve"
                          disabled={actionLoading !== null}
                          onClick={() => handleSeerrAction(req.id, "approve")}
                        >
                          {actionLoading === `${req.id}-approve` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Deny"
                          disabled={actionLoading !== null}
                          onClick={() => handleSeerrAction(req.id, "deny")}
                        >
                          {actionLoading === `${req.id}-deny` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

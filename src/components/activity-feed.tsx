import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityEntry } from "@/types";

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

const TYPE_INDICATORS: Record<string, { icon: string; color: string }> = {
  start: { icon: "▲", color: "text-emerald-500" },
  stop: { icon: "▼", color: "text-red-500" },
  restart: { icon: "↻", color: "text-blue-500" },
  error: { icon: "✖", color: "text-red-500" },
  warning: { icon: "⚠", color: "text-amber-500" },
  info: { icon: "●", color: "text-violet-500" },
  grab: { icon: "▲", color: "text-emerald-500" },
  transcode: { icon: "◆", color: "text-blue-500" },
};

export function ActivityFeed({ entries }: ActivityFeedProps) {
  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="mb-3 text-sm font-semibold">Activity Feed</div>
      <ScrollArea className="h-[280px]">
        <div className="space-y-1.5 text-sm">
          {entries.length === 0 && (
            <div className="text-muted-foreground">No recent activity</div>
          )}
          {entries.map((entry) => {
            const indicator = TYPE_INDICATORS[entry.type] ?? TYPE_INDICATORS.info;
            return (
              <div key={entry.id} className="flex items-start gap-2">
                <span className={indicator.color}>{indicator.icon}</span>
                <span className="text-muted-foreground">{entry.message}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: "green" | "blue" | "purple" | "yellow";
}

const COLOR_MAP = {
  green: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-violet-500",
  yellow: "text-amber-500",
} as const;

export function StatCard({ title, value, subtitle, color }: StatCardProps) {
  return (
    <Card className="border-border/40 bg-card/50 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className={cn("my-1 text-3xl font-bold", COLOR_MAP[color])}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </Card>
  );
}

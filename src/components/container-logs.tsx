"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Download, RefreshCw } from "lucide-react";

interface ContainerLogsProps {
  containerId: string;
}

export function ContainerLogs({ containerId }: ContainerLogsProps) {
  const [logs, setLogs] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/containers/${containerId}/logs?tail=500`);
      const data = await res.json();
      setLogs(data.logs ?? "");
    } catch {
      setLogs("Failed to fetch logs");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [containerId]);

  const lines = logs.split("\n").filter((line) => {
    if (!filter) return true;
    return line.toLowerCase().includes(filter.toLowerCase());
  });

  function handleDownload() {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${containerId.slice(0, 12)}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button variant="outline" size="icon" onClick={handleDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[500px] rounded-md border border-border/40 bg-black/50 p-3">
        <pre className="text-xs leading-relaxed text-muted-foreground">
          {lines.map((line, i) => (
            <div key={i} className="hover:bg-white/5">
              {line}
            </div>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
}

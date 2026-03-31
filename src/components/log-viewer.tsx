"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  RefreshCw,
  X,
} from "lucide-react";

interface ContainerInfo {
  id: string;
  name: string;
  state: string;
}

// Stable color palette for container name badges
const CONTAINER_COLORS = [
  "text-blue-400",
  "text-green-400",
  "text-yellow-400",
  "text-purple-400",
  "text-pink-400",
  "text-cyan-400",
  "text-orange-400",
  "text-red-400",
  "text-emerald-400",
  "text-indigo-400",
  "text-rose-400",
  "text-teal-400",
] as const;

function getContainerColor(name: string, allNames: string[]): string {
  const idx = allNames.indexOf(name);
  return CONTAINER_COLORS[idx % CONTAINER_COLORS.length];
}

function extractContainerName(line: string): string | null {
  const match = line.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

export function LogViewer() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [tail, setTail] = useState("500");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Fetch container list
  useEffect(() => {
    async function loadContainers() {
      try {
        const res = await fetch("/api/containers");
        const data: ContainerInfo[] = await res.json();
        setContainers(data);
      } catch {
        // silently fail, containers list will be empty
      }
    }
    loadContainers();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (selectedContainers.length === 0) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        containers: selectedContainers.join(","),
        tail,
      });
      if (search) {
        params.set("search", search);
      }
      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch {
      setLogs(["Failed to fetch logs"]);
    }
    setLoading(false);
  }, [selectedContainers, tail, search]);

  // Fetch logs when selection/tail changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 10000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchLogs]);

  // Scroll to bottom on new logs
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function toggleContainer(name: string) {
    setSelectedContainers((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  }

  function selectAll() {
    setSelectedContainers(containers.map((c) => c.name));
  }

  function clearSelection() {
    setSelectedContainers([]);
  }

  function handleDownload() {
    const text = logs.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allSelectedNames = selectedContainers.slice().sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Container Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Container selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Containers</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {containers.map((c) => {
              const isSelected = selectedContainers.includes(c.name);
              return (
                <Badge
                  key={c.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleContainer(c.name)}
                >
                  <span
                    className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                      c.state === "running" ? "bg-green-500" : "bg-gray-500"
                    }`}
                  />
                  {c.name}
                  {isSelected && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tail size */}
          <Select value={tail} onValueChange={(val) => { if (val) setTail(val); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 lines</SelectItem>
              <SelectItem value="200">200 lines</SelectItem>
              <SelectItem value="500">500 lines</SelectItem>
              <SelectItem value="1000">1000 lines</SelectItem>
            </SelectContent>
          </Select>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh
            </Label>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>

          {/* Download */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            title="Download logs"
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Log output */}
        <ScrollArea className="h-[600px] rounded-md border border-border/40 bg-black/50 p-3">
          <pre className="text-xs leading-relaxed font-mono">
            {logs.length === 0 ? (
              <span className="text-muted-foreground">
                {selectedContainers.length === 0
                  ? "Select one or more containers to view logs."
                  : "No logs found."}
              </span>
            ) : (
              logs.map((line, i) => {
                const containerName = extractContainerName(line);
                const colorClass = containerName
                  ? getContainerColor(containerName, allSelectedNames)
                  : "text-muted-foreground";
                return (
                  <div key={i} className="hover:bg-white/5">
                    {containerName ? (
                      <>
                        <span className={colorClass}>
                          [{containerName}]
                        </span>
                        <span className="text-muted-foreground">
                          {line.slice(containerName.length + 2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{line}</span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={scrollEndRef} />
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

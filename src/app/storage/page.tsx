"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StorageOverview } from "@/components/storage-overview";
import { DiskArray } from "@/components/disk-array";
import type { DiskInfo, ParityStatus } from "@/lib/system/unraid";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorageData {
  disks: DiskInfo[];
  shares: { name: string; size: string; used: string; free: string; mountPoint: string }[];
  parity: ParityStatus;
  error?: string;
}

export default function StoragePage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/storage");
      const json: StorageData = await res.json();
      setData(json);
    } catch {
      setData({
        disks: [],
        shares: [],
        parity: { running: false, progress: "0%", speed: "N/A", errors: "0" },
        error: "Failed to fetch storage data",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Storage</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <StorageOverview
            disks={data.disks}
            parity={data.parity}
            error={data.error}
          />
          <DiskArray disks={data.disks} />
        </>
      ) : null}
    </div>
  );
}

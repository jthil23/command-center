"use client";

import { useEffect, useState } from "react";
import { SystemInfo } from "@/components/system-info";
import { SystemActions } from "@/components/system-actions";
import type { SystemInfo as SystemInfoType, NetworkInterface } from "@/lib/system/unraid";

interface SystemData {
  system: SystemInfoType;
  network: NetworkInterface[];
  error?: string;
}

export default function SystemPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSystem() {
      try {
        const res = await fetch("/api/system");
        if (!res.ok) throw new Error("Failed to fetch system info");
        const json: SystemData = await res.json();
        setData(json);
        if (json.error) setFetchError(json.error);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchSystem();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System</h1>

      {fetchError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading system information...</div>
      ) : data ? (
        <>
          <SystemInfo system={data.system} network={data.network} />
          <div>
            <h2 className="mb-3 text-lg font-semibold">Server Management</h2>
            <SystemActions />
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">
          Unable to load system information.
        </div>
      )}
    </div>
  );
}

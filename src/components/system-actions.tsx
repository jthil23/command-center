"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ActionType = "reboot" | "shutdown";

export function SystemActions() {
  const [loading, setLoading] = useState<ActionType | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [rebootOpen, setRebootOpen] = useState(false);
  const [shutdownOpen, setShutdownOpen] = useState(false);

  async function handleAction(action: ActionType) {
    setLoading(action);
    setResult(null);

    if (action === "reboot") setRebootOpen(false);
    else setShutdownOpen(false);

    try {
      const res = await fetch("/api/system/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }

      setResult({ type: "success", message: `Server ${action} initiated successfully.` });
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {/* Reboot Dialog */}
        <Dialog open={rebootOpen} onOpenChange={setRebootOpen}>
          <DialogTrigger
            render={<Button variant="destructive" disabled={loading !== null} />}
          >
            {loading === "reboot" ? "Rebooting..." : "Reboot Server"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Reboot</DialogTitle>
              <DialogDescription>
                Are you sure? This will reboot SOL. All running containers and
                services will be temporarily unavailable.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRebootOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleAction("reboot")}>
                Reboot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shutdown Dialog */}
        <Dialog open={shutdownOpen} onOpenChange={setShutdownOpen}>
          <DialogTrigger
            render={<Button variant="destructive" disabled={loading !== null} />}
          >
            {loading === "shutdown" ? "Shutting down..." : "Shutdown Server"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Shutdown</DialogTitle>
              <DialogDescription>
                Are you sure? This will shut down SOL. The server will need to be
                physically powered back on.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShutdownOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleAction("shutdown")}>
                Shutdown
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Feedback */}
      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}

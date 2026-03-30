import { getConfig } from "@/lib/config";
import { ServiceForm } from "@/components/service-form";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  let config;
  try {
    config = getConfig();
  } catch {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          No config.yaml found. Copy config.example.yaml to config.yaml and
          fill in your service details.
        </div>
      </div>
    );
  }

  const services = Object.entries(config.services);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Service Connections</h2>
        <div className="grid grid-cols-2 gap-3">
          {services.map(([name, svc]) => (
            <ServiceForm key={name} name={name} config={svc} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Polling</h2>
        <div className="text-sm text-muted-foreground">
          Default interval: {config.polling.defaultIntervalSeconds}s (configured
          in config.yaml)
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Hunt Engine Defaults</h2>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Batch Size</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.batchSize}
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Interval</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.intervalMinutes} min
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Hourly Cap</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.hourlyCap}
            </div>
          </div>
          <div className="rounded-md border border-border/40 bg-card/50 p-3">
            <div className="text-xs text-muted-foreground">Queue Threshold</div>
            <div className="mt-1 font-medium">
              {config.hunt.defaults.queueThreshold}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

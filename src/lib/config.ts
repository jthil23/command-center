import { parse } from "yaml";
import { readFileSync } from "fs";
import type { AppConfig } from "@/types";

const HUNT_DEFAULTS = {
  batchSize: 10,
  intervalMinutes: 60,
  hourlyCap: 50,
  queueThreshold: 25,
} as const;

const POLLING_DEFAULTS = {
  defaultIntervalSeconds: 30,
} as const;

export function parseConfig(yamlContent: string): AppConfig {
  const raw = parse(yamlContent);

  return {
    services: raw.services ?? {},
    ssh: raw.ssh,
    hunt: {
      defaults: { ...HUNT_DEFAULTS, ...raw.hunt?.defaults },
      sonarr: raw.hunt?.sonarr,
      radarr: raw.hunt?.radarr,
      bazarr: raw.hunt?.bazarr,
      whisparr: raw.hunt?.whisparr,
    },
    polling: { ...POLLING_DEFAULTS, ...raw.polling },
  };
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = process.env.CONFIG_PATH ?? "/app/config.yaml";
  const content = readFileSync(configPath, "utf-8");
  cachedConfig = parseConfig(content);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

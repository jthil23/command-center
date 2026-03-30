export interface ServiceConfig {
  url: string;
  apiKey?: string;
  token?: string;
}

export interface SshConfig {
  host: string;
  user: string;
  keyPath: string;
}

export interface HuntAppConfig {
  enabled?: boolean;
  batchSize?: number;
  intervalMinutes?: number;
  hourlyCap?: number;
  queueThreshold?: number;
  searchMode?: "seasonPack" | "individual";
}

export interface HuntConfig {
  defaults: Required<Pick<HuntAppConfig, "batchSize" | "intervalMinutes" | "hourlyCap" | "queueThreshold">>;
  sonarr?: HuntAppConfig;
  radarr?: HuntAppConfig;
  bazarr?: HuntAppConfig;
  whisparr?: HuntAppConfig;
}

export interface PollingConfig {
  defaultIntervalSeconds: number;
}

export interface AppConfig {
  services: Record<string, ServiceConfig>;
  ssh: SshConfig;
  hunt: HuntConfig;
  polling: PollingConfig;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: "running" | "exited" | "paused" | "restarting" | "dead" | "created";
  status: string;
  uptime: string;
  cpu: number;
  memory: { used: number; limit: number; percent: number };
  ports: Array<{ host: number; container: number; protocol: string }>;
}

export interface SystemStats {
  cpu: { percent: number; cores: number; model: string };
  memory: { used: number; total: number; percent: number };
  storage: { used: number; total: number; percent: number };
  gpu?: { utilization: number; vram: { used: number; total: number }; temperature: number; power: number };
  containers: { total: number; running: number; stopped: number };
}

export interface ActivityEntry {
  id: number;
  source: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

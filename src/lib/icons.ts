// Maps container/service names to their icon filenames in /icons/
// Icons sourced from dashboard-icons (https://github.com/walkxcode/dashboard-icons)
const ICON_MAP: Record<string, string> = {
  plex: "plex",
  sonarr: "sonarr",
  radarr: "radarr",
  bazarr: "bazarr",
  prowlarr: "prowlarr",
  whisparr: "whisparr",
  seerr: "overseerr",
  nzbget: "nzbget",
  tdarr: "tdarr",
  stash: "stash",
  "home-assistant": "home-assistant",
  homeassistant: "home-assistant",
  "node-red": "node-red",
  nodered: "node-red",
  mosquitto: "mosquitto",
  "zigbee2mqtt": "zigbee2mqtt",
  ollama: "ollama",
  nextcloud: "nextcloud",
  immich: "immich",
  vaultwarden: "vaultwarden",
  "nginx-proxy-manager": "nginx-proxy-manager",
  adguard: "adguard-home",
  grafana: "grafana",
  prometheus: "prometheus",
  mariadb: "mariadb",
  postgresql: "postgresql",
  postgres: "postgresql",
  redis: "redis",
  notifiarr: "notifiarr",
};

export function getServiceIcon(name: string): string {
  const normalized = name.toLowerCase().replace(/[_\s]/g, "-");
  const icon = ICON_MAP[normalized];
  if (icon) return `/icons/${icon}.svg`;
  return "";
}

export function getServiceInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

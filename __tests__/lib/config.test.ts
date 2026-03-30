import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseConfig } from "@/lib/config";

const validYaml = `
services:
  sonarr:
    url: http://192.168.1.103:8989
    apiKey: test-key-sonarr
  radarr:
    url: http://192.168.1.103:7878
    apiKey: test-key-radarr
  prometheus:
    url: http://192.168.1.103:9090

ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519

hunt:
  defaults:
    batchSize: 10
    intervalMinutes: 60
    hourlyCap: 50
    queueThreshold: 25

polling:
  defaultIntervalSeconds: 30
`;

describe("parseConfig", () => {
  it("parses valid YAML config", () => {
    const config = parseConfig(validYaml);
    expect(config.services.sonarr?.url).toBe("http://192.168.1.103:8989");
    expect(config.services.sonarr?.apiKey).toBe("test-key-sonarr");
    expect(config.services.prometheus?.url).toBe("http://192.168.1.103:9090");
    expect(config.ssh.host).toBe("192.168.1.103");
    expect(config.hunt.defaults.batchSize).toBe(10);
    expect(config.polling.defaultIntervalSeconds).toBe(30);
  });

  it("provides defaults for missing optional fields", () => {
    const minimal = `
services: {}
ssh:
  host: 192.168.1.103
  user: root
  keyPath: /app/ssh/id_ed25519
`;
    const config = parseConfig(minimal);
    expect(config.hunt.defaults.batchSize).toBe(10);
    expect(config.hunt.defaults.intervalMinutes).toBe(60);
    expect(config.hunt.defaults.hourlyCap).toBe(50);
    expect(config.hunt.defaults.queueThreshold).toBe(25);
    expect(config.polling.defaultIntervalSeconds).toBe(30);
  });

  it("throws on invalid YAML", () => {
    expect(() => parseConfig("not: [valid: yaml: {")).toThrow();
  });
});

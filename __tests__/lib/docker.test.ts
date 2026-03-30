import { describe, it, expect, vi, beforeEach } from "vitest";
import type Docker from "dockerode";

// Mock dockerode since we can't connect to a real Docker socket in CI
vi.mock("dockerode", () => {
  const mockContainer = {
    inspect: vi.fn().mockResolvedValue({
      Id: "abc123",
      Name: "/plex",
      Config: { Image: "plexinc/pms-docker:latest" },
      State: { Status: "running", StartedAt: "2026-03-29T00:00:00Z" },
      NetworkSettings: { Ports: { "32400/tcp": [{ HostPort: "32400" }] } },
    }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    logs: vi.fn().mockResolvedValue(Buffer.from("log line 1\nlog line 2\n")),
  };

  return {
    default: vi.fn().mockImplementation(function () {
      return {
        listContainers: vi.fn().mockResolvedValue([
          {
            Id: "abc123",
            Names: ["/plex"],
            Image: "plexinc/pms-docker:latest",
            State: "running",
            Status: "Up 2 days",
          },
          {
            Id: "def456",
            Names: ["/sonarr"],
            Image: "linuxserver/sonarr:latest",
            State: "running",
            Status: "Up 1 day",
          },
        ]),
        getContainer: vi.fn().mockReturnValue(mockContainer),
      };
    }),
  };
});

import {
  listContainers,
  getContainer,
  containerAction,
  getContainerLogs,
} from "@/lib/docker";

describe("docker wrapper", () => {
  it("lists all containers", async () => {
    const containers = await listContainers();
    expect(containers).toHaveLength(2);
    expect(containers[0].name).toBe("plex");
    expect(containers[0].state).toBe("running");
    expect(containers[1].name).toBe("sonarr");
  });

  it("gets container detail", async () => {
    const container = await getContainer("abc123");
    expect(container.name).toBe("plex");
    expect(container.image).toBe("plexinc/pms-docker:latest");
    expect(container.state).toBe("running");
  });

  it("performs container actions", async () => {
    await expect(containerAction("abc123", "restart")).resolves.not.toThrow();
    await expect(containerAction("abc123", "stop")).resolves.not.toThrow();
    await expect(containerAction("abc123", "start")).resolves.not.toThrow();
  });

  it("fetches container logs", async () => {
    const logs = await getContainerLogs("abc123", 100);
    expect(logs).toContain("log line 1");
  });
});

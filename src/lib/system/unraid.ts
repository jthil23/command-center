import { execSSH } from "./ssh";

export interface SystemInfo {
  hostname: string;
  uptime: string;
  kernel: string;
  cpuModel: string;
  totalRam: string;
  usedRam: string;
}

export interface DiskInfo {
  name: string;
  size: string;
  used: string;
  free: string;
  temp: string;
  status: string;
  type: string;
}

export interface ShareUsage {
  name: string;
  size: string;
  used: string;
  free: string;
  mountPoint: string;
}

export interface ParityStatus {
  running: boolean;
  progress: string;
  speed: string;
  errors: string;
}

export interface NetworkInterface {
  interface: string;
  ip: string;
  mac: string;
  speed: string;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const [hostname, uptime, kernel, cpuModel, memInfo] = await Promise.all([
    execSSH("hostname"),
    execSSH("uptime -p"),
    execSSH("uname -r"),
    execSSH("grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2"),
    execSSH("free -h | grep Mem"),
  ]);

  const memParts = memInfo.split(/\s+/);

  return {
    hostname,
    uptime,
    kernel,
    cpuModel: cpuModel.trim(),
    totalRam: memParts[1] ?? "unknown",
    usedRam: memParts[2] ?? "unknown",
  };
}

export async function getDiskArray(): Promise<DiskInfo[]> {
  const output = await execSSH(
    "df -h /mnt/disk* /mnt/cache 2>/dev/null | tail -n +2"
  );

  const disks: DiskInfo[] = [];

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 6) continue;

    const mountPoint = parts[5];
    const name = mountPoint.split("/").pop() ?? mountPoint;

    // Determine disk type from mount point
    const type = mountPoint.includes("cache") ? "cache" : "data";

    // Try to read temperature via smartctl
    let temp = "N/A";
    try {
      const device = await execSSH(
        `ls /dev/disk/by-path/ -la 2>/dev/null | grep -m1 "${name}" | awk '{print $NF}' | xargs basename 2>/dev/null`
      );
      if (device) {
        const tempOut = await execSSH(
          `smartctl -A /dev/${device} 2>/dev/null | grep -i temperature | head -1 | awk '{print $(NF-0)}'`
        );
        if (tempOut) temp = `${tempOut}°C`;
      }
    } catch {
      // Temperature reading is best-effort
    }

    disks.push({
      name,
      size: parts[1],
      used: parts[2],
      free: parts[3],
      temp,
      status: "active",
      type,
    });
  }

  return disks;
}

export async function getShareUsage(): Promise<ShareUsage[]> {
  const output = await execSSH("df -h /mnt/user/* 2>/dev/null | tail -n +2");

  const shares: ShareUsage[] = [];

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 6) continue;

    const mountPoint = parts[5];
    const name = mountPoint.split("/").pop() ?? mountPoint;

    shares.push({
      name,
      size: parts[1],
      used: parts[2],
      free: parts[3],
      mountPoint,
    });
  }

  return shares;
}

export async function getParityStatus(): Promise<ParityStatus> {
  try {
    const output = await execSSH("mdcmd status 2>/dev/null || cat /proc/mdcmd 2>/dev/null");

    const running =
      output.includes("mdResyncPos") && !output.includes("mdResyncPos=0");

    let progress = "0%";
    let speed = "N/A";
    let errors = "0";

    const posMatch = output.match(/mdResyncPos=(\d+)/);
    const sizeMatch = output.match(/mdResyncSize=(\d+)/);
    if (posMatch && sizeMatch) {
      const pos = parseInt(posMatch[1], 10);
      const size = parseInt(sizeMatch[1], 10);
      if (size > 0) {
        progress = `${((pos / size) * 100).toFixed(1)}%`;
      }
    }

    const speedMatch = output.match(/mdResyncDt=(\d+)/);
    const dbMatch = output.match(/mdResyncDb=(\d+)/);
    if (speedMatch && dbMatch) {
      const dt = parseInt(speedMatch[1], 10);
      const db = parseInt(dbMatch[1], 10);
      if (dt > 0) {
        const mbPerSec = (db / dt / 1024).toFixed(1);
        speed = `${mbPerSec} MB/s`;
      }
    }

    const errMatch = output.match(/mdResyncCorr=(\d+)/);
    if (errMatch) errors = errMatch[1];

    return { running, progress, speed, errors };
  } catch {
    return { running: false, progress: "0%", speed: "N/A", errors: "0" };
  }
}

export async function triggerParityCheck(): Promise<void> {
  await execSSH("mdcmd check");
}

export async function rebootServer(): Promise<void> {
  await execSSH("reboot");
}

export async function shutdownServer(): Promise<void> {
  await execSSH("poweroff");
}

export async function getNetworkInfo(): Promise<NetworkInterface[]> {
  const output = await execSSH(
    "ip -o addr show scope global | awk '{print $2, $4}'"
  );

  const interfaces: NetworkInterface[] = [];

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const [iface, ipCidr] = line.split(/\s+/);
    if (!iface || !ipCidr) continue;

    const ip = ipCidr.split("/")[0];

    let mac = "N/A";
    try {
      mac = await execSSH(`cat /sys/class/net/${iface}/address`);
    } catch {
      // MAC reading is best-effort
    }

    let speed = "N/A";
    try {
      const speedOut = await execSSH(
        `ethtool ${iface} 2>/dev/null | grep Speed | awk '{print $2}'`
      );
      if (speedOut) speed = speedOut;
    } catch {
      // Speed reading is best-effort
    }

    interfaces.push({ interface: iface, ip, mac, speed });
  }

  return interfaces;
}

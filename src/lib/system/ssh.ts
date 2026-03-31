import { Client } from "ssh2";
import { getConfig } from "@/lib/config";
import { readFileSync } from "fs";

export async function execSSH(command: string): Promise<string> {
  const config = getConfig();
  const { host, user, keyPath } = config.ssh;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let stdout = "";
          let stderr = "";
          stream
            .on("data", (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString();
            });
          stream.on("close", () => {
            conn.end();
            if (stderr && !stdout) reject(new Error(stderr));
            else resolve(stdout.trim());
          });
        });
      })
      .on("error", reject)
      .connect({
        host,
        username: user,
        privateKey: readFileSync(keyPath),
      });
  });
}

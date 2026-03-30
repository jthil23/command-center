import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(__dirname),
    resolveAlias: {
      "../../generated/prisma/client": "./generated/prisma/client.ts",
    },
  },
};

export default nextConfig;

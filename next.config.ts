import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
      ],
    },
  ],
};

export default async function createNextConfig(): Promise<NextConfig> {
  if (process.env.NODE_ENV === "development" && process.env.USE_D1 === "true") {
    await setupDevPlatform();
  }

  return nextConfig;
}

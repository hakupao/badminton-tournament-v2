import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_NAME = "shuttle-arena-demo";
const DEPLOY_BRANCH = process.env.DEMO_DEPLOY_BRANCH || "master";
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, ".vercel", "output", "static");

if (!existsSync(outputDir)) {
  console.error("Missing Cloudflare Pages build output:", outputDir);
  console.error("Run `npm run build:cf` before deploying the demo.");
  process.exit(1);
}

function run(args, cwd) {
  const result = spawnSync(npxBin, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), `${PROJECT_NAME}-`));

try {
  // Reuse the saved project config so demo bindings and vars stay consistent.
  run(["wrangler", "pages", "download", "config", PROJECT_NAME, "--force"], tempDir);
  run(
    [
      "wrangler",
      "pages",
      "deploy",
      outputDir,
      "--project-name",
      PROJECT_NAME,
      "--branch",
      DEPLOY_BRANCH,
    ],
    tempDir
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

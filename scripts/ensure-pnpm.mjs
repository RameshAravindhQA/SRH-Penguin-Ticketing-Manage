import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  const fullPath = path.join(root, lockfile);
  if (fs.existsSync(fullPath)) fs.rmSync(fullPath);
}

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

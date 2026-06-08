import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");

const defaults = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/penguin",
  POSTGRES_ADMIN_URL: "postgresql://postgres:postgres@localhost:5432/postgres",
  BACKEND_PORT: "6001",
  FRONTEND_PORT: "6002",
  BASE_PATH: "/",
  VITE_API_BASE_URL: "http://localhost:6001",
};

export function loadLocalEnv() {
  const env = { ...defaults, ...process.env };

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) env[key] = value;
    }
  }

  env.PORT = env.PORT ?? env.BACKEND_PORT;
  env.NODE_ENV = env.NODE_ENV ?? "development";
  return env;
}

export { root };

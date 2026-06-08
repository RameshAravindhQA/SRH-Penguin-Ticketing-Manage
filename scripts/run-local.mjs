import { spawn } from "node:child_process";
import { loadLocalEnv, root } from "./env-local.mjs";

const target = process.argv[2];
const baseEnv = loadLocalEnv();

const commands = {
  backend: {
    args: ["--filter", "@workspace/api-server", "run", "dev"],
    env: { ...baseEnv, PORT: baseEnv.BACKEND_PORT },
  },
  frontend: {
    args: ["--filter", "@workspace/enterprise-app", "run", "dev"],
    env: { ...baseEnv, PORT: baseEnv.FRONTEND_PORT },
  },
  "db-push": {
    args: ["--filter", "@workspace/db", "run", "push"],
    env: baseEnv,
  },
  "db-seed": {
    args: ["--filter", "@workspace/scripts", "run", "seed"],
    env: baseEnv,
  },
};

const command = commands[target];

if (!command) {
  console.error("Usage: node ./scripts/run-local.mjs <backend|frontend|db-push|db-seed>");
  process.exit(1);
}

const executable = process.platform === "win32" ? "cmd.exe" : "pnpm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "pnpm", ...command.args]
  : command.args;

const child = spawn(executable, args, {
  cwd: root,
  env: command.env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));

import { spawn } from "node:child_process";
import { loadLocalEnv, root } from "./env-local.mjs";

const baseEnv = loadLocalEnv();
const executable = process.platform === "win32" ? "cmd.exe" : "pnpm";

const processes = [
  {
    name: "backend",
    args: ["--filter", "@workspace/api-server", "run", "dev"],
    env: { ...baseEnv, PORT: baseEnv.BACKEND_PORT },
  },
  {
    name: "frontend",
    args: ["--filter", "@workspace/enterprise-app", "run", "dev"],
    env: { ...baseEnv, PORT: baseEnv.FRONTEND_PORT },
  },
];

const children = processes.map((processConfig) => {
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", ...processConfig.args]
    : processConfig.args;

  const child = spawn(executable, args, {
    cwd: root,
    env: processConfig.env,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code) {
      console.error(`${processConfig.name} exited with code ${code}`);
      for (const running of children) running.kill();
      process.exit(code);
    }
  });

  return child;
});

process.on("SIGINT", () => {
  for (const child of children) child.kill();
  process.exit(0);
});

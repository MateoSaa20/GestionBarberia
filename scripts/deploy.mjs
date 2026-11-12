import { access, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const projectDir = process.cwd();
const envPath = path.join(projectDir, ".env");
const backupPath = path.join(projectDir, ".env.deploy-backup");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function restoreEnv() {
  if (await exists(backupPath)) {
    await rename(backupPath, envPath);
  }
}

let moved = false;

async function cleanupAndExit(code) {
  if (moved) {
    await restoreEnv().catch(() => undefined);
    moved = false;
  }
  process.exit(code);
}

process.on("SIGINT", () => void cleanupAndExit(130));
process.on("SIGTERM", () => void cleanupAndExit(143));

try {
  if (await exists(envPath)) {
    await rename(envPath, backupPath);
    moved = true;
    console.info(
      "[deploy] .env local oculto durante el deploy para no incluirlo en la función.",
    );
  }

  const args = process.argv.slice(2);
  const deployArgs =
    args.length > 0 ? args : ["--prod", "--build", "--skip-functions-cache"];

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "netlify", "deploy", ...deployArgs],
    { cwd: projectDir, stdio: "inherit" },
  );

  const code = await new Promise((resolve) => {
    child.on("error", () => resolve(1));
    child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  });

  await cleanupAndExit(code);
} catch (error) {
  console.error("[deploy] Error:", error);
  await cleanupAndExit(1);
}

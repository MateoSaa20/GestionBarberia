import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const standaloneDir = path.join(process.cwd(), ".next", "standalone");

try {
  const entries = await readdir(standaloneDir);

  await Promise.all(
    entries
      .filter((entry) => entry === ".env" || entry.startsWith(".env."))
      .map((entry) => rm(path.join(standaloneDir, entry), { force: true })),
  );
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

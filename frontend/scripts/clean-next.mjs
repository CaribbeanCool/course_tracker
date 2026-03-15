import path from "node:path";
import fs from "node:fs/promises";

const targetDir = path.join(process.cwd(), ".next");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rmWithRetries(dir, { retries = 12, delayMs = 200 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error?.code;
      const shouldRetry =
        code === "EBUSY" ||
        code === "EPERM" ||
        code === "ENOTEMPTY" ||
        code === "EACCES";

      if (!shouldRetry || attempt === retries) {
        throw error;
      }

      await sleep(delayMs);
    }
  }
}

try {
  await rmWithRetries(targetDir);
} catch (error) {
  console.error(`Failed to remove ${targetDir}`);
  console.error(error);
  process.exit(1);
}

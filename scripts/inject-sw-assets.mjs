import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const distDirectory = join(scriptDirectory, "..", "dist");
const serviceWorkerPath = join(distDirectory, "sw.js");
const marker = "/*__BUILD_ASSETS__*/ []";

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

const assets = (await listFiles(distDirectory))
  .map((file) => relative(distDirectory, file).replaceAll("\\", "/"))
  .filter((file) => file !== "sw.js")
  .sort();
const source = await readFile(serviceWorkerPath, "utf8");
if (!source.includes(marker)) {
  throw new Error("Service worker asset marker was not found.");
}
await writeFile(serviceWorkerPath, source.replace(marker, JSON.stringify(assets, null, 2)));
console.log(`Injected ${assets.length} offline assets into dist/sw.js`);

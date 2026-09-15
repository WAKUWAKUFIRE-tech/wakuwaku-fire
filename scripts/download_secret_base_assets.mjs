import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, "content", "community", "benefits", "assets.json"), "utf8"));
const targetDirs = [path.join(root, "community", "secret-base", "private-assets")];
try {
  await fs.access(path.join(root, "dist"));
  targetDirs.push(path.join(root, "dist", "community", "secret-base", "private-assets"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await Promise.all(targetDirs.map((targetDir) => fs.mkdir(targetDir, { recursive: true })));

for (const asset of manifest) {
  const response = await fetch(asset.url, { headers: { "user-agent": "wakuwaku-fire-secret-base-import/1.0" } });
  if (!response.ok) throw new Error(`${asset.file}: ${response.status} ${response.statusText}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Promise.all(targetDirs.map((targetDir) => fs.writeFile(path.join(targetDir, asset.file), bytes)));
  console.log(`${asset.file} ${bytes.byteLength}`);
}

console.log(`画像を取り込みました: ${manifest.length}件`);

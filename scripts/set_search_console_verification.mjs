import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = path.join(ROOT, "index.html");
const SLOT = "<!-- GOOGLE_SITE_VERIFICATION_SLOT -->";

const value = String(process.env.GOOGLE_SITE_VERIFICATION || "").trim();
if (!value) {
  console.error("GOOGLE_SITE_VERIFICATION に、Search Consoleのmetaタグのcontent値を設定してください。");
  process.exitCode = 1;
} else if (!/^[A-Za-z0-9_-]+$/.test(value)) {
  console.error("確認値に使用できない文字が含まれています。Googleから発行されたcontent値だけを指定してください。");
  process.exitCode = 1;
} else {
  const html = await fs.readFile(INDEX_PATH, "utf8");
  const tag = `<meta name="google-site-verification" content="${value}" />`;
  const existingPattern = /\s*<meta\s+name="google-site-verification"\s+content="[^"]*"\s*\/?>/i;
  const updated = existingPattern.test(html)
    ? html.replace(existingPattern, `\n    ${tag}`)
    : html.replace(SLOT, `${SLOT}\n    ${tag}`);
  if (updated === html) {
    console.error(`${SLOT} が index.html に見つかりません。`);
    process.exitCode = 1;
  } else {
    await fs.writeFile(INDEX_PATH, updated, "utf8");
    console.log("Search Consoleの確認タグをトップページへ追加しました。");
  }
}

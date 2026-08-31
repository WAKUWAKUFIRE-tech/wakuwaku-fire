import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(ROOT, "automation", "config.json"), "utf8"));
const siteUrl = (process.env.SITE_URL || config.site_url || "").replace(/\/+$/, "");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function latestPublishedItem(queue) {
  const explicitSlug = argValue("--slug");
  const candidates = queue.items.filter((item) => item.status === "published" && (!explicitSlug || item.slug === explicitSlug));
  return candidates.sort((left, right) => String(right.published_at).localeCompare(String(left.published_at)) || right.priority_order - left.priority_order)[0];
}

async function check(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "wakuwaku-fire-public-verifier/1.0" }
    });
    const html = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!html.includes(`<link rel="canonical" href="${url}"`)) throw new Error("canonicalが対象URLと一致しません");
    const imageUrl = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1];
    if (!imageUrl) throw new Error("og:imageがありません");
    const imageResponse = await fetch(imageUrl, { redirect: "follow", headers: { "User-Agent": "wakuwaku-fire-public-verifier/1.0" } });
    if (!imageResponse.ok) throw new Error(`og:image HTTP ${imageResponse.status}`);
    if (!html.includes("<h1")) throw new Error("h1がありません");
    if (!html.includes("link-card") || !html.includes(config.community_url)) throw new Error("関連リンクカードがありません");
    return { status: response.status, finalUrl: response.url, imageUrl, bytes: Buffer.byteLength(html, "utf8") };
  } finally {
    clearTimeout(timeout);
  }
}

const queue = JSON.parse(await fs.readFile(path.join(ROOT, "SEO_ARTICLE_QUEUE.json"), "utf8"));
const item = latestPublishedItem(queue);
if (!item) {
  console.error("検証対象のpublished記事がありません。");
  process.exitCode = 1;
} else {
  const url = item.published_url || `${siteUrl}/articles/${item.slug}/`;
  const attempts = Number(argValue("--attempts") || 8);
  const waitSeconds = Number(argValue("--wait-seconds") || 15);
  let lastError = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await check(url);
      console.log(JSON.stringify({ verified: true, article_id: item.id, slug: item.slug, url, attempt, ...result }, null, 2));
      process.exitCode = 0;
      break;
    } catch (error) {
      lastError = error.message;
      console.log(`公開URL確認 ${attempt}/${attempts}: ${lastError}`);
      if (attempt < attempts) await sleep(waitSeconds * 1000);
    }
  }
  if (lastError && process.exitCode !== 0) {
    console.error(`公開URL確認に失敗しました: ${url} / ${lastError}`);
    process.exitCode = 1;
  }
}

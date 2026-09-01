import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await fs.readFile(path.join(ROOT, "automation", "config.json"), "utf8"));
const siteUrl = (process.env.SITE_URL || config.site_url || "").replace(/\/+$/, "");
const timeoutMs = 20000;

function fail(message) {
  throw new Error(message);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "wakuwaku-fire-seo-verifier/1.0" }
    });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

function canonicalFromHtml(html) {
  return /<link\s+rel="canonical"\s+href="([^"]+)"/i.exec(html)?.[1] || "";
}

async function checkPublicPage(url) {
  const { response, text } = await fetchText(url);
  if (!response.ok) fail(`${url} がHTTP ${response.status}です。`);
  if (/noindex/i.test(response.headers.get("x-robots-tag") || "")) fail(`${url} がX-Robots-Tagでnoindexです。`);
  if (/name="robots"\s+content="[^"]*noindex/i.test(text)) fail(`${url} がmeta robotsでnoindexです。`);
  const canonical = canonicalFromHtml(text);
  if (canonical !== url) fail(`${url} のcanonicalが一致しません: ${canonical || "未設定"}`);
  if (!/<title>[\s\S]*<\/title>/i.test(text)) fail(`${url} にtitleがありません。`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(text)) fail(`${url} にdescriptionがありません。`);
  return { url, status: response.status, bytes: Buffer.byteLength(text, "utf8") };
}

if (!/^https:\/\//i.test(siteUrl)) fail("SITE_URLがHTTPS URLではありません。");

try {
  const robotsUrl = `${siteUrl}/robots.txt`;
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const robotsResult = await fetchText(robotsUrl);
  if (robotsResult.response.status !== 200) fail(`${robotsUrl} がHTTP ${robotsResult.response.status}です。`);
  if (!robotsResult.text.includes(`Sitemap: ${sitemapUrl}`)) fail("robots.txtにsitemap URLがありません。");
  if (/^\s*Disallow:\s*\/\s*$/im.test(robotsResult.text)) fail("robots.txtがサイト全体を遮断しています。");

  const sitemapResult = await fetchText(sitemapUrl);
  if (sitemapResult.response.status !== 200) fail(`${sitemapUrl} がHTTP ${sitemapResult.response.status}です。`);
  if (!/<urlset[\s>]/i.test(sitemapResult.text)) fail("sitemap.xmlがurlsetとして返っていません。");
  const urls = [...sitemapResult.text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
  if (!urls.includes(`${siteUrl}/`)) fail("sitemap.xmlにトップページがありません。");
  if (!urls.includes(`${siteUrl}/articles/fire-ikura-hitsuyou/`)) fail("sitemap.xmlにFIREいくら必要記事がありません。");
  if (urls.some((url) => /[?#]/.test(url) || /\/404(?:\.html)?\/?$/i.test(url))) fail("sitemap.xmlに一時URL・404 URLが含まれています。");

  const pageResults = [];
  for (const url of [`${siteUrl}/`, `${siteUrl}/articles/fire-ikura-hitsuyou/`, `${siteUrl}/fire-animal-test/`, `${siteUrl}/fire-migration-japan/`, `${siteUrl}/fire-migration-world/`, `${siteUrl}/risk-runner/`]) {
    pageResults.push(await checkPublicPage(url));
  }

  const missingUrl = `${siteUrl}/seo-verification-missing-${Date.now()}/`;
  const missingResult = await fetchText(missingUrl);
  if (missingResult.response.status !== 404) fail(`存在しないURLがHTTP ${missingResult.response.status}です。soft 404の可能性があります。`);

  console.log(JSON.stringify({
    verified: true,
    robots: { url: robotsUrl, status: robotsResult.response.status, contentType: robotsResult.response.headers.get("content-type") || "" },
    sitemap: { url: sitemapUrl, status: sitemapResult.response.status, count: urls.length, contentType: sitemapResult.response.headers.get("content-type") || "" },
    pages: pageResults,
    missingUrl: { url: missingUrl, status: missingResult.response.status }
  }, null, 2));
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "automation", "config.json");
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "automation", "content_sources", "scripts"]);

function normalizeSiteUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlUnescape(value) {
  return String(value || "")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function validDate(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ""));
  return match?.[1] || "";
}

function todayJst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function extract(html, pattern) {
  return new RegExp(pattern, "i").exec(html)?.[1]?.trim() || "";
}

function pagePathFromFile(relativeFile) {
  const normalized = relativeFile.replaceAll("\\", "/");
  if (normalized === "index.html") return "/";
  if (!normalized.endsWith("/index.html")) return "";
  return `/${normalized.slice(0, -"/index.html".length)}/`;
}

function canonicalPath(canonical, siteUrl) {
  try {
    const url = new URL(canonical);
    const site = new URL(`${siteUrl}/`);
    if (url.origin !== site.origin || url.search || url.hash) return "";
    return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  } catch {
    return "";
  }
}

async function listHtmlFiles(directory, relativeDirectory = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const relativePath = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listHtmlFiles(absolutePath, relativePath));
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(relativePath);
    }
  }
  return files;
}

async function readExistingEntries(sitemapPath) {
  try {
    const xml = await fs.readFile(sitemapPath, "utf8");
    const entries = new Map();
    for (const match of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>\s*)?<\/url>/gi)) {
      const loc = xmlUnescape(match[1]);
      const lastmod = validDate(xmlUnescape(match[2] || ""));
      if (loc) entries.set(loc, { loc, lastmod });
    }
    return entries;
  } catch {
    return new Map();
  }
}

async function readQueue(root) {
  try {
    const queue = JSON.parse(await fs.readFile(path.join(root, "SEO_ARTICLE_QUEUE.json"), "utf8"));
    return new Map((Array.isArray(queue.items) ? queue.items : []).map((item) => [String(item.slug || ""), item]));
  } catch {
    return new Map();
  }
}

function articleSlugFromPath(pagePath) {
  return /^\/articles\/([^/]+)\/$/.exec(pagePath)?.[1] || "";
}

function articleDateFromHtml(html) {
  return validDate(
    extract(html, 'property="article:modified_time"\\s+content="([^"]+)') ||
      extract(html, 'property="article:published_time"\\s+content="([^"]+)')
  );
}

function articleMetadataMap(publishedArticles = []) {
  const metadata = new Map();
  for (const article of publishedArticles) {
    const canonical = String(article.canonical || "").trim();
    const date = validDate(article.modifiedIso || article.publishedIso || article.date);
    if (canonical) metadata.set(canonical, date);
  }
  return metadata;
}

function sortEntries(entries, siteUrl, dateByPath) {
  const root = `${siteUrl}/`;
  const articlesIndex = `${siteUrl}/articles/`;
  return [...entries].sort((left, right) => {
    if (left.loc === root) return -1;
    if (right.loc === root) return 1;
    if (left.loc === articlesIndex) return -1;
    if (right.loc === articlesIndex) return 1;
    const leftPath = new URL(left.loc).pathname;
    const rightPath = new URL(right.loc).pathname;
    const leftArticle = leftPath.startsWith("/articles/");
    const rightArticle = rightPath.startsWith("/articles/");
    if (leftArticle && rightArticle) {
      const dateOrder = String(dateByPath.get(rightPath) || "").localeCompare(String(dateByPath.get(leftPath) || ""));
      return dateOrder || leftPath.localeCompare(rightPath);
    }
    if (leftArticle) return -1;
    if (rightArticle) return 1;
    return leftPath.localeCompare(rightPath);
  });
}

export async function generateSitemap({
  root = ROOT,
  siteUrl: configuredSiteUrl = "",
  publishedArticles = [],
  publishedArticleSlugs = [],
  fallbackLastmod = todayJst()
} = {}) {
  const config = JSON.parse(await fs.readFile(path.join(root, "automation", "config.json"), "utf8"));
  const siteUrl = normalizeSiteUrl(configuredSiteUrl || config.site_url);
  if (!siteUrl) throw new Error("sitemapのsite_urlが設定されていません。");

  const existing = await readExistingEntries(path.join(root, "sitemap.xml"));
  const queue = await readQueue(root);
  const transientPublishedSlugs = new Set(publishedArticleSlugs.map((slug) => String(slug)));
  for (const article of publishedArticles) if (article.slug) transientPublishedSlugs.add(String(article.slug));
  const articleDates = articleMetadataMap(publishedArticles);
  const dateByPath = new Map();
  const candidates = new Map();

  for (const relativeFile of await listHtmlFiles(root)) {
    const normalizedRelative = relativeFile.replaceAll("\\", "/");
    const pagePath = pagePathFromFile(normalizedRelative);
    if (!pagePath || normalizedRelative === "404.html") continue;
    const html = await fs.readFile(path.join(root, relativeFile), "utf8");
    const canonical = extract(html, 'rel="canonical"\\s+href="([^"]+)');
    const pathFromCanonical = canonicalPath(canonical, siteUrl);
    if (!pathFromCanonical) continue;
    if (/name="robots"\s+content="[^"]*noindex/i.test(html)) continue;

    const articleSlug = articleSlugFromPath(pathFromCanonical);
    const queueItem = articleSlug ? queue.get(articleSlug) : null;
    if (articleSlug && queueItem && queueItem.status !== "published" && !transientPublishedSlugs.has(articleSlug)) continue;

    const canonicalUrl = `${siteUrl}${pathFromCanonical}`;
    const htmlDate = articleDateFromHtml(html);
    const knownDate = articleDates.get(canonical) || htmlDate || existing.get(canonicalUrl)?.lastmod || fallbackLastmod;
    candidates.set(canonicalUrl, { loc: canonicalUrl, lastmod: validDate(knownDate) || validDate(fallbackLastmod) });
    dateByPath.set(pathFromCanonical, validDate(knownDate) || validDate(fallbackLastmod));
  }

  const entries = sortEntries(candidates.values(), siteUrl, dateByPath);
  const body = entries
    .map((entry) => `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>\n  </url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await fs.writeFile(path.join(root, "sitemap.xml"), xml, "utf8");
  return { count: entries.length, urls: entries.map((entry) => entry.loc) };
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedFile === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await generateSitemap();
    console.log(JSON.stringify({ generated: true, ...result }, null, 2));
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

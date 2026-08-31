import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "automation", "config.json");
const ALLOWED_STATUSES = new Set(["planned", "prepared_review", "stocked", "researching", "drafting", "published", "skipped", "needs_review", "failed"]);
const SOURCE_CORE = [
  "content_sources/CONTENT_WRITING_RULES.md",
  "content_sources/knowledge_base/personal_quotes_and_credo.md",
  "content_sources/knowledge_base/seo_experience_map.md",
  "content_sources/knowledge_base/numbers_and_facts.md",
  "content_sources/knowledge_base/contradictions_and_updates.md",
  "content_sources/note/index.md"
];
const OFFICIAL_DOMAINS = [
  "fsa.go.jp",
  "nta.go.jp",
  "nenkin.go.jp",
  "mhlw.go.jp",
  "moj.go.jp",
  "mlit.go.jp",
  "ideco-koushiki.jp",
  "j-flec.go.jp",
  "flat35.com",
  "gov-online.go.jp"
];

class ArticleNeedsReview extends Error {}
class FatalPublishError extends Error {}

const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
config.site_url = (process.env.SITE_URL || config.site_url || "").replace(/\/+$/, "");
if (!config.site_url) throw new FatalPublishError("site_urlが設定されていません。");
const PUBLIC_STOCK_ONLY = process.env.PUBLIC_STOCK_ONLY === "true";

function abs(relativePath) {
  const normalized = relativePath.replaceAll("/", path.sep);
  const result = path.resolve(ROOT, normalized);
  if (result !== ROOT && !result.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`リポジトリ外のパスです: ${relativePath}`);
  }
  return result;
}

async function exists(relativePath) {
  try {
    await fs.access(abs(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relativePath) {
  return fs.readFile(abs(relativePath), "utf8");
}

async function writeText(relativePath, value) {
  const filename = abs(relativePath);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, value, "utf8");
}

async function removeIfExists(relativePath) {
  if (await exists(relativePath)) await fs.rm(abs(relativePath), { recursive: true, force: true });
}

function normalizeRepoPath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeSitePath(value) {
  let normalized = String(value || "").trim().split(/[?#]/, 1)[0].replaceAll("\\", "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  normalized = path.posix.normalize(normalized);
  if (!normalized.endsWith("/") && !path.posix.basename(normalized).includes(".")) normalized += "/";
  return normalized;
}

async function localSitePathExists(sitePath) {
  const normalized = normalizeSitePath(sitePath);
  const relative = normalized.replace(/^\/+/, "");
  const target = abs(relative);
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) await fs.access(path.join(target, "index.html"));
    return true;
  } catch {
    return false;
  }
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function xmlEscape(value) {
  return htmlEscape(value);
}

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function currentJst() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;
  return { date, time, iso: `${date}T${time}+09:00` };
}

function japaneseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function replaceMarkedSection(html, startMarker, endMarker, content) {
  const pattern = new RegExp(`(${startMarker})[\\s\\S]*?(${endMarker})`);
  if (!pattern.test(html)) throw new Error(`自動更新マーカーが見つかりません: ${startMarker}`);
  return html.replace(pattern, (_, start, end) => `${start}\n${content}\n            ${end}`);
}

function matchGroup(html, pattern, flags = "i") {
  return new RegExp(pattern, flags).exec(html)?.[1] || "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sitePathFromRelative(pagePath, relativeImage) {
  const pageDir = path.posix.dirname(`/${pagePath.replaceAll("\\", "/")}`);
  const joined = path.posix.normalize(path.posix.join(pageDir, relativeImage.replaceAll("\\", "/")));
  return joined.startsWith("/") ? joined : `/${joined}`;
}

function relativeSiteUrl(fromDirectory, sitePath) {
  const from = fromDirectory.replaceAll("\\", "/");
  const target = sitePath.replaceAll("\\", "/");
  let relative = path.posix.relative(from, target);
  if (!relative) relative = ".";
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

function parseFrontmatter(markdown) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(markdown);
  const result = {};
  if (!match) return result;
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

async function readQueue() {
  const data = JSON.parse(await readText(config.paths.queue));
  if (!Array.isArray(data.items)) throw new FatalPublishError("SEO_ARTICLE_QUEUE.json のitemsが配列ではありません。");
  return data;
}

async function saveQueue(queue) {
  queue.updated_at = currentJst().date;
  queue.items.sort((left, right) => left.priority_order - right.priority_order);
  await writeText(config.paths.queue, `${JSON.stringify(queue, null, 2)}\n`);
}

async function listArticleDirectories() {
  const articleRoot = abs("articles");
  const entries = await fs.readdir(articleRoot, { withFileTypes: true });
  const directories = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(articleRoot, entry.name, "index.html");
    try {
      await fs.access(indexPath);
      directories.push(entry.name);
    } catch {
      // Ignore folders that are not article pages.
    }
  }
  return directories;
}

async function readPublishedArticles() {
  const articles = [];
  for (const slug of await listArticleDirectories()) {
    const relativePath = `articles/${slug}/index.html`;
    const html = await readText(relativePath);
    const title = decodeHtml(matchGroup(html, "<h1[^>]*>([\\s\\S]*?)</h1>"));
    const description = decodeHtml(matchGroup(html, '<meta\\s+name="description"\\s+content="([^"]*)"'));
    const publishedIso = matchGroup(html, 'article:published_time"\\s+content="([^"]+)');
    const modifiedIso = matchGroup(html, 'article:modified_time"\\s+content="([^"]+)');
    const heroImage = matchGroup(html, '<figure class="article-page__hero[^>]*>\\s*<img\\s+src="([^"]+)');
    const category = decodeHtml(matchGroup(html, '<div class="article-page__meta">[\\s\\S]*?<span>(.*?)</span>')) || "FIREコラム";
    const canonical = matchGroup(html, '<link\\s+rel="canonical"\\s+href="([^"]+)');
    const contentPreview = stripTags(matchGroup(html, '<div class="article-page__body">([\\s\\S]*?)</article>')).slice(0, 900);
    if (!title || !publishedIso || !canonical) continue;
    const firstNote = (html.match(/https:\/\/note\.com\/wakuwaku_fire\/n\/[a-z0-9]+/gi) || [""])[0];
    articles.push({
      slug,
      title,
      description,
      category,
      publishedIso,
      modifiedIso: modifiedIso || publishedIso,
      date: publishedIso.slice(0, 10),
      image: sitePathFromRelative(relativePath, heroImage),
      canonical,
      noteUrl: firstNote,
      mainKeyword: "",
      contentPreview
    });
  }
  return articles.sort(sortArticles);
}

function sortArticles(left, right) {
  const rightPublished = String(right.publishedIso || `${right.date || ""}T00:00:00+09:00`);
  const leftPublished = String(left.publishedIso || `${left.date || ""}T00:00:00+09:00`);
  const publishedOrder = rightPublished.localeCompare(leftPublished);
  return publishedOrder || String(right.slug).localeCompare(String(left.slug));
}

function articleFromQueueItem(item, date, siteUrl, publishedTime = "18:00:00") {
  const publishedIso = `${date}T${publishedTime}+09:00`;
  return {
    slug: item.slug,
    title: item.generated_title || item.article_title_plan,
    description: item.generated_meta_description || item.article_title_plan,
    category: item.generated_category || "FIREコラム",
    date,
    publishedIso,
    modifiedIso: publishedIso,
    image: `/articles/${item.slug}/thumbnail.png`,
    canonical: `${siteUrl}/articles/${item.slug}/`,
    noteUrl: "",
    mainKeyword: item.main_keyword
  };
}

function termsForItem(item) {
  const values = [item.main_keyword, ...(item.secondary_keywords || []), item.article_title_plan, item.unique_angle];
  const terms = new Set();
  for (const value of values) {
    for (const token of String(value || "").split(/[\s、・｜|＋+？?：:（）()「」『』、,]/u)) {
      const cleaned = token.trim().toLocaleLowerCase();
      if (cleaned.length >= 2) terms.add(cleaned);
    }
  }
  return [...terms];
}

function scoreText(text, terms) {
  const normalized = String(text || "").toLocaleLowerCase();
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

async function findNoteSources(item) {
  const manifest = await readText("content_sources/note/manifest.tsv");
  const map = await readText("content_sources/knowledge_base/seo_experience_map.md");
  const noteFiles = await fs.readdir(abs("content_sources/note/articles"));
  const terms = termsForItem(item);
  const candidates = new Map();

  for (const line of manifest.split(/\r?\n/)) {
    const [url, title] = line.split("\t");
    if (!url || !title) continue;
    const score = scoreText(title, terms);
    if (score === 0) continue;
    const noteFile = noteFiles.find((name) => name.endsWith(".md") && name.includes(title));
    if (!noteFile) continue;
    candidates.set(`content_sources/note/articles/${noteFile}`, { score: score + 1, url, title });
  }

  let currentHeading = "";
  for (const line of map.split(/\r?\n/)) {
    if (line.startsWith("## ")) currentHeading = line.slice(3).trim();
    const linkMatches = [...line.matchAll(/\]\(\.\.\/note\/articles\/([^)]*?\.md)\)/g)];
    for (const match of linkMatches) {
      const filename = decodeURIComponent(match[1]);
      const relativePath = `content_sources/note/articles/${filename}`;
      if (!(await exists(relativePath))) continue;
      const contextScore = scoreText(`${currentHeading} ${line} ${filename}`, terms);
      const metadata = parseFrontmatter(await readText(relativePath));
      candidates.set(relativePath, {
        score: Math.max(contextScore, 1),
        url: metadata.source_url || "",
        title: metadata.title || filename.replace(/\.md$/, "")
      });
    }
  }

  const valid = [];
  for (const [relativePath, candidate] of candidates) {
    const metadata = parseFrontmatter(await readText(relativePath));
    if (String(metadata.has_paywall || "").toLowerCase() === "true" || metadata.access_status !== "public_free") continue;
    valid.push({
      path: relativePath,
      score: candidate.score,
      title: metadata.title || candidate.title || path.basename(relativePath, ".md"),
      url: metadata.source_url || candidate.url || ""
    });
  }
  return valid.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path)).slice(0, 5);
}

async function buildSourcePacket(item, noteSources) {
  if (PUBLIC_STOCK_ONLY) return "";
  const requested = [...SOURCE_CORE, ...(item.knowledge_base_topics || [])];
  const unique = [...new Set(requested.map(normalizeRepoPath))];
  const sections = [];
  const limit = Number(process.env.SOURCE_CHAR_LIMIT || 40000);
  for (const relativePath of unique) {
    if (!(await exists(relativePath))) throw new FatalPublishError(`knowledge_baseの参照ファイルがありません: ${relativePath}`);
    const source = await readText(relativePath);
    sections.push(`--- SOURCE: ${relativePath} ---\n${source.slice(0, limit)}`);
  }
  for (const note of noteSources) {
    const source = await readText(note.path);
    sections.push(`--- PUBLIC NOTE SOURCE: ${note.path} ---\n${source.slice(0, limit)}`);
  }
  return sections.join("\n\n");
}

function requiresOfficialSource(item) {
  return /税|住民税|健康保険|社会保険|年金|NISA|iDeCo|マイクロ法人|住宅ローン/.test(item.main_keyword);
}

function stockRoot() {
  return config.paths.article_stock || "automation/article_stock";
}

function stockDirectory(item) {
  return `${stockRoot()}/${item.slug}`;
}

async function loadPreparedArticle(item) {
  const directory = stockDirectory(item);
  const manifestPath = `${directory}/article.json`;
  if (!(await exists(manifestPath))) throw new ArticleNeedsReview(`事前作成ストックがありません: ${manifestPath}`);
  let manifest;
  try {
    manifest = JSON.parse(await readText(manifestPath));
  } catch (error) {
    throw new ArticleNeedsReview(`事前作成ストックのJSONを読めません: ${manifestPath} (${error.message})`);
  }
  const bodyFile = normalizeRepoPath(manifest.body_file || "body.html");
  if (!bodyFile || bodyFile.includes("..")) throw new ArticleNeedsReview(`事前作成ストックの本文パスが不正です: ${item.slug}`);
  const bodyPath = `${directory}/${bodyFile}`;
  if (!(await exists(bodyPath))) throw new ArticleNeedsReview(`事前作成ストックの本文がありません: ${bodyPath}`);
  return { ...manifest, body_html: String(manifest.body_html || await readText(bodyPath)) };
}

async function loadPreparedNoteSources(generated) {
  if (PUBLIC_STOCK_ONLY) return [];
  const sources = [];
  for (const sourcePath of generated.source_note_paths || []) {
    const normalized = normalizeSourcePath(sourcePath);
    if (!normalized.startsWith("content_sources/note/articles/") || !normalized.endsWith(".md")) {
      throw new ArticleNeedsReview(`事前作成ストックのnote出典パスが不正です: ${sourcePath}`);
    }
    if (!(await exists(normalized))) throw new ArticleNeedsReview(`事前作成ストックのnote出典がありません: ${normalized}`);
    const metadata = parseFrontmatter(await readText(normalized));
    if (String(metadata.has_paywall || "").toLowerCase() === "true" || metadata.access_status !== "public_free") {
      throw new ArticleNeedsReview(`公開無料部分として確認できないnote出典です: ${normalized}`);
    }
    sources.push({ path: normalized, score: 0, title: metadata.title || path.basename(normalized, ".md"), url: metadata.source_url || "" });
  }
  return sources;
}

function validateBodyHtml(generated) {
  const body = String(generated.body_html || "");
  const blocked = /<\/?(script|style|iframe|object|embed|form|input|button|img|svg|video|audio|picture|source|canvas)\b|\son[a-z]+\s*=|\sstyle\s*=|javascript:|data:text\/html/i;
  const cannedPhrases = [/結論から言うと/g, /本記事では/g, /いかがでしたか/g, /ぜひ参考にして(?:みて|ください)/g, /最後までお読みいただき/g];
  if (blocked.test(body)) throw new ArticleNeedsReview("本文に公開できないHTMLが含まれています。");
  if (cannedPhrases.some((pattern) => pattern.test(body))) throw new ArticleNeedsReview("定型的なAI生成表現が含まれているため、本人の言葉を中心に書き直します。");
  if (/\[[^\]]+\]\((?:https?:\/\/|\/)/.test(body)) throw new ArticleNeedsReview("本文にMarkdown形式のリンクが残っています。");
  if (stripTags(body).length < 2200) throw new ArticleNeedsReview("本文が短すぎます。検索意図に答える十分な本文を生成できませんでした。");
  if ((body.match(/<h2\b/gi) || []).length < 4) throw new ArticleNeedsReview("本文の見出し構成が不足しています。");
}

function normalizeSourcePath(value) {
  return normalizeRepoPath(String(value || "").trim());
}

function validateExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function verifyUrlReachable(url) {
  if (process.env.CHECK_EXTERNAL_SOURCES === "false") return true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "wakuwaku-fire-content-check/1.0" }
    });
    return response.ok;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateGeneratedOutput(item, generated, noteSources, sourcePacket) {
  if (generated.needs_review) throw new ArticleNeedsReview(generated.review_reason || "モデルが根拠不足と判断しました。");
  if (generated.cannibalization === "skip") return generated;
  validateBodyHtml(generated);
  if (!generated.title || !generated.meta_description || !generated.lead) throw new ArticleNeedsReview("タイトル、説明、リードのいずれかが空です。");
  if ([...String(generated.title)].length < 12 || [...String(generated.title)].length > 90) throw new ArticleNeedsReview("タイトルの長さがSEO編集基準外です。");
  if ([...String(generated.meta_description)].length < 45 || [...String(generated.meta_description)].length > 180) throw new ArticleNeedsReview("meta descriptionの長さがSEO編集基準外です。");
  if (generated.cannibalization === "needs_review") throw new ArticleNeedsReview(`カニバリ確認が必要です: ${generated.cannibalization_note || "重複の可能性"}`);

  if (!PUBLIC_STOCK_ONLY) {
  const allowedNotes = new Set(noteSources.map((note) => normalizeRepoPath(note.path)));
  for (const sourcePath of generated.source_note_paths || []) {
    const normalized = normalizeSourcePath(sourcePath);
    if (!allowedNotes.has(normalized)) throw new ArticleNeedsReview(`許可した公開note以外を出典に指定しています: ${sourcePath}`);
  }
  }
  const sources = generated.external_sources || [];
  if (item.latest_fact_check_required && !sources.length) throw new ArticleNeedsReview("最新情報が必要な記事なのに外部出典がありません。");
  for (const source of sources) {
    if (!validateExternalUrl(source.url)) throw new ArticleNeedsReview(`外部出典URLがHTTPSではありません: ${source.url}`);
    if (requiresOfficialSource(item)) {
      const host = new URL(source.url).hostname.toLocaleLowerCase();
      if (!OFFICIAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
        throw new ArticleNeedsReview(`制度記事の出典が公的ドメインではありません: ${source.url}`);
      }
    }
    try {
      if (!(await verifyUrlReachable(source.url))) throw new Error("HTTPエラー");
    } catch {
      throw new ArticleNeedsReview(`外部出典へアクセスできません: ${source.url}`);
    }
  }
  const allowedExternalUrls = new Set([
    ...noteSources.map((note) => note.url).filter(Boolean),
    ...sources.map((source) => source.url).filter(Boolean)
  ]);
  for (const match of String(generated.body_html || "").matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const href = match[1].trim();
    if (/^https:\/\//i.test(href)) {
      if (!allowedExternalUrls.has(href)) throw new ArticleNeedsReview(`本文内の外部リンクが出典一覧にありません: ${href}`);
    } else if (/^http:\/\//i.test(href)) {
      throw new ArticleNeedsReview(`本文内の外部リンクがHTTPSではありません: ${href}`);
    } else {
      const localTarget = localTargetFromLink(`articles/${item.slug}/index.html`, href);
      if (localTarget && !(await localSitePathExists(localTarget))) throw new ArticleNeedsReview(`本文内の内部リンクが存在しません: ${href}`);
    }
  }
  const allowedInternalTargets = new Set((item.internal_link_targets || []).map((target) => normalizeSitePath(target)));
  for (const link of generated.internal_links || []) {
    const target = normalizeSitePath(link.path);
    if (!allowedInternalTargets.has(target)) throw new ArticleNeedsReview(`キューにない内部リンクを指定しています: ${link.path}`);
    if (!(await localSitePathExists(target))) throw new ArticleNeedsReview(`未公開または存在しない内部リンクを指定しています: ${link.path}`);
    if (!String(link.anchor || "").trim()) throw new ArticleNeedsReview(`内部リンクのアンカーテキストが空です: ${link.path}`);
  }
  if (!PUBLIC_STOCK_ONLY) {
  const sourceText = String(sourcePacket || "").replace(/\s+/g, " ");
  for (const quote of generated.used_personal_quotes || []) {
    const normalizedQuote = String(quote || "").replace(/\s+/g, " ").trim();
    if (normalizedQuote && !sourceText.includes(normalizedQuote)) throw new ArticleNeedsReview(`本人フレーズの原文照合に失敗しました: ${quote}`);
  }
  }
  const thumbnailText = String(generated.thumbnail_text || item.thumbnail_text_hint || "").trim();
  if ([...thumbnailText].length < 1 || [...thumbnailText].length > 10) generated.thumbnail_text = item.thumbnail_text_hint;
  if (!generated.thumbnail_prompt || String(generated.thumbnail_prompt).length < 10) throw new ArticleNeedsReview("サムネイルのテーマ指示が不足しています。");
  return generated;
}

function buildLinkCard({ href, image, eyebrow, title, description, external = false }) {
  const domain = new URL(href, `${config.site_url}/`).hostname;
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `              <a class="link-card" href="${htmlEscape(href)}"${target}>\n                <span class="link-card__media"><img src="${htmlEscape(image)}" alt="${htmlEscape(title)}" width="240" height="240" loading="lazy" decoding="async" /></span>\n                <span class="link-card__body">\n                  <span class="link-card__eyebrow">${htmlEscape(eyebrow)}</span>\n                  <strong class="link-card__title">${htmlEscape(title)}</strong>\n                  <span class="link-card__description">${htmlEscape(description)}</span>\n                  <span class="link-card__domain">${htmlEscape(domain)} ↗</span>\n                </span>\n              </a>`;
}

function articleSlugFromSitePath(sitePath) {
  const match = /^\/articles\/([^/]+)\/?$/.exec(normalizeSitePath(sitePath));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function selectRelatedArticles(item, generated, allArticles) {
  const bySlug = new Map(allArticles.map((article) => [article.slug, article]));
  const related = [];
  for (const link of generated?.internal_links || []) {
    const slug = articleSlugFromSitePath(link?.path);
    const article = slug && slug !== item.slug ? bySlug.get(slug) : null;
    if (article && !related.some((candidate) => candidate.slug === article.slug)) related.push(article);
  }
  if (related.length) return related.slice(0, 1);

  const terms = termsForItem({
    ...item,
    article_title_plan: generated?.title || item.article_title_plan,
    unique_angle: generated?.meta_description || item.unique_angle
  });
  return allArticles
    .filter((article) => article.slug !== item.slug)
    .map((article) => ({ article, score: scoreText(`${article.title} ${article.description} ${article.category}`, terms) }))
    .sort((left, right) => right.score - left.score || sortArticles(left.article, right.article))
    .slice(0, 1)
    .map(({ article }) => article);
}

function buildRelatedLinkCard(article, currentSlug) {
  return buildLinkCard({
    href: relativeSiteUrl(`/articles/${currentSlug}`, `/articles/${article.slug}/`),
    image: relativeSiteUrl(`/articles/${currentSlug}`, article.image),
    eyebrow: "RELATED ARTICLE",
    title: article.title,
    description: article.description
  });
}

function buildLinkCards(item, generated, allArticles) {
  const relatedCards = selectRelatedArticles(item, generated, allArticles)
    .map((article) => buildRelatedLinkCard(article, item.slug))
    .join("\n");
  const communityCard = buildLinkCard({
    href: config.community_url,
    image: `../../${config.community_image || "FIREコミュニティ.png"}`,
    eyebrow: "COMMUNITY",
    title: "FIREを本音で話せる場所",
    description: "ワクワクFIRE道。FIREや自由な人生を目指す人が交流できるコミュニティ。",
    external: true
  });
  return relatedCards ? `${relatedCards}\n${communityCard}` : communityCard;
}

function buildTags(tags) {
  const unique = [...new Set([...(tags || []), "FIRE"])].slice(0, 8);
  return unique.map((tag) => `<span>${htmlEscape(tag)}</span>`).join("");
}

function buildSourceBlock(generated, noteSources, item) {
  const selected = new Set((generated.source_note_paths || []).map(normalizeSourcePath));
  const notes = noteSources.filter((note) => selected.has(normalizeRepoPath(note.path)) && validateExternalUrl(note.url));
  const noteLinks = notes.length
    ? `<p>本人の公開noteを参照しています。記事本文の体験と意見は、公開時点の記述として扱っています。</p><ul>${notes.map((note) => `<li><a href="${htmlEscape(note.url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(note.title)}</a></li>`).join("")}</ul>`
    : `<p>本人の個別体験を直接扱う箇所は、保存済みの公開資料で確認できた範囲に限っています。</p>`;
  const external = (generated.external_sources || []).length
    ? `<p>最新情報の確認先：</p><ul>${generated.external_sources.map((source) => `<li><a href="${htmlEscape(source.url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(source.title || source.url)}</a></li>`).join("")}</ul>`
    : "";
  return `            <aside class="article-source"><strong>参考リンクと注意</strong>${noteLinks}${external}<p>この記事は個人の体験・考えと一般的な情報を整理したものです。投資・税金・制度の条件は変わるため、最新情報は公式情報も確認してください。</p></aside>`;
}

function buildInternalLinkBlock(internalLinks, currentSlug) {
  const links = (internalLinks || []).filter((link) => link?.path && link?.anchor);
  if (!links.length) return "";
  const list = links.map((link) => {
    const href = relativeSiteUrl(`/articles/${currentSlug}`, normalizeSitePath(link.path));
    return `              <li><a href="${htmlEscape(href)}">${htmlEscape(link.anchor)}</a></li>`;
  }).join("\n");
  return `            <section class="article-inline-links" aria-label="関連するワクワクFIREの情報"><h2>関連するワクワクFIREの情報</h2><ul>\n${list}\n            </ul></section>`;
}

function buildStructuredData(title, description, imageUrl, canonical, publishedIso, modifiedIso, tags) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: [imageUrl],
    datePublished: publishedIso,
    dateModified: modifiedIso,
    author: { "@type": "Organization", name: "ワクワクFIRE" },
    publisher: { "@type": "Organization", name: "ワクワクFIRE" },
    articleSection: "FIREコラム",
    keywords: tags,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical }
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${config.site_url}/` },
      { "@type": "ListItem", position: 2, name: "FIREコラム", item: `${config.site_url}/articles/` },
      { "@type": "ListItem", position: 3, name: title, item: canonical }
    ]
  };
  const stringify = (value) => JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
  return `    <script type="application/ld+json">\n${stringify(article)}\n    </script>\n    <script type="application/ld+json">\n${stringify(breadcrumb)}\n    </script>`;
}

function renderPager(current, allArticles) {
  const index = allArticles.findIndex((article) => article.slug === current.slug);
  const newer = index > 0 ? allArticles[index - 1] : null;
  const older = index >= 0 && index < allArticles.length - 1 ? allArticles[index + 1] : null;
  const card = (article, label, className) => article
    ? `<a class="article-pager__link ${className}" href="../${encodeURIComponent(article.slug)}/"><span>${label}</span><strong>${htmlEscape(article.title)}</strong></a>`
    : `<span class="article-pager__empty" aria-hidden="true"></span>`;
  return `        <nav class="article-pager" aria-label="前後の記事">${card(older, "← 前の記事", "article-pager__link--previous")}${card(newer, "次の記事 →", "article-pager__link--next")}</nav>`;
}

function renderRelated(current, allArticles) {
  const related = allArticles.filter((article) => article.slug !== current.slug).slice(0, 3);
  const cards = related.map((article) => {
    const image = relativeSiteUrl(`/articles/${current.slug}`, article.image);
    const dimensions = article.image.endsWith("/thumbnail.png") ? 'width="1280" height="1280"' : 'width="1254" height="1254"';
    return `            <a class="article-preview-card" href="../${htmlEscape(article.slug)}/"><div class="article-preview-card__media"><img src="${htmlEscape(image)}" alt="${htmlEscape(article.title)}のサムネイル" ${dimensions} loading="lazy" decoding="async" /></div><div class="article-preview-card__body"><p class="article-preview-card__date">${htmlEscape(japaneseDate(article.date))}</p><p class="article-preview-card__category">${htmlEscape(article.category)}</p><h3>${htmlEscape(article.title)}</h3><p>${htmlEscape(article.description)}</p><span class="article-preview-card__more">続きを読む ↗</span></div></a>`;
  }).join("\n");
  return `        <section class="related-articles" aria-labelledby="related-title"><div class="section-heading"><p class="eyebrow eyebrow--yellow">READ NEXT</p><h2 id="related-title">関連する<br /><span>FIREコラム。</span></h2></div><div class="article-preview-grid article-preview-grid--compact">${cards}\n          </div></section>`;
}

function renderArticleTemplate(item, generated, date, allArticles, noteSources, publishedTime = "18:00:00") {
  const siteUrl = config.site_url.replace(/\/$/, "");
  const canonical = `${siteUrl}/articles/${item.slug}/`;
  const publishedIso = `${date}T${publishedTime}+09:00`;
  const modifiedIso = publishedIso;
  const tags = [...new Set([...(generated.tags || []), "FIRE"])].slice(0, 8);
  const thumbnailUrl = `${siteUrl}/articles/${item.slug}/thumbnail.png`;
  let html = ARTICLE_TEMPLATE;
  const replacements = {
    META_DESCRIPTION: htmlEscape(generated.meta_description),
    OG_TITLE: htmlEscape(`${generated.title}｜FIREコラム`),
    CANONICAL_URL: htmlEscape(canonical),
    THUMBNAIL_URL: htmlEscape(thumbnailUrl),
    PUBLISHED_ISO: publishedIso,
    MODIFIED_ISO: modifiedIso,
    ARTICLE_TAG_META: tags.map((tag) => `    <meta property="article:tag" content="${htmlEscape(tag)}" />`).join("\n"),
    HTML_TITLE: htmlEscape(`${generated.title}｜FIREコラム｜ワクワクFIRE`),
    STRUCTURED_DATA: buildStructuredData(generated.title, generated.meta_description, thumbnailUrl, canonical, publishedIso, modifiedIso, tags),
    TITLE: htmlEscape(generated.title),
    PUBLISHED_DATE: date,
    MODIFIED_DATE: date,
    PUBLISHED_DISPLAY: japaneseDate(date),
    MODIFIED_DISPLAY: japaneseDate(date),
    CATEGORY: htmlEscape(generated.category || "FIREコラム"),
    THUMBNAIL_RELATIVE: "thumbnail.png",
    TOP_LINK_CARDS: buildLinkCards(item, generated, allArticles),
    LEAD: htmlEscape(generated.lead),
    BODY_HTML: generated.body_html,
    INTERNAL_LINKS: buildInternalLinkBlock(generated.internal_links, item.slug),
    SOURCE_BLOCK: buildSourceBlock(generated, noteSources, item),
    BOTTOM_LINK_CARDS: buildLinkCards(item, generated, allArticles),
    TAGS: buildTags(tags),
    PAGER: renderPager({ slug: item.slug, title: generated.title, date }, allArticles),
    RELATED_ARTICLES: renderRelated({ slug: item.slug }, allArticles),
    YEAR: date.slice(0, 4)
  };
  for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(`{{${token}}}`, value);
  return html;
}

const ARTICLE_TEMPLATE = await fs.readFile(abs(config.paths.template), "utf8");

function renderHomeCard(article) {
  const image = relativeSiteUrl("/", article.image);
  const dimensions = article.image.endsWith("/thumbnail.png") ? 'width="1280" height="1280"' : 'width="1254" height="1254"';
  return `            <article class="article-preview-card"><div class="article-preview-card__media"><img src="${htmlEscape(image)}" alt="${htmlEscape(article.title)}のサムネイル" ${dimensions} loading="lazy" decoding="async" /></div><div class="article-preview-card__body"><p class="article-preview-card__date">${htmlEscape(japaneseDate(article.date))}</p><p class="article-preview-card__category">${htmlEscape(article.category)}</p><h3>${htmlEscape(article.title)}</h3><p>${htmlEscape(article.description)}</p><a class="article-preview-card__more" href="./articles/${htmlEscape(article.slug)}/">記事を読む ↗</a></div></article>`;
}

function renderArticleListCard(article) {
  const image = relativeSiteUrl("/articles", article.image);
  const dimensions = article.image.endsWith("/thumbnail.png") ? 'width="1280" height="1280"' : 'width="1254" height="1254"';
  return `        <article class="article-preview-card"><div class="article-preview-card__media"><img src="${htmlEscape(image)}" alt="${htmlEscape(article.title)}のサムネイル" ${dimensions} loading="lazy" decoding="async" /></div><div class="article-preview-card__body"><p class="article-preview-card__date">${htmlEscape(japaneseDate(article.date))}</p><p class="article-preview-card__category">${htmlEscape(article.category)}</p><h2>${htmlEscape(article.title)}</h2><p>${htmlEscape(article.description)}</p><a class="button button--outline" href="./${htmlEscape(article.slug)}/">記事を読む <span aria-hidden="true">↗</span></a></div></article>`;
}

async function updateArticleIndexes(allArticles) {
  const latest = allArticles.slice(0, 3).map(renderHomeCard).join("\n");
  const rootIndex = await readText("index.html");
  await writeText("index.html", replaceMarkedSection(rootIndex, "<!-- AUTO-PUBLISH:HOME-LATEST-START -->", "<!-- AUTO-PUBLISH:HOME-LATEST-END -->", latest));

  const articleIndex = await readText("articles/index.html");
  const list = allArticles.map(renderArticleListCard).join("\n");
  let updated = replaceMarkedSection(articleIndex, "<!-- AUTO-PUBLISH:ARTICLE-LIST-START -->", "<!-- AUTO-PUBLISH:ARTICLE-LIST-END -->", list);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "ワクワクFIRE FIREコラム",
    itemListElement: allArticles.map((article, index) => ({ "@type": "ListItem", position: index + 1, name: article.title, url: `${config.site_url}/articles/${article.slug}/` }))
  };
  const scriptPattern = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (!scriptPattern.test(updated)) throw new Error("articles/index.htmlのItemList JSON-LDを更新できません。");
  updated = updated.replace(scriptPattern, `<script type="application/ld+json">\n${JSON.stringify(itemList, null, 2)}\n    </script>`);
  await writeText("articles/index.html", updated);
}

async function updateSitemap(allArticles, date) {
  const sitemap = await readText("sitemap.xml");
  const urls = [];
  for (const match of sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)) {
    urls.push({ loc: match[1], lastmod: match[2] });
  }
  const known = new Map(urls.map((entry) => [entry.loc, entry]));
  known.set(`${config.site_url}/articles/`, { loc: `${config.site_url}/articles/`, lastmod: date });
  for (const article of allArticles) known.set(`${config.site_url}/articles/${article.slug}/`, { loc: `${config.site_url}/articles/${article.slug}/`, lastmod: article.date });
  const body = [...known.values()].map((entry) => `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>\n  </url>`).join("\n");
  await writeText("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}

function logSources(noteSources, generated, item) {
  const noteLines = noteSources.length ? noteSources.map((note) => `- ${note.path} | ${note.url}`).join("\n") : "- なし";
  const externalLines = (generated.external_sources || []).length ? generated.external_sources.map((source) => `- ${source.url} | ${source.title} | ${source.why}`).join("\n") : "- なし";
  const quoteLines = (generated.used_personal_quotes || []).length ? generated.used_personal_quotes.map((quote) => `- ${quote}`).join("\n") : "- なし";
  const knowledgeBase = [...new Set([...SOURCE_CORE, ...(item?.knowledge_base_topics || [])])];
  return `# 編集用ソースメモ：${generated.title}\n\n- 記事ID: {{ARTICLE_ID}}\n- main keyword: {{MAIN_KEYWORD}}\n- 公開日: {{DATE}}\n\n## 参照ファイル\n\n${knowledgeBase.map((source) => `- ${source}`).join("\n")}\n\n## 参照note（公開部分のみ）\n\n${noteLines}\n\n## 本人提供フレーズ\n\n${quoteLines}\n\n## 最新情報ソース\n\n${externalLines}\n\n## 編集時の注意\n\n- 本人の事実はnote原文とknowledge_baseの時点を併記する。\n- 有料部分、非公開部分、確認できない現在値を推測しない。\n- 制度・税金・投資の説明は記事公開時点の公式情報を再確認する。\n`;
}

async function appendPublishLog(item, generated, noteSources, date, result, details = "", publishedTime = "", publishedSlot = "") {
  let log = await readText(config.paths.publish_log);
  const noteLines = noteSources.length ? noteSources.map((note) => `- ${note.url || note.path}`).join("\n") : "- なし";
  const externalLines = (generated.external_sources || []).length ? generated.external_sources.map((source) => `- [${source.title || source.url}](${source.url})`).join("\n") : "- なし";
  const displayTime = publishedTime || item.published_time || "不明";
  const displaySlot = publishedSlot || item.published_slot || "なし（手動実行または未確定）";
  const section = `\n## ${result}: ${generated.title || item.article_title_plan}\n\narticle id: ${item.id}\npriority_order: ${item.priority_order}\n公開日・時刻（JST）: ${date} ${displayTime}\n公開枠: ${displaySlot}\nmain keyword: ${item.main_keyword}\ntitle: ${generated.title || item.article_title_plan}\nslug: ${item.slug}\nURL: ${item.published_url || `${config.site_url}/articles/${item.slug}/`}\nthumbnail file: articles/${item.slug}/thumbnail.png\nthumbnail text: ${generated.thumbnail_text || item.thumbnail_text_hint}\n参照knowledge_base: ${item.knowledge_base_topics.join(", ")}\n参照note原記事:\n${noteLines}\n使用本人フレーズ: ${(generated.used_personal_quotes || []).join(" / ") || "なし"}\n最新情報確認: ${item.latest_fact_check_required ? "あり" : "なし"}\nexternal sources:\n${externalLines}\n公開結果: ${result}${details ? `\n理由: ${details}` : ""}\n`;
  await writeText(config.paths.publish_log, `${log.trimEnd()}\n${section}`);
}

async function writeEditorialNote(item, generated, noteSources, date) {
  const relativePath = `${config.paths.editorial_notes}/${item.slug}.md`;
  let note = logSources(noteSources, generated, item)
    .replaceAll("{{ARTICLE_ID}}", item.id)
    .replaceAll("{{MAIN_KEYWORD}}", item.main_keyword)
    .replaceAll("{{DATE}}", date);
  await writeText(relativePath, note);
}

async function acquireLock() {
  const lockPath = abs(".auto-publish.lock");
  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
    await handle.close();
    return async () => removeIfExists(".auto-publish.lock");
  } catch {
    throw new FatalPublishError("別の自動公開処理が実行中です。重複起動を止めました。");
  }
}

function scheduleSlotsJst() {
  const configured = Array.isArray(config.schedule?.slots_jst) ? config.schedule.slots_jst : ["07:00", "18:00"];
  return [...new Set(configured.map((slot) => String(slot).trim()).filter((slot) => /^\d{2}:\d{2}$/.test(slot)))];
}

function scheduleSlotForJst(jst) {
  const slots = scheduleSlotsJst();
  const requested = String(process.env.PUBLISH_SLOT_JST || "").trim();
  const slot = requested ? (slots.includes(requested) ? requested : "") : slots.find((candidate) => candidate.slice(0, 2) === jst.time.slice(0, 2));
  return slot ? `${jst.date}T${slot}:00+09:00` : "";
}

function publicationSlotFor(now, mode) {
  const scheduledSlot = scheduleSlotForJst(now);
  if (scheduledSlot) return { key: scheduledSlot, time: scheduledSlot.slice(11, 19), scheduled: true };
  if (mode === "scheduled") throw new FatalPublishError("scheduled実行が07:00または18:00（JST）の公開枠を特定できません。実行時刻とPUBLISH_SLOT_JSTを確認してください。");
  return { key: `manual:${now.iso}`, time: now.time, scheduled: false };
}

function publishedSlotForItem(item) {
  if (item.published_slot) return item.published_slot;
  if (item.status !== "published" || !item.published_at) return "";
  return `${item.published_at}T${item.published_time || "18:00:00"}+09:00`;
}

function slotAlreadyPublished(queue, slotKey) {
  return queue.items.some((item) => publishedSlotForItem(item) === slotKey);
}

async function writeRunResult(result) {
  await writeText(".auto-publish-result.json", `${JSON.stringify({ ...result, completed_at: currentJst().iso }, null, 2)}\n`);
}

function nextPlanned(queue) {
  return [...queue.items].filter((item) => item.status === "stocked").sort((a, b) => a.priority_order - b.priority_order)[0];
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function copyPreparedThumbnail(item) {
  const stockRelative = `${stockDirectory(item)}/thumbnail.png`;
  if (!(await exists(stockRelative))) throw new ArticleNeedsReview(`事前作成ストックのサムネイルがありません: ${stockRelative}`);
  const buffer = await fs.readFile(abs(stockRelative));
  const dimensions = pngDimensions(buffer);
  if (!dimensions || dimensions.width !== dimensions.height || dimensions.width < 512) {
    throw new ArticleNeedsReview(`サムネイルは512px以上の1:1 PNGにしてください: ${stockRelative}`);
  }
  const outRelative = `articles/${item.slug}/thumbnail.png`;
  const outPath = abs(outRelative);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.copyFile(abs(stockRelative), outPath);
  return outRelative;
}

async function validateGeneratedArticleFile(relativePath, item, generated, date, allArticles) {
  const html = await readText(relativePath);
  const canonical = `${config.site_url}/articles/${item.slug}/`;
  const homeUrl = `${config.site_url}/`;
  if (/{{[A-Z_]+}}/.test(html)) throw new Error("記事テンプレートの未置換プレースホルダーが残っています。");
  if (!html.includes(`<link rel="canonical" href="${canonical}"`)) throw new Error("canonicalが一致しません。");
  if (!html.includes(`property="og:image" content="${canonical}thumbnail.png"`)) throw new Error("OGP画像が記事サムネイルを指していません。");
  if ((html.match(new RegExp(`href="${homeUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) || []).length > 0) throw new Error("コラムトップへのリンクカードは関連記事へ置き換えてください。");
  if ((html.match(new RegExp(`href="${config.community_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) || []).length < 2) throw new Error("コミュニティリンクカードが不足しています。");
  const related = selectRelatedArticles(item, generated, allArticles);
  if (!related.length) throw new Error("関連記事リンクカードがありません。");
  const relatedHref = relativeSiteUrl(`/articles/${item.slug}`, `/articles/${related[0].slug}/`);
  if ((html.match(new RegExp(`href="${relatedHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) || []).length < 2) throw new Error("関連記事リンクカードが不足しています。");
  if (!html.includes(`datetime="${date}"`)) throw new Error("公開日が記事HTMLにありません。");
  if (!html.includes(generated.body_html)) throw new Error("生成本文が記事HTMLに入りませんでした。");
}

async function listHtmlFiles(relativeDirectory = "") {
  const directory = abs(relativeDirectory || ".");
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", ".publish-staging", "node_modules"].includes(entry.name)) continue;
    const relativePath = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(relativePath));
    else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".html")) files.push(relativePath);
  }
  return files;
}

function localTargetFromLink(pagePath, rawTarget) {
  let target = String(rawTarget || "").trim();
  if (!target || target.includes("{{") || target.includes("}}") || target.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(target)) return "";
  target = target.split(/[?#]/, 1)[0];
  if (!target) return "";
  try {
    target = decodeURIComponent(target);
  } catch {
    // Keep the original URL when its percent-encoding is malformed; validation will report it.
  }
  if (target.startsWith("/")) return normalizeSitePath(target);
  const pageDirectory = path.posix.dirname(`/${pagePath.replaceAll("\\", "/")}`);
  return normalizeSitePath(path.posix.join(pageDirectory, target));
}

async function validateLocalReferences() {
  const htmlFiles = await listHtmlFiles();
  const issues = [];
  let referenceCount = 0;
  for (const pagePath of htmlFiles) {
    const html = await readText(pagePath);
    for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      const target = localTargetFromLink(pagePath, match[1]);
      if (!target) continue;
      referenceCount += 1;
      if (!(await localSitePathExists(target))) issues.push(`${pagePath} -> ${target}`);
    }
  }
  if (issues.length) throw new FatalPublishError(`ローカルリンク切れが${issues.length}件あります:\n${issues.slice(0, 30).join("\n")}`);
  return { htmlFiles: htmlFiles.length, localReferences: referenceCount };
}

async function validatePreparedStock(queue) {
  let preparedReviewCount = 0;
  let stockedCount = 0;
  const statuses = PUBLIC_STOCK_ONLY ? ["stocked"] : ["prepared_review", "stocked"];
  for (const item of queue.items.filter((candidate) => statuses.includes(candidate.status))) {
    const generated = await loadPreparedArticle(item);
    const noteSources = await loadPreparedNoteSources(generated);
    const sourcePacket = await buildSourcePacket(item, noteSources);
    await validateGeneratedOutput(item, generated, noteSources, sourcePacket);
    const thumbnailPath = `${stockDirectory(item)}/thumbnail.png`;
    const dimensions = pngDimensions(await fs.readFile(abs(thumbnailPath)));
    if (!dimensions || dimensions.width !== dimensions.height || dimensions.width < 512) {
      throw new FatalPublishError(`事前作成ストックのサムネイルが1:1ではありません: ${thumbnailPath}`);
    }
    if (item.status === "prepared_review") preparedReviewCount += 1;
    if (item.status === "stocked") stockedCount += 1;
  }
  return { preparedReviewCount, stockedCount };
}

async function validateSite() {
  if (!/^https:\/\//i.test(config.site_url) || !/^https:\/\//i.test(config.community_url)) throw new FatalPublishError("site_urlまたはcommunity_urlはHTTPS URLで設定してください。");
  const slots = scheduleSlotsJst();
  if (slots.length !== 2 || slots[0] !== "07:00" || slots[1] !== "18:00" || config.schedule?.articles_per_run !== 1 || config.schedule?.articles_per_day !== 2) {
    throw new FatalPublishError("公開スケジュールは07:00・18:00（JST）に各1本、1日2本で設定してください。");
  }
  const queue = await readQueue();
  const required = ["id", "priority_order", "status", "main_keyword", "secondary_keywords", "article_title_plan", "slug", "search_intent", "unique_angle", "knowledge_base_topics", "internal_link_targets", "thumbnail_text_hint", "latest_fact_check_required", "published_url", "published_at", "published_time", "published_slot", "failed_reason"];
  const ids = new Set();
  const slugs = new Set();
  const priorities = new Set();
  for (const item of queue.items) {
    for (const field of required) if (!(field in item)) throw new FatalPublishError(`キュー項目 ${item.id || "?"} に${field}がありません。`);
    if (!Array.isArray(item.knowledge_base_topics) || !Array.isArray(item.internal_link_targets)) throw new FatalPublishError(`キュー項目の配列フィールドが不正です: ${item.id}`);
    if (ids.has(item.id)) throw new FatalPublishError(`キューIDが重複しています: ${item.id}`);
    if (slugs.has(item.slug)) throw new FatalPublishError(`キューslugが重複しています: ${item.slug}`);
    if (priorities.has(item.priority_order)) throw new FatalPublishError(`priority_orderが重複しています: ${item.priority_order}`);
    if (!ALLOWED_STATUSES.has(item.status)) throw new FatalPublishError(`statusが不正です: ${item.status}`);
    ids.add(item.id); slugs.add(item.slug); priorities.add(item.priority_order);
    if (!PUBLIC_STOCK_ONLY) {
    for (const source of item.knowledge_base_topics) if (!(await exists(source))) throw new FatalPublishError(`参照ファイルがありません: ${source}`);
  }
  }
  if (queue.items.length !== 72) throw new FatalPublishError(`初期キュー件数が72ではありません: ${queue.items.length}`);
  if (![...priorities].every((priority) => Number.isInteger(priority) && priority >= 1 && priority <= 72) || priorities.size !== 72) throw new FatalPublishError("priority_orderは1〜72を1回ずつ使用してください。");
  const noteCount = PUBLIC_STOCK_ONLY
    ? 0
    : (await fs.readdir(abs("content_sources/note/articles"))).filter((filename) => filename.endsWith(".md")).length;
  if (!PUBLIC_STOCK_ONLY && noteCount < 124) throw new FatalPublishError(`保存済みnote原文が124本未満です: ${noteCount}`);
  const articleDirectoryCount = (await listArticleDirectories()).length;
  const existing = await readPublishedArticles();
  if (existing.length !== articleDirectoryCount) throw new FatalPublishError(`記事フォルダと公開記事メタデータの件数が一致しません: ${articleDirectoryCount} folders / ${existing.length} readable`);
  const queueBySlug = new Map(queue.items.map((item) => [item.slug, item]));
  for (const article of existing) {
    const queueItem = queueBySlug.get(article.slug);
    if (!queueItem) continue;
    if (queueItem.status !== "published" || queueItem.published_url !== article.canonical) throw new FatalPublishError(`既存記事と未公開キューslugが重複しています: ${article.slug}`);
  }
  for (const item of queue.items.filter((candidate) => candidate.status === "published")) {
    const article = existing.find((candidate) => candidate.slug === item.slug);
    if (!article || article.canonical !== item.published_url || !item.published_at) throw new FatalPublishError(`publishedキューと記事ファイルが一致しません: ${item.id}`);
  }
  if (!(await exists(config.character_reference))) throw new FatalPublishError(`基準キャラ画像がありません: ${config.character_reference}`);
  if (!(await exists(config.homepage_image))) throw new FatalPublishError(`ホームカード画像がありません: ${config.homepage_image}`);
  if (!(await exists(config.community_image))) throw new FatalPublishError(`コミュニティカード画像がありません: ${config.community_image}`);
  for (const file of ["index.html", "articles/index.html", "sitemap.xml", config.paths.publish_log, config.paths.template]) if (!(await exists(file))) throw new FatalPublishError(`必須ファイルがありません: ${file}`);
  const stock = await validatePreparedStock(queue);
  const home = await readText("index.html");
  const articleIndex = await readText("articles/index.html");
  for (const [html, start, end] of [[home, "<!-- AUTO-PUBLISH:HOME-LATEST-START -->", "<!-- AUTO-PUBLISH:HOME-LATEST-END -->"], [articleIndex, "<!-- AUTO-PUBLISH:ARTICLE-LIST-START -->", "<!-- AUTO-PUBLISH:ARTICLE-LIST-END -->"]]) {
    if ((html.match(new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 1 || (html.match(new RegExp(end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 1) throw new FatalPublishError("一覧更新マーカーが不足または重複しています。");
  }
  const articleFiles = await Promise.all(existing.map(async (article) => ({ article, html: await readText(`articles/${article.slug}/index.html`) })));
  for (const { article, html } of articleFiles) {
    if (!html.includes(`<link rel="canonical" href="${article.canonical}"`)) throw new FatalPublishError(`canonicalが不一致です: ${article.slug}`);
    const homeHref = 'href="' + config.site_url + '/"';
    const communityHref = 'href="' + config.community_url + '"';
    const cardHrefs = [...html.matchAll(/<a class="link-card" href="([^"]+)"/g)].map((match) => match[1]);
    const hasRelatedCard = cardHrefs.some((href) => !/^https?:\/\//i.test(href));
    if ((html.match(/class="link-card-group/g) || []).length < 2 || (html.match(new RegExp(escapeRegExp(homeHref), "g")) || []).length > 0 || (html.match(new RegExp(escapeRegExp(communityHref), "g")) || []).length < 2 || !hasRelatedCard) throw new FatalPublishError(`リンクカードが不足しています: ${article.slug}`);
  }
  const references = await validateLocalReferences();
  return { queueCount: queue.items.length, noteSourceCount: noteCount, existingCount: existing.length, plannedCount: queue.items.filter((item) => item.status === "planned").length, ...stock, ...references };
}

async function dryRun() {
  const queue = await readQueue();
  const item = nextPlanned(queue);
  if (!item) {
    console.log("公開承認済みの事前作成ストックはありません。");
    return;
  }
    const generated = await loadPreparedArticle(item);
    const notes = await loadPreparedNoteSources(generated);
  const now = currentJst();
  const scheduledSlot = scheduleSlotForJst(now);
  console.log(JSON.stringify({
    next: { id: item.id, priority_order: item.priority_order, main_keyword: item.main_keyword, slug: item.slug, title: item.article_title_plan },
    jst_now: now,
    schedule_slots_jst: scheduleSlotsJst(),
    scheduled_slot: scheduledSlot || null,
    slot_already_published: scheduledSlot ? slotAlreadyPublished(queue, scheduledSlot) : false,
    today_published_count: queue.items.filter((candidate) => candidate.status === "published" && candidate.published_at === now.date).length,
    note_sources: notes.map((note) => ({ path: note.path, url: note.url, title: note.title })),
    latest_fact_check_required: item.latest_fact_check_required,
    stock_ready: true,
    stock_path: `${stockDirectory(item)}/`
  }, null, 2));
}

async function statusReport() {
  const queue = await readQueue();
  const counts = Object.fromEntries([...ALLOWED_STATUSES].map((status) => [status, queue.items.filter((item) => item.status === status).length]));
  const published = queue.items.filter((item) => item.status === "published").sort((a, b) => `${b.published_at}T${b.published_time || "00:00:00"}`.localeCompare(`${a.published_at}T${a.published_time || "00:00:00"}`));
  const next = nextPlanned(queue);
  const today = currentJst().date;
  console.log(JSON.stringify({
    counts,
    remaining_planned: counts.planned,
    prepared_for_review: counts.prepared_review,
    stocked_ready: counts.stocked,
    schedule_slots_jst: scheduleSlotsJst(),
    today_published: published.filter((item) => item.published_at === today).map((item) => ({ id: item.id, title: item.generated_title || item.article_title_plan, url: item.published_url, published_time: item.published_time || "", published_slot: publishedSlotForItem(item) })),
    next: next ? { id: next.id, priority_order: next.priority_order, title: next.article_title_plan, slug: next.slug } : null,
    latest_published: published.slice(0, 3).map((item) => ({ id: item.id, date: item.published_at, title: item.generated_title || item.article_title_plan, url: item.published_url, published_time: item.published_time || "", published_slot: publishedSlotForItem(item) })),
    failed: queue.items.filter((item) => item.status === "failed").map((item) => ({ id: item.id, reason: item.failed_reason })),
    needs_review: queue.items.filter((item) => item.status === "needs_review").map((item) => ({ id: item.id, reason: item.failed_reason }))
  }, null, 2));
}

async function approveStock(id) {
  const queue = await readQueue();
  const item = id ? queue.items.find((candidate) => candidate.id === id) : queue.items.find((candidate) => candidate.status === "prepared_review");
  if (!item) throw new FatalPublishError("承認待ちの事前作成ストックが見つかりません。");
  if (item.status !== "prepared_review") throw new FatalPublishError(`${item.id} は承認待ちではありません: ${item.status}`);
  await loadPreparedArticle(item);
  item.status = "stocked";
  item.failed_reason = "";
  await saveQueue(queue);
  console.log(`公開可能ストックへ移しました: ${item.id} (${item.slug})`);
}

async function markFailed(id, reason) {
  const queue = await readQueue();
  const item = id ? queue.items.find((candidate) => candidate.id === id) : queue.items.find((candidate) => candidate.status === "published" && candidate.published_at === currentJst().date);
  if (!item) throw new FatalPublishError("公開確認失敗として記録する記事が見つかりません。");
  item.status = "failed";
  item.failed_reason = reason || "公開URL確認に失敗しました。";
  await saveQueue(queue);
  const generated = { title: item.generated_title || item.article_title_plan, thumbnail_text: item.thumbnail_text_hint, external_sources: [], used_personal_quotes: [] };
  await appendPublishLog(item, generated, [], item.published_at || currentJst().date, "FAILED", item.failed_reason);
  console.log(`failedとして記録しました: ${item.id}`);
}

async function publishOne(mode) {
  await removeIfExists(".auto-publish-result.json");
  const releaseLock = await acquireLock();
  let queue;
  let item;
  let noteSources = [];
  let generated;
  let generatedOutput = false;
  let publication;
  try {
    queue = await readQueue();
    const now = currentJst();
    publication = publicationSlotFor(now, mode);
    if (slotAlreadyPublished(queue, publication.key)) {
      await writeRunResult({ status: "already_published", date: now.date, published_slot: publication.key });
      console.log(`${publication.key} は公開済みです。同じ公開枠の二重実行を止めました。`);
      return;
    }
    item = nextPlanned(queue);
    if (!item) {
      await writeRunResult({ status: "exhausted", date: now.date });
      console.log("公開承認済みの事前作成ストックがありません。記事作成・承認後に公開されます。");
      return;
    }
    const existing = await readPublishedArticles();
    if (existing.some((article) => article.slug === item.slug)) {
      item.status = "skipped";
      item.failed_reason = "既存記事とslugが重複しているため、既存記事へ統合してください。";
      await saveQueue(queue);
      await appendPublishLog(item, { title: item.article_title_plan, thumbnail_text: item.thumbnail_text_hint, external_sources: [], used_personal_quotes: [] }, [], now.date, "SKIPPED", item.failed_reason, publication.time, publication.key);
      await writeRunResult({ status: "skipped", article_id: item.id, slug: item.slug, date: now.date, reason: item.failed_reason });
      return;
    }
    item.failed_reason = "";
    generated = await loadPreparedArticle(item);
    noteSources = await loadPreparedNoteSources(generated);
    const sourcePacket = await buildSourcePacket(item, noteSources);
    if (existing.some((article) => article.title.trim() === String(generated.title || "").trim())) throw new ArticleNeedsReview("既存記事とタイトルが完全一致しています。");
    await validateGeneratedOutput(item, generated, noteSources, sourcePacket);
    if (generated.cannibalization === "skip") {
      item.status = "skipped";
      item.failed_reason = generated.cannibalization_note || "既存記事へ統合";
      await saveQueue(queue);
      await appendPublishLog(item, generated, noteSources, now.date, "SKIPPED", item.failed_reason, publication.time, publication.key);
      await writeRunResult({ status: "skipped", article_id: item.id, slug: item.slug, date: now.date, reason: item.failed_reason });
      return;
    }
    item.generated_title = generated.title;
    item.generated_meta_description = generated.meta_description;
    item.generated_category = generated.category;
    item.generated_thumbnail_text = generated.thumbnail_text || item.thumbnail_text_hint;
    const thumbnailFile = await copyPreparedThumbnail(item);
    generatedOutput = true;
    const newArticle = articleFromQueueItem(item, now.date, config.site_url, publication.time);
    newArticle.title = generated.title;
    newArticle.description = generated.meta_description;
    newArticle.category = generated.category || "FIREコラム";
    const allArticles = [...existing, newArticle].sort(sortArticles);
    const articleHtml = renderArticleTemplate(item, generated, now.date, allArticles, noteSources, publication.time);
    await writeText(`articles/${item.slug}/index.html`, articleHtml);
    await validateGeneratedArticleFile(`articles/${item.slug}/index.html`, item, generated, now.date, allArticles);
    await updateArticleIndexes(allArticles);
    await updateSitemap(allArticles, now.date);
    await writeEditorialNote(item, generated, noteSources, now.date);
    item.status = "published";
    item.published_url = `${config.site_url}/articles/${item.slug}/`;
    item.published_at = now.date;
    item.published_time = publication.time;
    item.published_slot = publication.key;
    item.failed_reason = "";
    await saveQueue(queue);
    await appendPublishLog(item, generated, noteSources, now.date, "PUBLISHED", "", publication.time, publication.key);
    await writeRunResult({ status: "published", article_id: item.id, slug: item.slug, date: now.date, published_time: publication.time, published_slot: publication.key, url: item.published_url });
    console.log(`${mode}公開用の記事を生成しました: ${item.slug}`);
    console.log(`公開確認対象: ${item.published_url}`);
    console.log(`サムネイル: ${thumbnailFile}`);
  } catch (error) {
    if (item && queue) {
      item.status = error instanceof ArticleNeedsReview ? "needs_review" : "failed";
      item.failed_reason = error.message;
      item.published_url = "";
      item.published_at = "";
      item.published_time = "";
      item.published_slot = "";
      if (generatedOutput) {
        await removeIfExists(`articles/${item.slug}`);
        try {
          const rollbackArticles = await readPublishedArticles();
          await updateArticleIndexes(rollbackArticles);
          await updateSitemap(rollbackArticles, currentJst().date);
        } catch (rollbackError) {
          item.failed_reason += ` / ロールバック失敗: ${rollbackError.message}`;
        }
      }
      await removeIfExists(`${config.paths.editorial_notes}/${item.slug}.md`);
      await saveQueue(queue);
      const failureNow = currentJst();
      await appendPublishLog(item, generated || { title: item.generated_title || item.article_title_plan, thumbnail_text: item.generated_thumbnail_text || item.thumbnail_text_hint, external_sources: [], used_personal_quotes: [] }, noteSources, failureNow.date, item.status.toUpperCase(), item.failed_reason, publication?.time || failureNow.time, publication?.key || "");
      await writeRunResult({ status: item.status, article_id: item.id, slug: item.slug, date: failureNow.date, published_slot: publication?.key || "", reason: item.failed_reason });
      console.error(`${item.status}: ${item.id} ${item.failed_reason}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await releaseLock();
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

try {
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify(await validateSite(), null, 2));
  } else if (process.argv.includes("--status")) {
    await statusReport();
  } else if (process.argv.includes("--dry-run")) {
    await dryRun();
  } else if (process.argv.includes("--mark-failed")) {
    await markFailed(argValue("--id"), argValue("--reason"));
  } else if (process.argv.includes("--approve-stock")) {
    await approveStock(argValue("--id"));
  } else if (process.argv.includes("--publish")) {
    await publishOne(argValue("--mode") || "manual");
  } else {
    console.log("使い方: --validate | --status | --dry-run | --approve-stock --id ID | --publish --mode scheduled|manual | --mark-failed --id ID --reason 理由");
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = error instanceof FatalPublishError ? 2 : 1;
}

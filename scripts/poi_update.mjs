import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";
import {
  buildAffiliateRuntime,
  classifyMonetizationCategory,
  countMonetizationCategories,
  MONETIZATION_CATEGORY_LABELS,
  selectAffiliateOffers,
  withMonetizationCategory
} from "./affiliate_engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_CONFIG_PATH = path.join(ROOT, "config", "poi-sources.json");
const CATALOG_PATH = path.join(ROOT, "automation", "otoku", "verified-deals.json");
const PUBLIC_DATA_PATH = path.join(ROOT, "data", "otoku", "deals.json");
const PAGE_PATH = path.join(ROOT, "otoku", "index.html");
const RUN_LOG_PATH = path.join(ROOT, "automation", "otoku", "run-log.json");
const AFFILIATE_CONFIG_PATH = path.join(ROOT, "config", "affiliate.json");
const AFFILIATE_OFFERS_PATH = path.join(ROOT, "config", "affiliate-offers.json");
const AFFILIATE_ANALYSIS_PATH = path.join(ROOT, "automation", "otoku", "affiliate-analysis.json");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const DEFAULT_SITE_URL = "https://wakuwaku-fire-git.pages.dev";
const TIME_ZONE = "Asia/Tokyo";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_SOURCE_CANDIDATES = 40;
const DEFAULT_MAX_DEALS = 30;
const FEATURED_DEAL_COUNT = 10;
const TRACKING_PARAMETERS = /^(utm_[^=]+|fbclid|gclid|yclid|mc_cid|mc_eid|referrer|affiliate|aff)$/i;
const OPPORTUNITY_WORDS = /キャンペーン|還元|ポイント|クーポン|割引|無料|特典|お得|セール|入会|チャージ/i;
const PAYPAY_LOCAL_PARSER = "paypay-support-local";
const PAYPAY_LOCAL_DYNAMIC_TYPE = "paypay-local-aggregate";
const PAYPAY_LOCAL_MAX_RECOMMENDATIONS = 3;
const KOJINABI_GOURMET_PARSER = "kojinabi-gourmet-category";
const KOJINABI_GOURMET_DYNAMIC_TYPE = "kojinabi-gourmet-category";
const KOJINABI_MAX_CATEGORY_PAGES = 30;
const KOJINABI_UNDATED_STALE_DAYS = 60;
const KOJINABI_BLOCKED_LINK_HOSTS = /(?:^|\.)(?:kojinabi\.com|fc2\.com|x\.com|twitter\.com|t\.co|instagram\.com|facebook\.com|youtube\.com|youtu\.be|a8\.net|afb\.jp|valuecommerce\.com|linkshare\.ne\.jp|moshimo\.com|accesstrade\.net|felmat\.net)$/i;

function absolute(relativePath) {
  const resolved = path.resolve(ROOT, String(relativePath).replaceAll("/", path.sep));
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`リポジトリ外のパスです: ${relativePath}`);
  }
  return resolved;
}

async function readText(filename) {
  return fs.readFile(filename, "utf8");
}

async function readJson(filename, fallback) {
  try {
    return JSON.parse(await readText(filename));
  } catch (error) {
    if (error?.code === "ENOENT" && fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeText(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const output = filename === PAGE_PATH ? String(value).replace(/[ \t]+$/gm, "") : value;
  await fs.writeFile(filename, output, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try { return String.fromCodePoint(Number.parseInt(hex, 16)); } catch { return ""; }
    })
    .replace(/&#(\d+);/g, (_, decimal) => {
      try { return String.fromCodePoint(Number(decimal)); } catch { return ""; }
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value) {
  return decodeEntities(String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpace(value) {
  return String(value || "").replace(/[\s\u3000]+/g, " ").trim();
}

function jstParts(value = new Date()) {
  const normalizedValue = value && typeof value === "object" && !(value instanceof Date) && value.iso ? value.iso : value;
  const date = normalizedValue instanceof Date ? normalizedValue : new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) throw new Error(`日時を解釈できません: ${value}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  const dateString = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    date: dateString,
    time: timeString,
    iso: `${dateString}T${timeString}+09:00`
  };
}

function currentJst(override) {
  return jstParts(override || process.env.POI_NOW || new Date());
}

function japaneseDate(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function japaneseDateTime(iso) {
  const parts = jstParts(iso);
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${String(parts.minute).padStart(2, "0")}`;
}

function dateOnlyUtc(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysRemaining(endDate, now = new Date()) {
  if (!endDate) return null;
  const today = jstParts(now).date;
  return Math.round((dateOnlyUtc(endDate) - dateOnlyUtc(today)) / DAY_MS);
}

function isActiveDeal(deal, now) {
  const today = jstParts(now).date;
  if (deal.startDate && deal.startDate > today) return false;
  if (deal.endDate && deal.endDate < today) return false;
  return true;
}

export function monthTitle(now = new Date()) {
  const parts = jstParts(now);
  return `【${parts.year}年${parts.month}月最新】今日・今週のお得一覧【ポイ活まとめ】`;
}

function metaDescription(now) {
  const parts = jstParts(now);
  return `${parts.year}年${parts.month}月に使えるポイ活・ポイント還元・キャッシュレス・クーポンなどのお得情報を厳選。今日見つけてもまだ間に合うキャンペーンを公式情報を確認してまとめています。`;
}

export function canonicalizeUrl(rawUrl) {
  const parsed = new URL(String(rawUrl));
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`http/https以外のURLです: ${rawUrl}`);
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.test(key)) parsed.searchParams.delete(key);
  }
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/+/g, "/") || "/";
  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) parsed.pathname = parsed.pathname.replace(/\/+$/, "/");
  return parsed.toString();
}

function isPrivateIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") ||
      lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") ||
      lower.startsWith("2001:db8");
  }
  return true;
}

export async function assertSafePublicUrl(rawUrl, { resolveDns = true } = {}) {
  let parsed;
  try { parsed = new URL(String(rawUrl)); } catch { throw new Error(`URLを解釈できません: ${rawUrl}`); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`許可されていないURL schemeです: ${rawUrl}`);
  if (parsed.username || parsed.password) throw new Error(`認証情報付きURLは許可されません: ${rawUrl}`);
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error(`ローカル向けホストは許可されません: ${rawUrl}`);
  }
  if (net.isIP(hostname) && isPrivateIp(hostname)) throw new Error(`プライベートIPは許可されません: ${rawUrl}`);
  if (resolveDns && !net.isIP(hostname)) {
    let addresses;
    try {
      addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch (error) {
      throw new Error(`ホストを確認できないためURLを拒否しました: ${hostname}`);
    }
    if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new Error(`プライベートIPへ解決されるURLは許可されません: ${rawUrl}`);
    }
  }
  return parsed;
}

async function readResponseBody(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error(`レスポンスが大きすぎます: ${declaredLength} bytes`);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`レスポンスが大きすぎます: ${total} bytes`);
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

async function fetchSafe(rawUrl, { maxRedirects = 2, timeoutMs = 15_000, maxBytes = MAX_RESPONSE_BYTES, acceptStatuses = [] } = {}) {
  let target = String(rawUrl);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertSafePublicUrl(target);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(target, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,application/atom+xml;q=0.8,text/plain;q=0.5",
          "user-agent": "WakuwakuFIRE-PoiSensor/1.0 (+https://wakuwaku-fire-git.pages.dev/otoku/)"
        }
      });
    } catch (error) {
      throw new Error(`取得失敗: ${error?.name === "AbortError" ? "timeout" : error.message}`);
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`リダイレクト先がありません: ${target}`);
      target = new URL(location, target).toString();
      continue;
    }
    if (!response.ok && !acceptStatuses.includes(response.status)) {
      throw new Error(`HTTP ${response.status}: ${target}`);
    }
    const body = await readResponseBody(response, maxBytes);
    return {
      requestedUrl: String(rawUrl),
      finalUrl: target,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      body
    };
  }
  throw new Error(`リダイレクト回数が上限を超えました: ${rawUrl}`);
}

function parseRobots(body) {
  const groups = [];
  let current = null;
  for (const rawLine of String(body || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], rules: [] };
      groups.push(current);
    } else if ((key === "disallow" || key === "allow") && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  return groups;
}

function robotsRuleMatches(pathname, rulePath) {
  if (!rulePath) return false;
  const endAnchored = rulePath.endsWith("$");
  const source = endAnchored ? rulePath.slice(0, -1) : rulePath;
  const pattern = source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${pattern}${endAnchored ? "$" : ""}`).test(pathname);
}

function robotsAllows(robotsBody, targetUrl, userAgent = "wakuwakufire-poisensor") {
  const groups = parseRobots(robotsBody);
  const specificGroups = groups.filter((group) => group.agents.some((agent) => agent !== "*" && userAgent.includes(agent)));
  const applicableGroups = specificGroups.length ? specificGroups : groups.filter((group) => group.agents.includes("*"));
  const rules = applicableGroups.flatMap((group) => group.rules);
  const pathname = new URL(targetUrl).pathname;
  let best = null;
  for (const rule of rules) {
    if (!robotsRuleMatches(pathname, rule.path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.type === "allow")) best = rule;
  }
  return !best || best.type === "allow";
}

function extractAnchors(body, endpoint) {
  const anchors = [];
  for (const match of String(body || "").matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = cleanText(match[2]);
    if (!title || title.length < 4 || title.length > 240) continue;
    let url;
    try { url = new URL(decodeEntities(match[1]), endpoint).toString(); } catch { continue; }
    if (!/^https?:$/i.test(new URL(url).protocol)) continue;
    anchors.push({ title, url });
  }
  const seen = new Set();
  return anchors.filter((item) => {
    const key = `${item.title}\u0000${canonicalizeUrl(item.url)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractFeedEntries(body, endpoint) {
  const entries = [];
  const blockPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of String(body || "").matchAll(blockPattern)) {
    const block = match[2];
    const title = cleanText(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const linkMatch = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i) || block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    const rawUrl = linkMatch?.[1] || "";
    if (!title || !rawUrl) continue;
    try {
      entries.push({ title, url: new URL(decodeEntities(rawUrl.trim()), endpoint).toString() });
    } catch { /* Ignore malformed feed links. */ }
  }
  return entries.slice(0, MAX_SOURCE_CANDIDATES);
}

function sourceCandidates(body, endpoint, contentType) {
  const isFeed = /xml|rss|atom/i.test(contentType) || /<(rss|feed)\b/i.test(body);
  const entries = isFeed ? extractFeedEntries(body, endpoint) : extractAnchors(body, endpoint);
  return entries.filter((item) => OPPORTUNITY_WORDS.test(item.title)).slice(0, MAX_SOURCE_CANDIDATES);
}

function resolveKojinabiDate(year, month, day, fallbackYear, fallbackMonth) {
  const resolvedYear = Number(year) || Number(fallbackYear);
  const resolvedMonth = Number(month) || Number(fallbackMonth);
  const resolvedDay = Number(day);
  const iso = payPayDateToIso(resolvedYear, resolvedMonth, resolvedDay);
  return iso ? { iso, year: resolvedYear, month: resolvedMonth, day: resolvedDay } : null;
}

function parseKojinabiPeriod(title, publishedAt, now = new Date()) {
  const nowParts = currentJst(now);
  let publishedYear = nowParts.year;
  try {
    if (publishedAt) publishedYear = jstParts(publishedAt).year;
  } catch { /* Use the current JST year when an archive timestamp is malformed. */ }
  const normalized = normalizeSpace(title).replace(/[～〜]/g, "〜");
  const dateMatches = [...normalized.matchAll(/(?:(20\d{2})年)?\s*([01]?\d)月\s*([0-3]?\d)日/g)];
  const dates = dateMatches
    .map((match) => resolveKojinabiDate(match[1], match[2], match[3], publishedYear, nowParts.month))
    .filter(Boolean);
  let start = dates[0] || null;
  let end = null;

  const explicitEndMatches = [...normalized.matchAll(/〜\s*(?:(20\d{2})年)?\s*(?:(\d{1,2})月\s*)?([0-3]?\d)日[\d:\s時分]*まで/g)];
  const explicitEnd = explicitEndMatches.at(-1);
  if (explicitEnd && dateMatches[0] && dateMatches[0].index > explicitEnd.index) start = null;
  if (explicitEnd) {
    end = resolveKojinabiDate(
      explicitEnd[1],
      explicitEnd[2] || start?.month,
      explicitEnd[3],
      start?.year || publishedYear,
      start?.month || nowParts.month
    );
  }

  if (!end) {
    const rangeMatches = [...normalized.matchAll(/(?:(20\d{2})年)?\s*([01]?\d)月\s*([0-3]?\d)日[\d:\s時分]*〜\s*(?:(20\d{2})年)?\s*(?:(\d{1,2})月\s*)?([0-3]?\d)日/g)];
    const range = rangeMatches.at(-1);
    if (range) {
      end = resolveKojinabiDate(
        range[4],
        range[5] || range[2],
        range[6],
        start?.year || publishedYear,
        start?.month || nowParts.month
      );
    }
  }

  const ongoingCue = /開催中|実施中|配布中|販売中|提供中|配信中|毎月(?:配布|実施|開催)|毎週(?:配布|実施|開催)|週替わり|全国展開(?:開始|中)|(?:キャンペーン|セール)中|現在.*(?:実施|販売)/;
  const recurringCue = /毎月|毎週|毎日|週替わり/;
  const singleDayCue = /1日限定|一日限定|一日限り|当日限り/;
  const publishedDate = (() => {
    try { return publishedAt ? jstParts(publishedAt).date : ""; } catch { return ""; }
  })();
  if (!end && start && singleDayCue.test(normalized)) end = start;
  if (!end && start && !ongoingCue.test(normalized)) end = start;
  const today = nowParts.date;
  let active = Boolean(
    (start ? start.iso <= today : true) &&
    (end ? end.iso >= today : Boolean(start || ongoingCue.test(normalized)))
  );
  if (active && !end && !recurringCue.test(normalized)) {
    const referenceDate = start?.iso || publishedDate;
    const staleCutoff = dateOnlyUtc(today) - (KOJINABI_UNDATED_STALE_DAYS * DAY_MS);
    if (!referenceDate || dateOnlyUtc(referenceDate) < staleCutoff) active = false;
  }
  const formatDate = (value) => value ? `${value.month}/${value.day}` : "";
  const periodLabel = start && end
    ? `${formatDate(start)} 〜 ${formatDate(end)}`
    : start
      ? `${formatDate(start)} 〜`
      : end
        ? `〜 ${formatDate(end)}`
        : "公式ページで期間確認";
  return {
    active,
    recurring: recurringCue.test(normalized),
    startDate: start?.iso || null,
    endDate: end?.iso || null,
    endDateLabel: end ? "" : "公式ページで期限を確認",
    periodLabel: recurringCue.test(normalized) && !end ? "毎月開催（公式ページで期間確認）" : periodLabel
  };
}

export function parseKojinabiGourmetCampaigns(body, endpoint, now = new Date()) {
  const campaigns = [];
  const seen = new Set();
  const titlePattern = /<h2\b[^>]*class\s*=\s*["'][^"']*\bgrid-title\b[^"']*["'][^>]*>\s*<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/gi;
  for (const match of String(body || "").matchAll(titlePattern)) {
    const rawUrl = match[1] || match[2] || match[3] || "";
    const title = normalizeSpace(cleanText(match[4]).replace(/\bNew!\s*$/i, ""));
    if (!rawUrl || !title || title.length < 4) continue;
    let articleUrl;
    try { articleUrl = canonicalizeUrl(new URL(decodeEntities(rawUrl), endpoint).toString()); } catch { continue; }
    if (seen.has(articleUrl)) continue;
    seen.add(articleUrl);
    const nearbyHtml = String(body || "").slice(match.index, match.index + 3500);
    const publishedAt = nearbyHtml.match(/<time\b[^>]*datetime\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    const period = parseKojinabiPeriod(title, publishedAt, now);
    if (!period.active) continue;
    const displayTitle = period.recurring
      ? title.replace(/^【(?:20\d{2}年)?\d{1,2}月\d{1,2}日(?:～[^】]*)?】\s*/u, "")
      : title;
    campaigns.push({
      title: displayTitle.slice(0, 360),
      articleUrl,
      publishedAt,
      startDate: period.recurring && !period.endDate ? null : period.startDate,
      endDate: period.endDate,
      endDateLabel: period.endDateLabel,
      periodLabel: period.periodLabel
    });
  }
  return campaigns;
}

function discoverKojinabiCategoryPages(body, endpoint) {
  let endpointUrl;
  try { endpointUrl = new URL(endpoint); } catch { return [endpoint]; }
  const categoryPattern = /\/blog-category-21(?:-\d+)?\.html$/i;
  if (!categoryPattern.test(endpointUrl.pathname)) return [canonicalizeUrl(endpoint)];
  const urls = new Set([canonicalizeUrl(endpointUrl.toString())]);
  const pageCounts = [...String(body || "").matchAll(/pages\s*:\s*(\d+)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
  const pageCount = Math.min(Math.max(1, ...pageCounts), KOJINABI_MAX_CATEGORY_PAGES);
  const categoryRoot = endpointUrl.pathname.replace(/\.html$/i, "");
  for (let page = 1; page < pageCount; page += 1) {
    try { urls.add(canonicalizeUrl(new URL(`${categoryRoot}-${page}.html`, endpointUrl).toString())); } catch { /* 不正なページ番号は無視 */ }
  }
  const hrefPattern = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of String(body || "").matchAll(hrefPattern)) {
    const rawUrl = match[1] || match[2] || match[3] || "";
    try {
      const pageUrl = new URL(decodeEntities(rawUrl), endpointUrl);
      if (pageUrl.hostname !== endpointUrl.hostname || !categoryPattern.test(pageUrl.pathname)) continue;
      urls.add(canonicalizeUrl(pageUrl.toString()));
    } catch { /* ページ番号リンク以外は無視 */ }
  }
  return [...urls]
    .sort((left, right) => {
      const pageNumber = (value) => Number(value.match(/-(\d+)\.html$/i)?.[1] || 0);
      return pageNumber(left) - pageNumber(right);
    })
    .slice(0, KOJINABI_MAX_CATEGORY_PAGES);
}

function mergeKojinabiGourmetCampaigns(pages, now) {
  const campaignsByUrl = new Map();
  for (const page of pages) {
    for (const campaign of parseKojinabiGourmetCampaigns(page.body, page.endpoint, now)) {
      if (!campaignsByUrl.has(campaign.articleUrl)) campaignsByUrl.set(campaign.articleUrl, campaign);
    }
  }
  return [...campaignsByUrl.values()];
}

function isKojinabiSourceUrl(rawUrl) {
  try {
    const hostname = new URL(String(rawUrl)).hostname.toLowerCase();
    return hostname === "kojinabi.com" || hostname.endsWith(".kojinabi.com");
  } catch { return false; }
}

function pickKojinabiOfficialUrl(body, endpoint) {
  const links = [];
  const pattern = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let index = 0;
  for (const match of String(body || "").matchAll(pattern)) {
    const rawUrl = match[1] || match[2] || match[3] || "";
    let url;
    try { url = canonicalizeUrl(new URL(decodeEntities(rawUrl), endpoint).toString()); } catch { index += 1; continue; }
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol) || isKojinabiSourceUrl(url) || KOJINABI_BLOCKED_LINK_HOSTS.test(parsed.hostname)) {
      index += 1;
      continue;
    }
    const suspiciousParameter = [...parsed.searchParams.keys()].some((key) => /^(?:ref|referrer|affiliate|aff|click|redirect|source|utm_)/i.test(key));
    if (suspiciousParameter) { index += 1; continue; }
    const text = normalizeSpace(cleanText(match[4]));
    const score = (/(?:公式(?:サイト|ページ|情報)?|公式はこちら|公式リンク)/i.test(text) ? 100 : 0) +
      (/(?:キャンペーン|クーポン|ニュース|お知らせ|メニュー|店舗|特典|詳細)/i.test(text) ? 20 : 0);
    links.push({ url, score, index });
    index += 1;
  }
  links.sort((left, right) => right.score - left.score || left.index - right.index);
  return links[0]?.url || "";
}

async function fetchKojinabiOfficialLinks(campaigns, robotsBody, maxBytes) {
  const enriched = [];
  let bytes = 0;
  let fetchErrorCount = 0;
  let missingLinkCount = 0;
  for (const campaign of campaigns || []) {
    if (robotsBody && !robotsAllows(robotsBody, campaign.articleUrl)) {
      missingLinkCount += 1;
      continue;
    }
    try {
      const response = await fetchSafe(campaign.articleUrl, { maxBytes });
      bytes += Buffer.byteLength(response.body, "utf8");
      const officialUrl = pickKojinabiOfficialUrl(response.body, response.finalUrl);
      if (!officialUrl) {
        missingLinkCount += 1;
        continue;
      }
      enriched.push({ ...campaign, officialUrl });
    } catch {
      fetchErrorCount += 1;
    }
  }
  return { campaigns: enriched, bytes, fetchErrorCount, missingLinkCount };
}

function payPayDateToIso(year, month, day) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  if (!Number.isInteger(numericYear) || !Number.isInteger(numericMonth) || !Number.isInteger(numericDay)) return "";
  if (numericMonth < 1 || numericMonth > 12 || numericDay < 1 || numericDay > 31) return "";
  return `${String(numericYear).padStart(4, "0")}-${String(numericMonth).padStart(2, "0")}-${String(numericDay).padStart(2, "0")}`;
}

function payPayDateLabel(dateString, includeYear = true) {
  if (!dateString) return "";
  const [year, month, day] = String(dateString).split("-").map(Number);
  return includeYear ? `${year}/${month}/${day}` : `${month}/${day}`;
}

function parsePayPayPeriod(text) {
  const normalized = normalizeSpace(text).replace(/[.．]/g, "/").replace(/[～〜]/g, "〜");
  const startMatch = normalized.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!startMatch) return { startDate: "", endDate: null, periodLabel: "", note: normalized };
  const startYear = Number(startMatch[1]);
  const startMonth = Number(startMatch[2]);
  const startDay = Number(startMatch[3]);
  const startDate = payPayDateToIso(startYear, startMonth, startDay);
  const separatorIndex = normalized.indexOf("〜", startMatch.index + startMatch[0].length);
  if (separatorIndex < 0) {
    return { startDate, endDate: null, periodLabel: `${payPayDateLabel(startDate)} 〜`, note: "" };
  }
  const afterSeparator = normalized.slice(separatorIndex + 1).trim();
  const endMatch = afterSeparator.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})|(\d{1,2})\/(\d{1,2})/);
  if (!endMatch) {
    return { startDate, endDate: null, periodLabel: `${payPayDateLabel(startDate)} 〜`, note: afterSeparator };
  }
  let endYear = endMatch[1] ? Number(endMatch[1]) : startYear;
  const endMonth = Number(endMatch[2] || endMatch[4]);
  const endDay = Number(endMatch[3] || endMatch[5]);
  if (!endMatch[1] && (endMonth < startMonth || (endMonth === startMonth && endDay < startDay))) endYear += 1;
  const endDate = payPayDateToIso(endYear, endMonth, endDay);
  const note = normalizeSpace(afterSeparator.slice(endMatch.index + endMatch[0].length)).replace(/^[。、\s]+/, "");
  return {
    startDate,
    endDate: endDate || null,
    periodLabel: `${payPayDateLabel(startDate)} 〜 ${payPayDateLabel(endDate, endYear !== startYear)}`,
    note
  };
}

export function parsePayPayLocalCampaigns(body, endpoint, now = new Date()) {
  const today = currentJst(now).date;
  const campaigns = [];
  let region = "";
  let prefecture = "";
  let campaignType = "";
  const tokenPattern = /<(h[345]|table)\b[^>]*>[\s\S]*?<\/\1>/gi;
  for (const token of String(body || "").matchAll(tokenPattern)) {
    const tag = token[1].toLowerCase();
    const html = token[0];
    if (tag === "h3") { region = cleanText(html); prefecture = ""; campaignType = ""; continue; }
    if (tag === "h4") { prefecture = cleanText(html); campaignType = ""; continue; }
    if (tag === "h5") { campaignType = cleanText(html); continue; }
    for (const rowMatch of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
      const row = rowMatch[0];
      const headingHtml = row.match(/<th\b[^>]*>[\s\S]*?<\/th>/i)?.[0] || "";
      const cellHtml = row.match(/<td\b[^>]*>[\s\S]*?<\/td>/i)?.[0] || "";
      const hrefMatch = headingHtml.match(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
      const href = hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || "";
      if (!headingHtml || !cellHtml || !href) continue;
      const name = cleanText(headingHtml);
      const cellText = cleanText(cellHtml);
      if (!name || !cellText.startsWith("開催中")) continue;
      const period = parsePayPayPeriod(cellText.replace(/^開催中\s*/, ""));
      if (!period.startDate || period.startDate > today || (period.endDate && period.endDate < today)) continue;
      let officialUrl;
      try { officialUrl = canonicalizeUrl(new URL(decodeEntities(href), endpoint).toString()); } catch { continue; }
      campaigns.push({
        region: region || "その他",
        prefecture: prefecture || "その他",
        campaignType: campaignType || "地域キャンペーン",
        name,
        periodLabel: period.periodLabel,
        startDate: period.startDate,
        endDate: period.endDate,
        note: period.note,
        officialUrl
      });
    }
  }
  return campaigns;
}

function parsePayPayOfficialDetail(body) {
  const text = cleanText(body);
  const rates = [...text.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:％|%)\s*(?:付与|還元|戻ってくる)/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const perTransactionCaps = [...text.matchAll(/([0-9,]+)\s*ポイント／回/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
  const periodCaps = [...text.matchAll(/([0-9,]+)\s*ポイント／期間/g)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);
  return {
    ratePercent: rates.length ? Math.max(...rates) : null,
    perTransactionCapPoints: perTransactionCaps.length ? Math.max(...perTransactionCaps) : null,
    periodCapPoints: periodCaps.length ? Math.max(...periodCaps) : null
  };
}

async function fetchPayPayRecommendationDetails(campaigns, robotsBody) {
  const pointCampaigns = (campaigns || []).filter((campaign) => campaign.campaignType === "ポイント還元キャンペーン");
  const details = [];
  for (const campaign of pointCampaigns) {
    if (robotsBody && !robotsAllows(robotsBody, campaign.officialUrl)) {
      details.push({ ...campaign, detailStatus: "blocked-by-robots" });
      continue;
    }
    try {
      const response = await fetchSafe(campaign.officialUrl);
      const parsed = parsePayPayOfficialDetail(response.body);
      details.push({
        ...campaign,
        ...parsed,
        detailStatus: "verified",
        detailHttpStatus: response.status,
        detailContentHash: crypto.createHash("sha256").update(response.body).digest("hex").slice(0, 16)
      });
    } catch (error) {
      details.push({ ...campaign, detailStatus: "detail-fetch-failed", detailReason: error.message });
    }
  }
  return details;
}

async function fetchSource(source, { now = new Date() } = {}) {
  const endpoint = source.endpoints?.[0] || source.url;
  const result = { id: source.id, name: source.name, endpoint, method: source.fetchMethod || "html", status: "failed", candidateCount: 0, bytes: 0 };
  try {
    const robots = await fetchSafe(source.robotsUrl, { acceptStatuses: [404] });
    result.robotsStatus = robots.status;
    if (robots.status !== 404 && !robotsAllows(robots.body, endpoint)) {
      result.reason = "robots.txtで対象一覧が拒否されています";
      result.status = "blocked-by-robots";
      return { ...result, candidates: [], localCampaigns: [], gourmetCampaigns: [], paypayRecommendationCandidates: [], signalText: "" };
    }
    const requestedMaxBytes = Number(source.maxResponseBytes);
    const maxBytes = Number.isFinite(requestedMaxBytes) && requestedMaxBytes > 0
      ? Math.min(requestedMaxBytes, 8_000_000)
      : MAX_RESPONSE_BYTES;
    const response = await fetchSafe(endpoint, { maxBytes });
    const candidates = sourceCandidates(response.body, response.finalUrl, response.contentType);
    const localCampaigns = source.parser === PAYPAY_LOCAL_PARSER
      ? parsePayPayLocalCampaigns(response.body, response.finalUrl, now)
      : [];
    let gourmetCampaigns = [];
    let gourmetPageCount = 0;
    let gourmetPageErrorCount = 0;
    let gourmetOfficialLinkFetchErrorCount = 0;
    let gourmetOfficialLinkMissingCount = 0;
    if (source.parser === KOJINABI_GOURMET_PARSER) {
      const gourmetPages = [{ body: response.body, endpoint: response.finalUrl }];
      const pageUrls = discoverKojinabiCategoryPages(response.body, response.finalUrl);
      for (const pageUrl of pageUrls.slice(1)) {
        if (robots.body && !robotsAllows(robots.body, pageUrl)) {
          gourmetPageErrorCount += 1;
          continue;
        }
        try {
          const pageResponse = await fetchSafe(pageUrl, { maxBytes });
          gourmetPages.push({ body: pageResponse.body, endpoint: pageResponse.finalUrl });
          result.bytes += Buffer.byteLength(pageResponse.body, "utf8");
        } catch {
          gourmetPageErrorCount += 1;
        }
      }
      gourmetPageCount = gourmetPages.length;
      const discoveredGourmetCampaigns = mergeKojinabiGourmetCampaigns(gourmetPages, now);
      const officialLinkResult = await fetchKojinabiOfficialLinks(discoveredGourmetCampaigns, robots.body, maxBytes);
      gourmetCampaigns = officialLinkResult.campaigns;
      result.bytes += officialLinkResult.bytes;
      gourmetOfficialLinkFetchErrorCount = officialLinkResult.fetchErrorCount;
      gourmetOfficialLinkMissingCount = officialLinkResult.missingLinkCount;
      result.gourmetPageCount = gourmetPageCount;
      result.gourmetPageErrorCount = gourmetPageErrorCount;
      result.gourmetDiscoveredCount = discoveredGourmetCampaigns.length;
      result.gourmetOfficialLinkCount = gourmetCampaigns.length;
      result.gourmetOfficialLinkFetchErrorCount = gourmetOfficialLinkFetchErrorCount;
      result.gourmetOfficialLinkMissingCount = gourmetOfficialLinkMissingCount;
    }
    const paypayRecommendationCandidates = source.parser === PAYPAY_LOCAL_PARSER
      ? await fetchPayPayRecommendationDetails(localCampaigns, robots.body)
      : [];
    result.status = "success";
    result.finalUrl = response.finalUrl;
    result.httpStatus = response.status;
    result.contentType = response.contentType;
    result.bytes += Buffer.byteLength(response.body, "utf8");
    result.candidateCount = source.parser === KOJINABI_GOURMET_PARSER
      ? gourmetCampaigns.length
      : source.parser === PAYPAY_LOCAL_PARSER
        ? localCampaigns.length
        : candidates.length;
    result.paypayDetailCount = paypayRecommendationCandidates.filter((candidate) => candidate.detailStatus === "verified").length;
    return {
      ...result,
      candidates,
      localCampaigns,
      gourmetCampaigns,
      paypayRecommendationCandidates,
      officialBody: source.parser === PAYPAY_LOCAL_PARSER ? response.body : null,
      officialStatus: response.status,
      signalText: cleanText(response.body).slice(0, 500_000)
    };
  } catch (error) {
    result.reason = error.message;
    return { ...result, candidates: [], localCampaigns: [], gourmetCampaigns: [], paypayRecommendationCandidates: [], signalText: "" };
  }
}

function sourceMatchesDeal(deal, sourceResults) {
  if (deal.alwaysInclude) return true;
  const terms = (deal.discoveryTerms || []).map((term) => String(term).toLowerCase()).filter(Boolean);
  return sourceResults.some((result) => {
    if (result.status !== "success") return false;
    if (deal.sourceIds?.length && !deal.sourceIds.includes(result.id)) return false;
    return terms.some((term) => result.signalText.toLowerCase().includes(term));
  });
}

export function summarizeSourceResults(sourceResults, { offline = false } = {}) {
  const results = sourceResults || [];
  const successfulSourceCount = results.filter((result) => result.status === "success").length;
  return {
    sourceCount: results.length,
    successfulSourceCount,
    allSourcesFailed: !offline && results.length > 0 && successfulSourceCount === 0
  };
}

function dealIdentity(deal) {
  const official = deal.canonicalizedOfficialUrl || (deal.officialUrl ? canonicalizeUrl(deal.officialUrl) : "");
  const semantic = [deal.campaignName, deal.merchant, deal.benefit, deal.startDate, deal.endDate].map(normalizeSpace).join("|").toLowerCase();
  return official || semantic;
}

export function dedupeDeals(deals) {
  const selected = new Map();
  for (const deal of deals || []) {
    const key = dealIdentity(deal);
    if (!key) continue;
    const previous = selected.get(key);
    if (!previous || scoreTotal(deal) > scoreTotal(previous)) selected.set(key, deal);
  }
  return [...selected.values()];
}

function scoreTotal(deal) {
  return Object.values(deal.score || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function selectDeals(deals, { maxDeals = DEFAULT_MAX_DEALS, now = new Date() } = {}) {
  return dedupeDeals(deals)
    .filter((deal) => isActiveDeal(deal, now))
    .sort((left, right) => {
      const scoreDifference = scoreTotal(right) - scoreTotal(left);
      if (scoreDifference) return scoreDifference;
      const leftRemaining = daysRemaining(left.endDate, now) ?? 9999;
      const rightRemaining = daysRemaining(right.endDate, now) ?? 9999;
      return leftRemaining - rightRemaining || String(left.campaignName).localeCompare(String(right.campaignName), "ja");
    })
    .slice(0, maxDeals);
}

async function verifyOfficialDeal(deal, cache, { offline = false, now, previousDeal, preloadedBody = null, preloadedStatus = null } = {}) {
  const officialUrl = deal.officialUrl;
  let canonicalizedOfficialUrl;
  try {
    canonicalizedOfficialUrl = canonicalizeUrl(officialUrl);
    await assertSafePublicUrl(canonicalizedOfficialUrl, { resolveDns: !offline });
  } catch (error) {
    return { ok: false, status: "unsafe-url", reason: error.message };
  }
  if (cache.has(canonicalizedOfficialUrl)) return cache.get(canonicalizedOfficialUrl);
  if (deal.verificationMode === "source-listing") {
    const result = { ok: true, status: "source-listing", canonicalizedOfficialUrl, checkedAt: now.iso };
    cache.set(canonicalizedOfficialUrl, result);
    return result;
  }
  if (offline) {
    const result = { ok: true, status: "offline-approved", canonicalizedOfficialUrl, checkedAt: now.iso };
    cache.set(canonicalizedOfficialUrl, result);
    return result;
  }
  if (preloadedBody !== null && preloadedBody !== undefined) {
    const body = cleanText(preloadedBody);
    const required = deal.officialChecks?.requiredPhrases || [];
    const missing = required.filter((phrase) => !body.includes(String(phrase)));
    const result = {
      ok: missing.length === 0,
      status: missing.length === 0 ? "verified-from-source" : "missing-required-phrase",
      reason: missing.length ? `公式ページで確認できない語句: ${missing.join("、")}` : "",
      canonicalizedOfficialUrl,
      checkedAt: now.iso,
      httpStatus: preloadedStatus || 200,
      contentHash: crypto.createHash("sha256").update(preloadedBody).digest("hex").slice(0, 16)
    };
    cache.set(canonicalizedOfficialUrl, result);
    return result;
  }
  try {
    const response = await fetchSafe(canonicalizedOfficialUrl);
    const body = cleanText(response.body);
    const required = deal.officialChecks?.requiredPhrases || [];
    const missing = required.filter((phrase) => !body.includes(String(phrase)));
    const result = {
      ok: missing.length === 0,
      status: missing.length === 0 ? "verified" : "missing-required-phrase",
      reason: missing.length ? `公式ページで確認できない語句: ${missing.join("、")}` : "",
      canonicalizedOfficialUrl,
      checkedAt: now.iso,
      httpStatus: response.status,
      contentHash: crypto.createHash("sha256").update(response.body).digest("hex").slice(0, 16)
    };
    cache.set(canonicalizedOfficialUrl, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      status: "official-fetch-failed",
      reason: error.message,
      canonicalizedOfficialUrl,
      checkedAt: now.iso,
      staleAllowed: Boolean(previousDeal)
    };
    cache.set(canonicalizedOfficialUrl, result);
    return result;
  }
}

function publicLocalRecommendation(campaign) {
  return {
    region: campaign.region || "その他",
    prefecture: campaign.prefecture || "その他",
    campaignType: campaign.campaignType || "地域キャンペーン",
    name: campaign.name || "自治体キャンペーン",
    periodLabel: campaign.periodLabel || "期間は公式ページで確認",
    startDate: campaign.startDate || null,
    endDate: campaign.endDate || null,
    note: campaign.note || "",
    officialUrl: campaign.officialUrl || "",
    recommendationReason: campaign.recommendationReason || "",
    ratePercent: Number.isFinite(campaign.ratePercent) ? campaign.ratePercent : null,
    perTransactionCapPoints: Number.isFinite(campaign.perTransactionCapPoints) ? campaign.perTransactionCapPoints : null,
    periodCapPoints: Number.isFinite(campaign.periodCapPoints) ? campaign.periodCapPoints : null
  };
}

function comparableLocalRecommendations(campaigns) {
  return (campaigns || []).map((campaign) => publicLocalRecommendation(campaign));
}

function publicDeal(deal) {
  const categorizedDeal = withMonetizationCategory(deal);
  const canonicalizedOfficialUrl = categorizedDeal.canonicalizedOfficialUrl || canonicalizeUrl(categorizedDeal.officialUrl);
  const localRecommendations = Array.isArray(categorizedDeal.localRecommendations) ? comparableLocalRecommendations(categorizedDeal.localRecommendations) : null;
  return {
    id: categorizedDeal.id,
    title: categorizedDeal.campaignName,
    merchant: categorizedDeal.merchant,
    service: categorizedDeal.service,
    benefitShort: categorizedDeal.benefitShort,
    benefit: categorizedDeal.benefit,
    condition: categorizedDeal.condition,
    target: categorizedDeal.target,
    action: categorizedDeal.action,
    startDate: categorizedDeal.startDate,
    endDate: categorizedDeal.endDate || null,
    endDateLabel: categorizedDeal.endDateLabel || "",
    applicationRequired: Boolean(categorizedDeal.applicationRequired),
    officialUrl: canonicalizedOfficialUrl,
    canonicalizedOfficialUrl,
    category: categorizedDeal.category || "other",
    monetizationCategory: categorizedDeal.monetizationCategory,
    note: categorizedDeal.note || "",
    maruComment: categorizedDeal.maruComment || "",
    ...(categorizedDeal.linkLabel ? { linkLabel: categorizedDeal.linkLabel } : {}),
    ...(categorizedDeal.verificationLabel ? { verificationLabel: categorizedDeal.verificationLabel } : {}),
    ...(categorizedDeal.dynamicType ? { dynamicType: categorizedDeal.dynamicType } : {}),
    ...(categorizedDeal.dynamicSourceId ? { dynamicSourceId: categorizedDeal.dynamicSourceId } : {}),
    ...(Number.isFinite(categorizedDeal.localCampaignTotal) ? { localCampaignTotal: categorizedDeal.localCampaignTotal } : {}),
    ...(localRecommendations ? { localRecommendations } : {})
  };
}

function comparableDeals(deals) {
  return (deals || []).map((deal) => ({
    id: deal.id,
    title: deal.title,
    merchant: deal.merchant,
    service: deal.service,
    benefitShort: deal.benefitShort,
    benefit: deal.benefit,
    condition: deal.condition,
    target: deal.target,
    action: deal.action,
    startDate: deal.startDate,
    endDate: deal.endDate,
    endDateLabel: deal.endDateLabel,
    applicationRequired: deal.applicationRequired,
    officialUrl: deal.officialUrl,
    canonicalizedOfficialUrl: deal.canonicalizedOfficialUrl,
    category: deal.category,
    monetizationCategory: deal.monetizationCategory || classifyMonetizationCategory(deal),
    note: deal.note,
    maruComment: deal.maruComment,
    linkLabel: deal.linkLabel,
    verificationLabel: deal.verificationLabel,
    dynamicType: deal.dynamicType,
    dynamicSourceId: deal.dynamicSourceId,
    localCampaignTotal: deal.localCampaignTotal,
    localRecommendations: comparableLocalRecommendations(deal.localRecommendations)
  }));
}

function makePageState(previous, deals, now, siteUrl, contentChanged) {
  const parts = jstParts(now);
  const previousTitleMonth = previous?.titleYearMonth ? `${previous.titleYearMonth.year}-${previous.titleYearMonth.month}` : "";
  const currentTitleMonth = `${parts.year}-${parts.month}`;
  const monthChanged = previousTitleMonth !== currentTitleMonth;
  const modified = contentChanged || monthChanged || !previous?.contentModifiedAt ? now.iso : previous.contentModifiedAt;
  return {
    schemaVersion: 1,
    canonicalUrl: `${siteUrl}/otoku/`,
    publishedAt: previous?.publishedAt || now.iso,
    checkedAt: now.iso,
    contentModifiedAt: modified,
    titleYearMonth: { year: parts.year, month: parts.month },
    deals: deals.map(publicDeal),
    dealCount: deals.length
  };
}

function formatEndDate(deal, now) {
  if (!deal.endDate) return deal.endDateLabel || "終了日未定";
  const [year, month, day] = deal.endDate.split("-").map(Number);
  const remaining = daysRemaining(deal.endDate, now);
  const dateLabel = `${month}月${day}日まで`;
  if (remaining !== null && remaining >= 0 && remaining <= 7) return `${dateLabel}（あと${remaining}日）`;
  return dateLabel;
}

function categoryMeta(category) {
  return {
    cashless: { label: "キャッシュレス", icon: "💳" },
    point: { label: "ポイント", icon: "🎁" },
    shopping: { label: "買い物・サービス", icon: "🛍️" },
    food: { label: "食費・外食", icon: "🍴" },
    travel: { label: "旅行", icon: "✈️" },
    finance: { label: "金融", icon: "📈" },
    coupon: { label: "クーポン", icon: "🎟️" },
    telecom: { label: "通信", icon: "📶" },
    other: { label: "その他", icon: "•" }
  }[category] || { label: "その他", icon: "•" };
}

function renderCategoryGuide(deals) {
  const categories = [...new Set((deals || []).map((deal) => deal.category || "other"))];
  if (!categories.length) return "";
  return `
          <div class="otoku-category-guide" aria-label="掲載ジャンル"><span class="otoku-category-guide__label">ジャンル</span>${categories.map((category) => {
    const meta = categoryMeta(category);
    return `<span class="otoku-category-chip otoku-category-chip--${escapeHtml(category)}"><span class="otoku-category-chip__icon" aria-hidden="true">${meta.icon}</span>${escapeHtml(meta.label)}</span>`;
  }).join("")}</div>`;
}

function renderAffiliateScript(runtime) {
  if (!runtime?.a8?.enabled) return "";
  if (runtime.a8.scriptTag) return `    ${runtime.a8.scriptTag}`;
  if (runtime.a8.scriptUrl) return `    <script src="${escapeHtml(runtime.a8.scriptUrl)}"></script>`;
  return "";
}

function renderAffiliateDisclosure(runtime) {
  if (!runtime?.disclosureRequired) return "";
  return `
          <p class="otoku-affiliate-disclosure" role="note">当ページにはアフィリエイト広告を含む場合があります。掲載情報の条件・内容は、必ず各公式ページで確認してください。</p>`;
}

function renderAffiliateOfferCard(offer, placement) {
  if (!offer?.url) return "";
  const safeId = String(offer.id || "offer").replace(/[^a-z0-9_-]/gi, "-");
  const categoryLabel = MONETIZATION_CATEGORY_LABELS[offer.category] || "関連情報";
  return `
           <aside class="otoku-revenue-card" aria-labelledby="affiliate-offer-${escapeHtml(safeId)}-title">
             <div class="otoku-revenue-card__top"><span class="otoku-revenue-card__category">${escapeHtml(categoryLabel)}に関連</span></div>
             <h2 id="affiliate-offer-${escapeHtml(safeId)}-title">${escapeHtml(offer.title)}</h2>
             <p>${escapeHtml(offer.description)}</p>
             <a class="button button--primary otoku-revenue-card__link" href="${escapeHtml(offer.url)}" target="_blank" rel="noopener noreferrer sponsored" data-affiliate-offer-id="${escapeHtml(offer.id)}" data-affiliate-category="${escapeHtml(offer.category)}" data-affiliate-provider="${escapeHtml(offer.provider)}" data-affiliate-placement="${escapeHtml(placement)}">${escapeHtml(offer.buttonLabel)} <span aria-hidden="true">↗</span></a>
          </aside>`;
}

function renderAmazonSaleCard(amazon) {
  if (!amazon?.enabled || !amazon.url) return "";
  const affiliateAttributes = amazon.isAffiliate
    ? ` <span class="otoku-amazon-card__pr">${escapeHtml(amazon.disclosure || "PR")}</span>`
    : "";
  const affiliateRel = amazon.isAffiliate ? "noopener noreferrer sponsored" : "noopener noreferrer";
  return `
          <aside class="otoku-amazon-card" aria-labelledby="amazon-sale-title">
            <div class="otoku-amazon-card__copy"><p class="eyebrow eyebrow--yellow">AMAZON SALE</p><h2 id="amazon-sale-title">Amazon 今日のセールをチェック</h2><p>タイムセール・キャンペーン開催中の商品をチェック</p></div>
            <div class="otoku-amazon-card__action">${affiliateAttributes}<a class="button button--yellow" href="${escapeHtml(amazon.url)}" target="_blank" rel="${affiliateRel}" data-amazon-sale-click="true">Amazonで今日のお得を見る <span aria-hidden="true">→</span></a></div>
          </aside>`;
}

function renderAffiliateOfferSection(offers) {
  if (!offers?.length) return "";
  return `
          <section class="otoku-affiliate-section" aria-labelledby="affiliate-offers-title">
            <div class="otoku-affiliate-section__heading"><p class="eyebrow eyebrow--red">OFFICIAL SERVICES</p><h2 id="affiliate-offers-title">公式サービスも<br /><span>チェック。</span></h2><p class="otoku-affiliate-section__description"><span class="otoku-affiliate-section__pr">PR</span> 通信・買い物・飲食・旅行・暮らしに関するサービスを、公式ページで確認できます。条件や料金はリンク先で必ず確認してください。</p></div>
            <div class="otoku-affiliate-grid">${offers.map((offer, index) => renderAffiliateOfferCard(offer, `official-service-${index + 1}`)).join("")}
            </div>
          </section>`;
}

function renderPayPayLocalRecommendations(recommendations, totalActive, officialListUrl) {
  const formatPoints = (value) => Number.isFinite(value) ? `${value.toLocaleString("ja-JP")}ポイント` : "公式詳細で確認";
  return `
              <section class="deal-card__local-campaigns" aria-labelledby="paypay-recommendations-title">
                <div class="deal-card__local-heading"><span class="deal-card__local-kicker">おすすめ地域</span><strong id="paypay-recommendations-title">開催中${escapeHtml(totalActive)}自治体からイチオシ${escapeHtml(recommendations.length)}件</strong></div>
                <p class="deal-card__local-intro">還元率・期間あたりの上限を公式詳細で比較して選んでいます。全自治体の開催状況と対象店舗は、PayPay公式一覧で確認してください。</p>
                <ol class="paypay-local-list">
                  ${(recommendations || []).map((campaign) => {
                    const link = /^https?:\/\//i.test(campaign.officialUrl || "")
                      ? `<a href="${escapeHtml(campaign.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(campaign.name)}</a>`
                      : escapeHtml(campaign.name);
                    const facts = [
                      Number.isFinite(campaign.ratePercent) ? `最大${campaign.ratePercent}%還元` : "還元率は公式詳細で確認",
                      Number.isFinite(campaign.periodCapPoints) ? `期間上限${formatPoints(campaign.periodCapPoints)}` : "上限は公式詳細で確認"
                    ];
                    return `<li class="paypay-local-list__item"><div class="paypay-local-list__heading"><span>${link}</span><small>${escapeHtml(campaign.prefecture || campaign.region || "")}</small></div><div class="paypay-local-list__facts"><span>${escapeHtml(facts.join("／"))}</span><span>${escapeHtml(campaign.periodLabel || "期間は公式詳細で確認")}</span></div><p class="paypay-local-list__reason">${escapeHtml(campaign.recommendationReason || "公式詳細を確認できる開催中のポイント還元キャンペーン")}</p></li>`;
                  }).join("")}
                </ol>
                <a class="paypay-local-list__all" href="${escapeHtml(officialListUrl)}" target="_blank" rel="noopener noreferrer">開催中の全自治体・詳しい条件を公式一覧で確認 <span aria-hidden="true">↗</span></a>
              </section>`.replace(/[ \t]+$/gm, "");
}

function renderDealCard(deal, now, closingSoonDays = 7) {
  const remaining = daysRemaining(deal.endDate, now);
  const isClosingSoon = remaining !== null && remaining >= 0 && remaining <= closingSoonDays;
  const category = categoryMeta(deal.category);
  const application = deal.applicationRequired ? "要エントリー" : "エントリー不要";
  const localRecommendations = Array.isArray(deal.localRecommendations) && deal.localRecommendations.length ? deal.localRecommendations : null;
  return `
            <article class="deal-card deal-card--${escapeHtml(deal.category)}${localRecommendations ? " deal-card--paypay-local" : ""}${isClosingSoon ? " deal-card--closing-soon" : ""}">
              <div class="deal-card__top"><span class="deal-card__category"><span class="deal-card__category-icon" aria-hidden="true">${category.icon}</span>${escapeHtml(category.label)}</span>${isClosingSoon ? `<span class="deal-card__closing">まもなく終了</span>` : ""}</div>
              <h3>${escapeHtml(deal.title)}</h3>
              <p class="deal-card__benefit">${escapeHtml(deal.benefitShort)}</p>
              <dl class="deal-card__facts">
                <div><dt>対象</dt><dd>${escapeHtml(deal.target)}</dd></div>
                <div><dt>やること</dt><dd>${escapeHtml(deal.action)}</dd></div>
                <div><dt>期限</dt><dd><strong>${escapeHtml(formatEndDate(deal, now))}</strong><span>${escapeHtml(application)}</span></dd></div>
              </dl>
              ${localRecommendations ? renderPayPayLocalRecommendations(localRecommendations, deal.localCampaignTotal || localRecommendations.length, deal.officialUrl) : ""}
              <details class="deal-card__details"><summary>条件・注意点を読む</summary><p><strong>条件：</strong>${escapeHtml(deal.condition)}</p>${deal.note ? `<p><strong>注意：</strong>${escapeHtml(deal.note)}</p>` : ""}</details>
              ${deal.maruComment ? `<p class="deal-card__maru"><span>まるのひとこと</span>${escapeHtml(deal.maruComment)}</p>` : ""}
              <div class="deal-card__footer"><a class="button button--primary" href="${escapeHtml(deal.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(deal.linkLabel || "公式ページを見る")} <span aria-hidden="true">↗</span></a><span class="deal-card__official-label">${escapeHtml(deal.verificationLabel || "公式情報を確認済み")}</span></div>
            </article>`;
}

function renderClosingSoon(deals, now, closingSoonDays) {
  const closing = deals.filter((deal) => {
    const remaining = daysRemaining(deal.endDate, now);
    return remaining !== null && remaining >= 0 && remaining <= closingSoonDays;
  });
  if (!closing.length) return "";
  return `
        <section class="otoku-section otoku-section--closing" aria-labelledby="closing-title">
          <div class="otoku-section__heading"><p class="eyebrow eyebrow--red">DON'T MISS IT</p><h2 id="closing-title">まもなく終了</h2></div>
          <p class="otoku-section__intro">期限が近いものは、条件を確認してから早めに判断しよ。無理な申込みは不要です。</p>
          <div class="deal-grid">${closing.map((deal) => renderDealCard(deal, now, closingSoonDays)).join("\n")}</div>
        </section>`;
}

function renderRankedDealSection(deals, now, closingSoonDays, { id, eyebrow, title, titleSpan, intro }) {
  const regularDeals = deals.filter((deal) => {
    const remaining = daysRemaining(deal.endDate, now);
    return !(remaining !== null && remaining >= 0 && remaining <= closingSoonDays);
  });
  if (!regularDeals.length) return "";
  return `
          <section class="otoku-section" id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--yellow">${escapeHtml(eyebrow)}</p><h2 id="${escapeHtml(id)}-title">${escapeHtml(title)}<br /><span>${escapeHtml(titleSpan)}</span></h2></div><p class="otoku-section__intro">${escapeHtml(intro)}</p><div class="deal-grid">${regularDeals.map((deal) => renderDealCard(deal, now, closingSoonDays)).join("\n")}</div></section>`;
}

function renderStructuredData(state, siteUrl) {
  const image = `${siteUrl}/ワクワクFIREトップ画像.png`;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: monthTitle(new Date(state.checkedAt)),
    description: metaDescription(new Date(state.checkedAt)),
    image: [image],
    datePublished: state.publishedAt,
    dateModified: state.contentModifiedAt,
    author: { "@type": "Organization", name: "ワクワクFIRE" },
    publisher: { "@type": "Organization", name: "ワクワクFIRE" },
    articleSection: "ポイ活・お得情報",
    keywords: ["ポイ活", "ポイント還元", "キャッシュレス", "キャンペーン", "クーポン"],
    mainEntityOfPage: { "@type": "WebPage", "@id": state.canonicalUrl }
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "今日・今週のお得情報",
    itemListElement: state.deals.map((deal, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: deal.title,
      url: deal.officialUrl
    }))
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "今日・今週のお得情報", item: state.canonicalUrl }
    ]
  };
  return [article, itemList, breadcrumb].map((value) => `<script type="application/ld+json">\n${escapeJsonForHtml(value)}\n    </script>`).join("\n");
}

export function renderPage(state, { siteUrl = DEFAULT_SITE_URL, now = new Date(), closingSoonDays = 7, affiliateRuntime = null } = {}) {
  const title = monthTitle(now);
  const description = metaDescription(now);
  const lastChecked = japaneseDateTime(state.checkedAt);
  const pageDeals = state.deals || [];
  const runtime = affiliateRuntime || buildAffiliateRuntime();
  const selectedAffiliateOffers = selectAffiliateOffers(pageDeals, runtime.offers || [], {
    now,
    maxOffers: 7,
    requireMatchingCategory: false,
    onePerCategory: false
  });
  const payPayDeals = pageDeals.filter((deal) => deal.dynamicType === PAYPAY_LOCAL_DYNAMIC_TYPE);
  const rankedDeals = pageDeals.filter((deal) => deal.dynamicType !== PAYPAY_LOCAL_DYNAMIC_TYPE);
  const featuredDeals = rankedDeals.slice(0, FEATURED_DEAL_COUNT);
  const additionalDeals = [...rankedDeals.slice(FEATURED_DEAL_COUNT), ...payPayDeals];
  const splitIntoTwoSections = additionalDeals.length > 0;
  const amazonCard = renderAmazonSaleCard(runtime.amazon);
  const affiliateOffersSection = renderAffiliateOfferSection(selectedAffiliateOffers);
  const featuredSection = pageDeals.length ? renderRankedDealSection(
    featuredDeals,
    now,
    closingSoonDays,
    splitIntoTwoSections
      ? { id: "check-now", eyebrow: "TOP 10 PICKS", title: "まず見たい", titleSpan: "お得情報。", intro: "条件のわかりやすさ・対象者の広さ・期限の余裕も見て、まず確認したい10件を並べています。" }
      : { id: "check-now", eyebrow: "CHECK NOW", title: "今チェックしたい", titleSpan: "お得情報。", intro: "還元率だけでなく、条件のわかりやすさ・使いやすさ・期限の余裕も見て並べています。申し込む前に、必ず公式ページの最新条件を確認してください。" }
  ) : `
          <section class="otoku-section" id="check-now" aria-labelledby="check-now-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--yellow">CHECK NOW</p><h2 id="check-now-title">今チェックしたい<br /><span>お得情報。</span></h2></div><div class="otoku-empty"><strong>今日は掲載できる案件を確認中です。</strong><p>条件や期限を確認できない案件で、水増しはしていません。次回の確認をお待ちください。</p></div></section>`;
  const additionalSection = splitIntoTwoSections ? renderRankedDealSection(
    additionalDeals,
    now,
    closingSoonDays,
    { id: "more-deals", eyebrow: "MORE TO CHECK", title: "ほかにもある", titleSpan: "お得情報。", intro: "上位10件以外から、条件が合う人には使いやすい案件を追加で掲載しています。" }
  ) : "";
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
${renderAffiliateScript(runtime)}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#ea3e31" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ja_JP" />
    <meta property="og:site_name" content="ワクワクFIRE" />
    <meta property="og:title" content="${escapeHtml(`${title}｜ワクワクFIRE`)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(state.canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(`${siteUrl}/ワクワクFIREトップ画像.png`)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(`${title}｜ワクワクFIRE`)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(`${siteUrl}/ワクワクFIREトップ画像.png`)}" />
    <meta property="article:published_time" content="${escapeHtml(state.publishedAt)}" />
    <meta property="article:modified_time" content="${escapeHtml(state.contentModifiedAt)}" />
    <meta property="article:section" content="ポイ活・お得情報" />
    <meta property="article:tag" content="ポイ活" />
    <meta property="article:tag" content="ポイント還元" />
    <meta property="article:tag" content="キャッシュレス" />
    <link rel="canonical" href="${escapeHtml(state.canonicalUrl)}" />
    <link rel="icon" href="../favicon.ico?v=20260826" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png?v=20260826" />
    <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png?v=20260826" />
    <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png?v=20260826" />
    <link rel="stylesheet" href="../style.css" />
    <title>${escapeHtml(`${title}｜ワクワクFIRE`)}</title>
${renderStructuredData(state, siteUrl)}
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9422971410274449" crossorigin="anonymous"></script>
  </head>
  <body class="page-shell otoku-shell">
    <a class="skip-link" href="#main-content">本文へ移動</a>
    <header class="site-header" id="top">
      <div class="container site-header__inner">
        <a class="brand" href="../" aria-label="ワクワクFIRE トップへ戻る"><span class="brand__mark" aria-hidden="true">W</span><span class="brand__text">ワクワク<span>FIRE</span></span></a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle__line"></span><span class="nav-toggle__line"></span><span class="nav-toggle__label">メニュー</span></button>
        <nav class="site-nav" id="site-nav" aria-label="メインメニュー">
          <a href="../">ホーム</a><a href="../#contents">楽しいコンテンツ</a><a href="./">今日のお得</a><a href="../articles/">FIREコラム</a><a href="../#about">ワクワクFIREとは</a><a class="site-nav__cta" href="#check-now">案件を見る <span aria-hidden="true">↘</span></a>
        </nav>
      </div>
    </header>
    <main id="main-content" class="site-page-main">
      <div class="container otoku-layout">
        <nav class="breadcrumbs" aria-label="パンくずリスト"><a href="../">ホーム</a><span aria-hidden="true">/</span><span aria-current="page">今日・今週のお得情報</span></nav>
        <article class="otoku-page">
          <header class="otoku-hero">
            <div class="otoku-hero__copy"><p class="eyebrow eyebrow--red">OTOKU / POI KATSU</p><h1>${escapeHtml(title)}</h1><p class="otoku-hero__lead">今日見つけても、まだ間に合う。<br /><strong>数日〜数週間使えるお得情報</strong>を、公式ページで確認してまとめています。</p></div>
            <div class="otoku-hero__sticker" aria-hidden="true"><span>毎日</span><strong>朝6時</strong><small>更新</small></div>
          </header>
          <div class="otoku-meta"><span>最終確認</span><time datetime="${escapeHtml(state.checkedAt)}">${escapeHtml(lastChecked)}（日本時間）</time><span class="otoku-meta__status">${pageDeals.length}件掲載</span></div>
${renderAffiliateDisclosure(runtime)}
${renderCategoryGuide(pageDeals)}
${featuredSection}
${additionalSection}
${amazonCard}
${affiliateOffersSection}
${renderClosingSoon(pageDeals, now, closingSoonDays)}
          <section class="otoku-section otoku-section--care" aria-labelledby="care-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--red">TAKE IT EASY</p><h2 id="care-title">ポイ活で無理しすぎない<br /><span>ために。</span></h2></div><div class="otoku-care-grid"><div class="otoku-care-card"><span aria-hidden="true">01</span><h3>使う予定のお金だけ</h3><p>ポイントのために、いらない買い物や契約を増やさない。先に使い道を決めると、ポイ活に振り回されにくいで。</p></div><div class="otoku-care-card"><span aria-hidden="true">02</span><h3>条件は最後まで読む</h3><p>エントリー、対象カード、最低利用額、付与時期、解約条件。お得そうな数字だけで判断せず、公式の注意事項まで確認しよ。</p></div><div class="otoku-care-card"><span aria-hidden="true">03</span><h3>投資案件は別もの</h3><p>元本が必要な金融・投資案件は、ポイント還元とは別にリスクがあります。ポイントのためだけに投資する必要はありません。</p></div></div><div class="otoku-disclaimer"><strong>掲載情報について</strong><p>このページは${escapeHtml(lastChecked)}時点の公式ページをもとに整理しています。キャンペーンは予告なく変更・終了する場合があります。最終的な条件・対象者・期限は、申込み前に必ず公式ページで確認してください。掲載内容は一般的な情報提供で、金融商品や契約の勧誘ではありません。</p></div></section>
        </article>
      </div>
    </main>
    <footer class="site-footer"><div class="container site-footer__top"><a class="brand brand--footer" href="../" aria-label="ワクワクFIRE トップへ戻る"><span class="brand__mark" aria-hidden="true">W</span><span class="brand__text">ワクワク<span>FIRE</span></span></a><p>会社を辞めたら、<br /><strong>人生もっと遊べる。</strong></p><nav class="footer-nav" aria-label="フッターメニュー"><a href="../">ホーム</a><a href="../#contents">楽しいコンテンツ</a><a href="./">今日のお得</a><a href="../articles/">FIREコラム</a><a href="../about/">運営者情報</a><a href="../privacy/">プライバシーポリシー</a><a href="../contact/">お問い合わせ</a></nav></div><div class="container site-footer__bottom"><small>© <span id="current-year">${escapeHtml(String(jstParts(now).year))}</span> ワクワクFIRE</small><small>Made with curiosity &amp; a little courage.</small></div></footer>
    <script src="./affiliate-tracking.js" defer></script>
    <script src="../script.js" defer></script>
  </body>
</html>
`;
}

function stateDealsComparable(state) {
  return JSON.stringify(comparableDeals(state?.deals || []));
}

async function updateSitemap(state, siteUrl, contentChanged) {
  let sitemap = await readText(SITEMAP_PATH);
  const loc = `${siteUrl}/otoku/`;
  const escapedLoc = loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lastmod = state.contentModifiedAt.slice(0, 10);
  const entry = `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <lastmod>${escapeHtml(lastmod)}</lastmod>\n  </url>`;
  const pattern = new RegExp(`<url>\\s*<loc>${escapedLoc}</loc>\\s*<lastmod>[^<]+</lastmod>\\s*</url>`, "m");
  if (pattern.test(sitemap)) {
    if (contentChanged) sitemap = sitemap.replace(pattern, entry);
  } else {
    sitemap = sitemap.replace("</urlset>", `${entry}\n</urlset>`);
  }
  await writeText(SITEMAP_PATH, sitemap);
}

async function appendRunLog(summary) {
  const current = await readJson(RUN_LOG_PATH, { schemaVersion: 1, runs: [] });
  const runs = Array.isArray(current.runs) ? current.runs : [];
  runs.push(summary);
  await writeText(RUN_LOG_PATH, `${JSON.stringify({ schemaVersion: 1, runs: runs.slice(-90) }, null, 2)}\n`);
}

function conciseSourceResult(result) {
  return {
    id: result.id,
    name: result.name,
    method: result.method,
    endpoint: result.endpoint,
    status: result.status,
    robotsStatus: result.robotsStatus || null,
    httpStatus: result.httpStatus || null,
    bytes: result.bytes || 0,
    candidateCount: result.candidateCount || 0,
    paypayDetailCount: result.paypayDetailCount || 0,
    gourmetPageCount: result.gourmetPageCount || 0,
    gourmetPageErrorCount: result.gourmetPageErrorCount || 0,
    gourmetDiscoveredCount: result.gourmetDiscoveredCount || 0,
    gourmetOfficialLinkCount: result.gourmetOfficialLinkCount || 0,
    gourmetOfficialLinkFetchErrorCount: result.gourmetOfficialLinkFetchErrorCount || 0,
    gourmetOfficialLinkMissingCount: result.gourmetOfficialLinkMissingCount || 0,
    reason: result.reason || ""
  };
}

function payPayRecommendationScore(campaign) {
  const rate = Number.isFinite(campaign.ratePercent) ? campaign.ratePercent : -1;
  const periodCap = Number.isFinite(campaign.periodCapPoints) ? campaign.periodCapPoints : -1;
  const verified = campaign.detailStatus === "verified" ? 1 : 0;
  return [verified, rate, periodCap];
}

function comparePayPayRecommendations(left, right, now) {
  const leftScore = payPayRecommendationScore(left);
  const rightScore = payPayRecommendationScore(right);
  for (let index = 0; index < leftScore.length; index += 1) {
    if (rightScore[index] !== leftScore[index]) return rightScore[index] - leftScore[index];
  }
  const leftRemaining = daysRemaining(left.endDate, now) ?? 9999;
  const rightRemaining = daysRemaining(right.endDate, now) ?? 9999;
  return rightRemaining - leftRemaining || String(left.name).localeCompare(String(right.name), "ja");
}

function payPayRecommendationReason(campaign, candidates) {
  const knownRates = candidates.map((candidate) => candidate.ratePercent).filter(Number.isFinite);
  const knownCaps = candidates.map((candidate) => candidate.periodCapPoints).filter(Number.isFinite);
  const reasons = [];
  if (Number.isFinite(campaign.ratePercent) && campaign.ratePercent === Math.max(...knownRates)) {
    reasons.push(`還元率が高い（最大${campaign.ratePercent}%）`);
  }
  if (Number.isFinite(campaign.periodCapPoints) && campaign.periodCapPoints === Math.max(...knownCaps)) {
    reasons.push(`期間上限が高い（最大${campaign.periodCapPoints.toLocaleString("ja-JP")}ポイント）`);
  }
  if (!reasons.length && Number.isFinite(campaign.ratePercent) && Number.isFinite(campaign.periodCapPoints)) {
    reasons.push(`最大${campaign.ratePercent}%還元・期間上限${campaign.periodCapPoints.toLocaleString("ja-JP")}ポイント`);
  }
  if (!reasons.length) reasons.push("還元内容を公式詳細で確認できる開催中の候補");
  return reasons.join("／");
}

function buildPayPayRecommendations(source, now) {
  const candidates = source?.paypayRecommendationCandidates?.length
    ? source.paypayRecommendationCandidates
    : (source?.localCampaigns || []).filter((campaign) => campaign.campaignType === "ポイント還元キャンペーン");
  const sorted = [...candidates].sort((left, right) => comparePayPayRecommendations(left, right, now));
  return sorted.slice(0, PAYPAY_LOCAL_MAX_RECOMMENDATIONS).map((campaign) => ({
    ...campaign,
    recommendationReason: payPayRecommendationReason(campaign, candidates)
  }));
}

function stableDynamicId(prefix, url) {
  return `${prefix}-${crypto.createHash("sha256").update(String(url)).digest("hex").slice(0, 12)}`;
}

function gourmetDealFromCampaign(campaign) {
  if (!campaign?.officialUrl || isKojinabiSourceUrl(campaign.officialUrl)) return null;
  return {
    id: campaign.id || stableDynamicId("kojinabi-gourmet", campaign.articleUrl || campaign.officialUrl),
    campaignName: campaign.title,
    merchant: "グルメ・外食",
    service: "期間限定キャンペーン",
    benefitShort: "期間中のグルメキャンペーン",
    benefit: "掲載元で期間中と判断できるグルメ案件です。具体的な特典・対象商品・利用条件は公式ページで確認してください。",
    condition: "公式ページで期間・対象店舗・対象商品・クーポン条件を確認する。",
    target: "公式ページに記載された対象店舗・サービスを利用できる人。",
    action: "公式ページで最新条件を確認してから利用する。",
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    endDateLabel: campaign.endDateLabel === "掲載元の記事で期限を確認" ? "公式ページで期限を確認" : campaign.endDateLabel,
    applicationRequired: false,
    officialUrl: campaign.officialUrl,
    category: "food",
    score: { benefit: 4, ease: 4, audience: 4, duration: campaign.endDate ? 4 : 3, trust: 3, fireFit: 5 },
    note: `掲載元の期間表示を判定し、公式ページへ案内しています（${campaign.periodLabel}）。利用前に公式ページの最新条件を確認してください。`,
    maruComment: "食費の予定に自然に入るものだけ、無理なく使ってみよ。",
    sourceIds: ["kojinabi"],
    discoveryTerms: ["グルメ"],
    officialChecks: { requiredPhrases: [] },
    alwaysInclude: true,
    allowShortWindow: true,
    dynamicType: KOJINABI_GOURMET_DYNAMIC_TYPE,
    dynamicSourceId: "kojinabi",
    linkLabel: "公式ページを見る",
    verificationLabel: "公式ページを確認済み"
  };
}

function dynamicGourmetDealsForRun(sourceResults, previousDeals, now) {
  const source = sourceResults.find((result) => result.id === "kojinabi");
  if (source?.status === "success") return (source.gourmetCampaigns || []).map(gourmetDealFromCampaign).filter(Boolean);
  return (previousDeals || [])
    .filter((deal) => deal.dynamicType === KOJINABI_GOURMET_DYNAMIC_TYPE && isActiveDeal(deal, now) && !isKojinabiSourceUrl(deal.officialUrl))
    .map((deal) => gourmetDealFromCampaign({
      id: deal.id,
      title: deal.title,
      officialUrl: deal.officialUrl,
      startDate: deal.startDate,
      endDate: deal.endDate,
      endDateLabel: deal.endDateLabel,
      periodLabel: deal.endDate ? `${deal.startDate || ""} 〜 ${deal.endDate}` : "公式ページで期間確認"
    })).filter(Boolean);
}

function dynamicDealForRun(deal, sourceResults, previousDeal, now) {
  if (deal.dynamicType !== PAYPAY_LOCAL_DYNAMIC_TYPE) return deal;
  const source = sourceResults.find((result) => result.id === deal.dynamicSourceId);
  if (source?.status === "success") {
    const localCampaigns = source.localCampaigns || [];
    const localRecommendations = buildPayPayRecommendations(source, now);
    if (!localCampaigns.length || !localRecommendations.length) return null;
    const startDates = localCampaigns.map((campaign) => campaign.startDate).filter(Boolean).sort();
    return {
      ...deal,
      campaignName: `${deal.campaignName}（${localCampaigns.length}自治体で開催中）`,
      benefitShort: `開催中${localCampaigns.length}自治体からおすすめ${localRecommendations.length}件`,
      benefit: "PayPay公式一覧の開催中自治体から、還元率と期間あたりの上限を公式詳細で比較し、最大3地域をおすすめとして掲載しています。",
      condition: "PayPayのポイント還元やプレミアム商品券は自治体ごとに条件が異なります。対象店舗・還元率・住民限定かどうか・購入条件を公式一覧と各詳細ページで確認してください。",
      target: "開催中の自治体キャンペーンの対象地域・対象店舗を利用できるPayPayユーザー。住民限定のキャンペーンもあります。",
      action: "下のおすすめ地域を参考にしつつ、全自治体の開催状況と詳しい条件をPayPay公式一覧で確認する。",
      startDate: startDates[0] || null,
      endDate: null,
      endDateLabel: "自治体ごとに異なる（公式一覧参照）",
      localCampaignTotal: localCampaigns.length,
      localRecommendations,
      note: "PayPay公式一覧の開催中自治体から、還元率・期間上限の高い順を基本に最大3地域を抽出しています。予算上限などにより早期終了する場合があります。",
      maruComment: "近くで使える地域があれば、買い物の予定と合わせて公式ページを見てみよ。"
    };
  }
  const previousRecommendations = previousDeal?.localRecommendations?.length
    ? previousDeal.localRecommendations
    : (previousDeal?.localCampaigns || []).slice(0, PAYPAY_LOCAL_MAX_RECOMMENDATIONS);
  if (previousRecommendations.length) {
    return {
      ...deal,
      campaignName: previousDeal.title || deal.campaignName,
      benefitShort: previousDeal.benefitShort || deal.benefitShort,
      benefit: previousDeal.benefit || deal.benefit,
      condition: previousDeal.condition || deal.condition,
      target: previousDeal.target || deal.target,
      action: previousDeal.action || deal.action,
      startDate: previousDeal.startDate || deal.startDate,
      endDate: null,
      endDateLabel: previousDeal.endDateLabel || deal.endDateLabel,
      localCampaignTotal: previousDeal.localCampaignTotal || previousRecommendations.length,
      localRecommendations: previousRecommendations,
      note: previousDeal.note || deal.note,
      maruComment: previousDeal.maruComment || deal.maruComment
    };
  }
  return null;
}

function buildAffiliateAnalysis(deals, now, runtime) {
  const list = (deals || []).map(withMonetizationCategory);
  const displayCategoryCounts = {};
  for (const deal of list) {
    const category = deal.category || "other";
    displayCategoryCounts[category] = (displayCategoryCounts[category] || 0) + 1;
  }
  const monetizationCategoryCounts = countMonetizationCategories(list);
  const focusCategories = Object.entries(monetizationCategoryCounts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([category, count]) => ({ category, label: MONETIZATION_CATEGORY_LABELS[category], count }));
  return {
    schemaVersion: 1,
    analyzedAt: now.iso,
    source: "data/otoku/deals.json",
    dealCount: list.length,
    displayCategoryCounts,
    monetizationCategoryCounts,
    focusCategories,
    revenue: {
      a8LinkManagerConfigured: Boolean(runtime?.a8?.enabled),
      amazonAssociateConfigured: Boolean(runtime?.amazon?.isAffiliate),
      configuredOfferCount: (runtime?.offers || []).filter((offer) => offer.enabled).length,
      selectedContextOfferCount: selectAffiliateOffers(list, runtime?.offers || [], {
        now,
        maxOffers: 7,
        requireMatchingCategory: false,
        onePerCategory: false
      }).length
    }
  };
}

async function runUpdate({ dryRun = false, offline = false, nowInput } = {}) {
  const config = await readJson(SOURCE_CONFIG_PATH);
  const catalog = await readJson(CATALOG_PATH);
  const affiliateConfig = await readJson(AFFILIATE_CONFIG_PATH, {});
  const affiliateRegistry = await readJson(AFFILIATE_OFFERS_PATH, { schemaVersion: 1, offers: [] });
  const affiliateRuntime = buildAffiliateRuntime(affiliateConfig, affiliateRegistry, process.env);
  const previous = await readJson(PUBLIC_DATA_PATH, { schemaVersion: 1, deals: [] });
  const siteUrl = String(process.env.SITE_URL || config.site_url || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const now = currentJst(nowInput);
  const sources = (config.sources || []).filter((source) => source.enabled);
  if ((config.policy?.prTimesEnabled || false) || JSON.stringify(config).toLowerCase().includes("pr times")) {
    throw new Error("PR TIMESはポイ活Source設定へ追加できません。");
  }

  const sourceResults = offline
    ? sources.map((source) => ({ id: source.id, name: source.name, endpoint: source.endpoints?.[0] || source.url, method: "offline", status: "offline", candidateCount: 0, candidates: [], signalText: "" }))
    : await Promise.all(sources.sort((left, right) => (left.priority || 9) - (right.priority || 9)).map((source) => fetchSource(source, { now })));
  const sourceCandidatesList = sourceResults.flatMap((result) => result.candidates.map((candidate) => ({ ...candidate, sourceId: result.id })));
  const uniqueCandidateKeys = new Set(sourceCandidatesList.map((candidate) => `${candidate.sourceId}\u0000${candidate.url}\u0000${candidate.title}`));
  const normalizedCandidateKeys = new Set(sourceCandidatesList.map((candidate) => `${canonicalizeUrl(candidate.url)}\u0000${normalizeSpace(candidate.title).toLowerCase()}`));
  const sourceHealth = summarizeSourceResults(sourceResults, { offline });
  const previousById = new Map((previous.deals || []).map((deal) => [deal.id, deal]));
  const cache = new Map();
  const officialResults = [];
  const effective = [];
  const excluded = [];
  const dynamicGourmetDeals = dynamicGourmetDealsForRun(sourceResults, previous.deals || [], now);
  const dealsForRun = [...(catalog.deals || []), ...dynamicGourmetDeals];
  for (const catalogDeal of dealsForRun) {
    const previousDeal = previousById.get(catalogDeal.id);
    const deal = dynamicDealForRun(catalogDeal, sourceResults, previousDeal, now);
    if (!deal) {
      excluded.push({ id: catalogDeal.id, reason: catalogDeal.dynamicType === PAYPAY_LOCAL_DYNAMIC_TYPE ? "PayPay公式一覧で開催中の自治体がありません" : catalogDeal.dynamicType === KOJINABI_GOURMET_DYNAMIC_TYPE ? "ココトクのグルメ一覧で期間中の案件がありません" : "実行対象外" });
      continue;
    }
    if (!isActiveDeal(deal, now)) {
      excluded.push({ id: deal.id, reason: deal.endDate && deal.endDate < now.date ? "終了済み" : "開始前" });
      continue;
    }
    const remaining = daysRemaining(deal.endDate, now);
    if (remaining !== null && remaining < Number(catalog.minimumDaysRemaining ?? config.policy?.minimumDaysRemaining ?? 3) && !deal.allowShortWindow) {
      excluded.push({ id: deal.id, reason: `終了まで${remaining}日（基準未達）` });
      continue;
    }
    if (!sourceMatchesDeal(deal, sourceResults) && !deal.alwaysInclude) {
      excluded.push({ id: deal.id, reason: "有効Sourceで候補を確認できず" });
      continue;
    }
    const officialSource = deal.dynamicSourceId ? sourceResults.find((result) => result.id === deal.dynamicSourceId) : null;
    const verification = await verifyOfficialDeal(deal, cache, {
      offline,
      now,
      previousDeal,
      preloadedBody: officialSource?.officialBody,
      preloadedStatus: officialSource?.officialStatus
    });
    officialResults.push({ id: deal.id, ...verification });
    if (verification.ok) {
      effective.push({ ...deal, canonicalizedOfficialUrl: verification.canonicalizedOfficialUrl });
    } else if (previousById.has(deal.id) && isActiveDeal(previousById.get(deal.id), now) && !(deal.dynamicType === KOJINABI_GOURMET_DYNAMIC_TYPE && isKojinabiSourceUrl(previousById.get(deal.id).officialUrl))) {
      effective.push({ ...deal, ...previousById.get(deal.id), canonicalizedOfficialUrl: verification.canonicalizedOfficialUrl || previousById.get(deal.id).canonicalizedOfficialUrl });
      excluded.push({ id: deal.id, reason: `公式確認失敗のため前回データを維持: ${verification.reason}` });
    } else {
      excluded.push({ id: deal.id, reason: verification.reason || "公式ページ未確認" });
    }
  }
  const maxDeals = Math.max(1, Number(process.env.POI_MAX_DEALS || catalog.maxDeals || config.policy?.maxDeals || DEFAULT_MAX_DEALS));
  const selected = selectDeals(effective.map(withMonetizationCategory), { maxDeals, now });
  const publicSelected = selected.map(publicDeal);
  const previousActiveDeals = (previous.deals || [])
    .filter((deal) => isActiveDeal(deal, now))
    .map(withMonetizationCategory);
  const fallbackUsed = sourceHealth.allSourcesFailed && previousActiveDeals.length > 0;
  const finalDeals = (fallbackUsed ? previousActiveDeals.slice(0, maxDeals) : publicSelected).map(withMonetizationCategory);
  const contentChanged = stateDealsComparable({ deals: finalDeals }) !== stateDealsComparable(previous);
  const state = makePageState(previous, finalDeals.map((deal) => ({ ...deal, campaignName: deal.title, officialUrl: deal.officialUrl })), now, siteUrl, contentChanged);
  const affiliateAnalysis = buildAffiliateAnalysis(state.deals, now, affiliateRuntime);
  const selectedAffiliateOffers = selectAffiliateOffers(state.deals, affiliateRuntime.offers, {
    now,
    maxOffers: 7,
    requireMatchingCategory: false,
    onePerCategory: false
  });
  const summary = {
    runAt: now.iso,
    mode: offline ? "offline" : "scheduled",
    dryRun,
    sourceCount: sourceHealth.sourceCount,
    maxDeals,
    successfulSourceCount: sourceHealth.successfulSourceCount,
    allSourcesFailed: sourceHealth.allSourcesFailed,
    fallbackUsed,
    sources: sourceResults.map(conciseSourceResult),
    discoveredCandidateCount: uniqueCandidateKeys.size,
    duplicateCandidateCount: Math.max(0, sourceCandidatesList.length - normalizedCandidateKeys.size),
    officialCheckCount: officialResults.length,
    officialSuccessCount: officialResults.filter((result) => result.ok).length,
    officialFailureCount: officialResults.filter((result) => !result.ok).length,
    selectedDealCount: finalDeals.length,
    selectedDealIds: finalDeals.map((deal) => deal.id),
    affiliate: {
      a8LinkManagerConfigured: affiliateRuntime.a8.enabled,
      amazonAssociateConfigured: affiliateRuntime.amazon.isAffiliate,
      configuredOfferCount: affiliateRuntime.offers.filter((offer) => offer.enabled).length,
      selectedContextOfferCount: selectedAffiliateOffers.length
    },
    excludedCount: excluded.length,
    excluded: excluded.slice(0, 100),
    contentChanged,
    checkedAt: state.checkedAt,
    contentModifiedAt: state.contentModifiedAt,
    errors: sourceResults.filter((result) => result.status !== "success" && result.status !== "offline").map((result) => `${result.id}: ${result.reason || result.status}`)
  };
  if (!dryRun) {
    await writeText(PUBLIC_DATA_PATH, `${JSON.stringify(state, null, 2)}\n`);
    await writeText(AFFILIATE_ANALYSIS_PATH, `${JSON.stringify(affiliateAnalysis, null, 2)}\n`);
    await writeText(PAGE_PATH, renderPage(state, { siteUrl, now, closingSoonDays: Number(catalog.closingSoonDays || config.policy?.closingSoonDays || 7), affiliateRuntime }));
    await updateSitemap(state, siteUrl, contentChanged);
    await appendRunLog(summary);
  }
  return { state, summary, officialResults, excluded };
}

async function validatePoi() {
  const config = await readJson(SOURCE_CONFIG_PATH);
  const state = await readJson(PUBLIC_DATA_PATH);
  const page = await readText(PAGE_PATH);
  const siteUrl = String(process.env.SITE_URL || config.site_url || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const canonical = `${siteUrl}/otoku/`;
  const issues = [];
  const maxDeals = Math.max(1, Number(process.env.POI_MAX_DEALS || config.policy?.maxDeals || state.dealCount || DEFAULT_MAX_DEALS));
  if (config.policy?.prTimesEnabled) issues.push("PR TIMESが有効です");
  if ((config.sources || []).some((source) => source.id.toLowerCase().includes("pr-times") || String(source.url || "").toLowerCase().includes("prtimes"))) issues.push("PR TIMESがSource設定にあります");
  for (const source of config.sources || []) {
    if (source.enabled && !source.complianceChecked && !source.userApproved) issues.push(`有効Sourceの安全確認が未完了です（ユーザー承認もありません）: ${source.id}`);
    if (source.enabled && source.required && !source.robotsUrl) issues.push(`必須SourceにrobotsUrlがありません: ${source.id}`);
  }
  const requiredSources = (config.sources || []).filter((source) => source.required);
  if (requiredSources.some((source) => !source.enabled)) issues.push("必須Sourceが無効です");
  if ((state.deals || []).length > maxDeals) issues.push(`掲載件数が上限を超えています: ${state.deals.length}/${maxDeals}`);
  if (state.canonicalUrl !== canonical) issues.push("公開データのcanonicalが不一致です");
  if (!page.includes(`<link rel="canonical" href="${canonical}"`)) issues.push("ページのcanonicalが不一致です");
  if (!page.includes(`"datePublished": "${state.publishedAt}"`)) issues.push("datePublishedが公開データと一致しません");
  if (!page.includes(`"dateModified": "${state.contentModifiedAt}"`)) issues.push("dateModifiedが公開データと一致しません");
  if (!page.includes("AUTO-PUBLISH")) { /* This page is intentionally independent of the FIRE column updater. */ }
  const ids = new Set();
  for (const deal of state.deals || []) {
    if (ids.has(deal.id)) issues.push(`案件IDが重複しています: ${deal.id}`);
    ids.add(deal.id);
    if (!deal.officialUrl || !/^https?:\/\//i.test(deal.officialUrl)) issues.push(`公式URLが不正です: ${deal.id}`);
    if (deal.dynamicType === KOJINABI_GOURMET_DYNAMIC_TYPE && isKojinabiSourceUrl(deal.officialUrl)) issues.push(`ココトク直リンクが残っています: ${deal.id}`);
    if (deal.officialUrl) {
      try {
        await assertSafePublicUrl(deal.officialUrl, { resolveDns: false });
        if (deal.canonicalizedOfficialUrl !== canonicalizeUrl(deal.officialUrl)) issues.push(`公式URLのcanonicalizedOfficialUrlが不一致です: ${deal.id}`);
      } catch (error) {
        issues.push(`公式URLの安全確認に失敗しました: ${deal.id} (${error.message})`);
      }
    }
    if (!deal.endDate && !deal.endDateLabel) issues.push(`期限表示がありません: ${deal.id}`);
    if (deal.startDate && deal.endDate && deal.startDate > deal.endDate) issues.push(`掲載期間が逆転しています: ${deal.id}`);
    if (deal.endDate && deal.endDate < currentJst().date) issues.push(`終了済み案件が公開データにあります: ${deal.id}`);
  }
  if (issues.length) throw new Error(issues.join("\n"));
  return { ok: true, canonical, dealCount: state.deals?.length || 0, checkedAt: state.checkedAt, contentModifiedAt: state.contentModifiedAt };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function main() {
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify(await validatePoi(), null, 2));
    return;
  }
  const result = await runUpdate({
    dryRun: process.argv.includes("--dry-run"),
    offline: process.argv.includes("--offline"),
    nowInput: argValue("--now") || undefined
  });
  console.log(JSON.stringify(result.summary, null, 2));
}

export {
  currentJst,
  jstParts,
  japaneseDate,
  isPrivateIp,
  robotsAllows,
  sourceCandidates,
  publicDeal,
  runUpdate,
  validatePoi
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await main();
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}


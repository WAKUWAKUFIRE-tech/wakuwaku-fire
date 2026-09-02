import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_CONFIG_PATH = path.join(ROOT, "config", "poi-sources.json");
const CATALOG_PATH = path.join(ROOT, "automation", "otoku", "verified-deals.json");
const PUBLIC_DATA_PATH = path.join(ROOT, "data", "otoku", "deals.json");
const PAGE_PATH = path.join(ROOT, "otoku", "index.html");
const RUN_LOG_PATH = path.join(ROOT, "automation", "otoku", "run-log.json");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const DEFAULT_SITE_URL = "https://wakuwaku-fire-git.pages.dev";
const TIME_ZONE = "Asia/Tokyo";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_SOURCE_CANDIDATES = 40;
const TRACKING_PARAMETERS = /^(utm_[^=]+|fbclid|gclid|yclid|mc_cid|mc_eid|referrer|affiliate|aff)$/i;
const OPPORTUNITY_WORDS = /キャンペーン|還元|ポイント|クーポン|割引|無料|特典|お得|セール|入会|チャージ/i;

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
  await fs.writeFile(filename, value, "utf8");
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

async function fetchSource(source) {
  const endpoint = source.endpoints?.[0] || source.url;
  const result = { id: source.id, name: source.name, endpoint, method: source.fetchMethod || "html", status: "failed", candidateCount: 0, bytes: 0 };
  try {
    const robots = await fetchSafe(source.robotsUrl, { acceptStatuses: [404] });
    result.robotsStatus = robots.status;
    if (robots.status !== 404 && !robotsAllows(robots.body, endpoint)) {
      result.reason = "robots.txtで対象一覧が拒否されています";
      result.status = "blocked-by-robots";
      return { ...result, candidates: [], signalText: "" };
    }
    const requestedMaxBytes = Number(source.maxResponseBytes);
    const maxBytes = Number.isFinite(requestedMaxBytes) && requestedMaxBytes > 0
      ? Math.min(requestedMaxBytes, 8_000_000)
      : MAX_RESPONSE_BYTES;
    const response = await fetchSafe(endpoint, { maxBytes });
    const candidates = sourceCandidates(response.body, response.finalUrl, response.contentType);
    result.status = "success";
    result.finalUrl = response.finalUrl;
    result.httpStatus = response.status;
    result.contentType = response.contentType;
    result.bytes = Buffer.byteLength(response.body, "utf8");
    result.candidateCount = candidates.length;
    return { ...result, candidates, signalText: cleanText(response.body).slice(0, 500_000) };
  } catch (error) {
    result.reason = error.message;
    return { ...result, candidates: [], signalText: "" };
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

export function selectDeals(deals, { maxDeals = 10, now = new Date() } = {}) {
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

async function verifyOfficialDeal(deal, cache, { offline = false, now, previousDeal } = {}) {
  const officialUrl = deal.officialUrl;
  let canonicalizedOfficialUrl;
  try {
    canonicalizedOfficialUrl = canonicalizeUrl(officialUrl);
    await assertSafePublicUrl(canonicalizedOfficialUrl, { resolveDns: !offline });
  } catch (error) {
    return { ok: false, status: "unsafe-url", reason: error.message };
  }
  if (cache.has(canonicalizedOfficialUrl)) return cache.get(canonicalizedOfficialUrl);
  if (offline) {
    const result = { ok: true, status: "offline-approved", canonicalizedOfficialUrl, checkedAt: now.iso };
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

function publicDeal(deal) {
  const canonicalizedOfficialUrl = deal.canonicalizedOfficialUrl || canonicalizeUrl(deal.officialUrl);
  return {
    id: deal.id,
    title: deal.campaignName,
    merchant: deal.merchant,
    service: deal.service,
    benefitShort: deal.benefitShort,
    benefit: deal.benefit,
    condition: deal.condition,
    target: deal.target,
    action: deal.action,
    startDate: deal.startDate,
    endDate: deal.endDate || null,
    endDateLabel: deal.endDateLabel || "",
    applicationRequired: Boolean(deal.applicationRequired),
    officialUrl: canonicalizedOfficialUrl,
    canonicalizedOfficialUrl,
    category: deal.category || "other",
    note: deal.note || "",
    maruComment: deal.maruComment || ""
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
    note: deal.note,
    maruComment: deal.maruComment
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

function categoryLabel(category) {
  return {
    cashless: "キャッシュレス",
    point: "ポイント",
    shopping: "買い物・サービス",
    food: "食費・外食",
    travel: "旅行",
    finance: "金融",
    coupon: "クーポン",
    telecom: "通信",
    other: "その他"
  }[category] || "その他";
}

function renderDealCard(deal, now, closingSoonDays = 7) {
  const remaining = daysRemaining(deal.endDate, now);
  const isClosingSoon = remaining !== null && remaining >= 0 && remaining <= closingSoonDays;
  const category = categoryLabel(deal.category);
  const application = deal.applicationRequired ? "要エントリー" : "エントリー不要";
  return `
            <article class="deal-card deal-card--${escapeHtml(deal.category)}${isClosingSoon ? " deal-card--closing-soon" : ""}">
              <div class="deal-card__top"><span class="deal-card__category">${escapeHtml(category)}</span>${isClosingSoon ? `<span class="deal-card__closing">まもなく終了</span>` : ""}</div>
              <h3>${escapeHtml(deal.title)}</h3>
              <p class="deal-card__benefit">${escapeHtml(deal.benefitShort)}</p>
              <dl class="deal-card__facts">
                <div><dt>対象</dt><dd>${escapeHtml(deal.target)}</dd></div>
                <div><dt>やること</dt><dd>${escapeHtml(deal.action)}</dd></div>
                <div><dt>期限</dt><dd><strong>${escapeHtml(formatEndDate(deal, now))}</strong><span>${escapeHtml(application)}</span></dd></div>
              </dl>
              <details class="deal-card__details"><summary>条件・注意点を読む</summary><p><strong>条件：</strong>${escapeHtml(deal.condition)}</p>${deal.note ? `<p><strong>注意：</strong>${escapeHtml(deal.note)}</p>` : ""}</details>
              ${deal.maruComment ? `<p class="deal-card__maru"><span>まるのひとこと</span>${escapeHtml(deal.maruComment)}</p>` : ""}
              <div class="deal-card__footer"><a class="button button--primary" href="${escapeHtml(deal.officialUrl)}" target="_blank" rel="noopener noreferrer">公式ページを見る <span aria-hidden="true">↗</span></a><span class="deal-card__official-label">公式情報を確認済み</span></div>
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

export function renderPage(state, { siteUrl = DEFAULT_SITE_URL, now = new Date(), closingSoonDays = 7 } = {}) {
  const title = monthTitle(now);
  const description = metaDescription(now);
  const lastChecked = japaneseDateTime(state.checkedAt);
  const pageDeals = state.deals || [];
  const regularDeals = pageDeals.filter((deal) => {
    const remaining = daysRemaining(deal.endDate, now);
    return !(remaining !== null && remaining >= 0 && remaining <= closingSoonDays);
  });
  const mainSection = regularDeals.length ? `
          <section class="otoku-section" id="check-now" aria-labelledby="check-now-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--yellow">CHECK NOW</p><h2 id="check-now-title">今チェックしたい<br /><span>お得情報。</span></h2></div><p class="otoku-section__intro">還元率だけでなく、条件のわかりやすさ・使いやすさ・期限の余裕も見て並べています。申し込む前に、必ず公式ページの最新条件を確認してください。</p><div class="deal-grid">${regularDeals.map((deal) => renderDealCard(deal, now, closingSoonDays)).join("\n")}</div></section>` : pageDeals.length ? `
          <section class="otoku-section" id="check-now" aria-labelledby="check-now-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--yellow">CHECK NOW</p><h2 id="check-now-title">今チェックしたい<br /><span>お得情報。</span></h2></div><div class="otoku-empty"><strong>期限が近い案件は、下の「まもなく終了」へ。</strong><p>条件と期限を確認して、無理のないものだけ選んでください。</p></div></section>` : `
          <section class="otoku-section" id="check-now" aria-labelledby="check-now-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--yellow">CHECK NOW</p><h2 id="check-now-title">今チェックしたい<br /><span>お得情報。</span></h2></div><div class="otoku-empty"><strong>今日は掲載できる案件を確認中です。</strong><p>条件や期限を確認できない案件で、水増しはしていません。次回の確認をお待ちください。</p></div></section>`;
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
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
            <div class="otoku-hero__sticker" aria-hidden="true"><span>毎朝</span><strong>6:00</strong><small>JST CHECK</small></div>
          </header>
          <div class="otoku-meta"><span>最終確認</span><time datetime="${escapeHtml(state.checkedAt)}">${escapeHtml(lastChecked)}（日本時間）</time><span class="otoku-meta__status">${pageDeals.length}件掲載</span></div>
          <p class="otoku-intro">まいど！ワクワクFIREのまるです。ポイ活は、追いかけ始めるとキリがない。1日だけの案件に張り付き続けるのもしんどい。ここでは、情報サイトをきっかけに見つけた案件を公式ページで確認して、今日から使えるものを短く整理しています。紹介コード・アフィリエイトリンク・他サイトの画像は載せてへんで。</p>
          <aside class="otoku-rules" aria-label="このページの掲載ルール"><div><span class="otoku-rules__number">01</span><strong>公式ページ確認</strong><small>条件・期限を再確認</small></div><div><span class="otoku-rules__number">02</span><strong>原則3日以上</strong><small>急かされる案件は除外</small></div><div><span class="otoku-rules__number">03</span><strong>最大10件</strong><small>無理に水増ししない</small></div></aside>
${mainSection}
${renderClosingSoon(pageDeals, now, closingSoonDays)}
          <section class="otoku-section otoku-section--care" aria-labelledby="care-title"><div class="otoku-section__heading"><p class="eyebrow eyebrow--red">TAKE IT EASY</p><h2 id="care-title">ポイ活で無理しすぎない<br /><span>ために。</span></h2></div><div class="otoku-care-grid"><div class="otoku-care-card"><span aria-hidden="true">01</span><h3>使う予定のお金だけ</h3><p>ポイントのために、いらない買い物や契約を増やさない。先に使い道を決めると、ポイ活に振り回されにくいで。</p></div><div class="otoku-care-card"><span aria-hidden="true">02</span><h3>条件は最後まで読む</h3><p>エントリー、対象カード、最低利用額、付与時期、解約条件。お得そうな数字だけで判断せず、公式の注意事項まで確認しよ。</p></div><div class="otoku-care-card"><span aria-hidden="true">03</span><h3>投資案件は別もの</h3><p>元本が必要な金融・投資案件は、ポイント還元とは別にリスクがあります。ポイントのためだけに投資する必要はありません。</p></div></div><div class="otoku-disclaimer"><strong>掲載情報について</strong><p>このページは${escapeHtml(lastChecked)}時点の公式ページをもとに整理しています。キャンペーンは予告なく変更・終了する場合があります。最終的な条件・対象者・期限は、申込み前に必ず公式ページで確認してください。掲載内容は一般的な情報提供で、金融商品や契約の勧誘ではありません。</p></div></section>
        </article>
      </div>
    </main>
    <footer class="site-footer"><div class="container site-footer__top"><a class="brand brand--footer" href="../" aria-label="ワクワクFIRE トップへ戻る"><span class="brand__mark" aria-hidden="true">W</span><span class="brand__text">ワクワク<span>FIRE</span></span></a><p>会社を辞めたら、<br /><strong>人生もっと遊べる。</strong></p><nav class="footer-nav" aria-label="フッターメニュー"><a href="../">ホーム</a><a href="../#contents">楽しいコンテンツ</a><a href="./">今日のお得</a><a href="../articles/">FIREコラム</a><a href="../about/">運営者情報</a><a href="../privacy/">プライバシーポリシー</a><a href="../contact/">お問い合わせ</a></nav></div><div class="container site-footer__bottom"><small>© <span id="current-year">${escapeHtml(String(jstParts(now).year))}</span> ワクワクFIRE</small><small>Made with curiosity &amp; a little courage.</small></div></footer>
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
    reason: result.reason || ""
  };
}

async function runUpdate({ dryRun = false, offline = false, nowInput } = {}) {
  const config = await readJson(SOURCE_CONFIG_PATH);
  const catalog = await readJson(CATALOG_PATH);
  const previous = await readJson(PUBLIC_DATA_PATH, { schemaVersion: 1, deals: [] });
  const siteUrl = String(process.env.SITE_URL || config.site_url || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const now = currentJst(nowInput);
  const sources = (config.sources || []).filter((source) => source.enabled);
  if ((config.policy?.prTimesEnabled || false) || JSON.stringify(config).toLowerCase().includes("pr times")) {
    throw new Error("PR TIMESはポイ活Source設定へ追加できません。");
  }

  const sourceResults = offline
    ? sources.map((source) => ({ id: source.id, name: source.name, endpoint: source.endpoints?.[0] || source.url, method: "offline", status: "offline", candidateCount: 0, candidates: [], signalText: "" }))
    : await Promise.all(sources.sort((left, right) => (left.priority || 9) - (right.priority || 9)).map(fetchSource));
  const sourceCandidatesList = sourceResults.flatMap((result) => result.candidates.map((candidate) => ({ ...candidate, sourceId: result.id })));
  const uniqueCandidateKeys = new Set(sourceCandidatesList.map((candidate) => `${candidate.sourceId}\u0000${candidate.url}\u0000${candidate.title}`));
  const normalizedCandidateKeys = new Set(sourceCandidatesList.map((candidate) => `${canonicalizeUrl(candidate.url)}\u0000${normalizeSpace(candidate.title).toLowerCase()}`));
  const sourceHealth = summarizeSourceResults(sourceResults, { offline });
  const previousById = new Map((previous.deals || []).map((deal) => [deal.id, deal]));
  const cache = new Map();
  const officialResults = [];
  const effective = [];
  const excluded = [];
  for (const deal of catalog.deals || []) {
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
    const verification = await verifyOfficialDeal(deal, cache, { offline, now, previousDeal: previousById.get(deal.id) });
    officialResults.push({ id: deal.id, ...verification });
    if (verification.ok) {
      effective.push({ ...deal, canonicalizedOfficialUrl: verification.canonicalizedOfficialUrl });
    } else if (previousById.has(deal.id) && isActiveDeal(previousById.get(deal.id), now)) {
      effective.push({ ...deal, ...previousById.get(deal.id), canonicalizedOfficialUrl: verification.canonicalizedOfficialUrl || previousById.get(deal.id).canonicalizedOfficialUrl });
      excluded.push({ id: deal.id, reason: `公式確認失敗のため前回データを維持: ${verification.reason}` });
    } else {
      excluded.push({ id: deal.id, reason: verification.reason || "公式ページ未確認" });
    }
  }
  const maxDeals = Math.max(1, Number(process.env.POI_MAX_DEALS || catalog.maxDeals || config.policy?.maxDeals || 10));
  const selected = selectDeals(effective, { maxDeals, now });
  const publicSelected = selected.map(publicDeal);
  const previousActiveDeals = (previous.deals || []).filter((deal) => isActiveDeal(deal, now));
  const fallbackUsed = sourceHealth.allSourcesFailed && previousActiveDeals.length > 0;
  const finalDeals = fallbackUsed ? previousActiveDeals.slice(0, maxDeals) : publicSelected;
  const contentChanged = stateDealsComparable({ deals: finalDeals }) !== stateDealsComparable(previous);
  const state = makePageState(previous, finalDeals.map((deal) => ({ ...deal, campaignName: deal.title, officialUrl: deal.officialUrl })), now, siteUrl, contentChanged);
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
    excludedCount: excluded.length,
    excluded: excluded.slice(0, 100),
    contentChanged,
    checkedAt: state.checkedAt,
    contentModifiedAt: state.contentModifiedAt,
    errors: sourceResults.filter((result) => result.status !== "success" && result.status !== "offline").map((result) => `${result.id}: ${result.reason || result.status}`)
  };
  if (!dryRun) {
    await writeText(PUBLIC_DATA_PATH, `${JSON.stringify(state, null, 2)}\n`);
    await writeText(PAGE_PATH, renderPage(state, { siteUrl, now, closingSoonDays: Number(catalog.closingSoonDays || config.policy?.closingSoonDays || 7) }));
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
  const maxDeals = Math.max(1, Number(process.env.POI_MAX_DEALS || config.policy?.maxDeals || state.dealCount || 10));
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

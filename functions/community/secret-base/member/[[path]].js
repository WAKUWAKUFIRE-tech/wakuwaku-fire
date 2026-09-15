import { SECRET_BASE_BENEFITS } from "../data.generated.js";
import { isAuthorized } from "../auth.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 ↗</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function renderImage(line) {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return null;
  const alt = escapeHtml(match[1]);
  const assetName = match[2].startsWith("assets/") ? match[2].slice("assets/".length) : "";
  const source = assetName
    ? `/community/secret-base/member/assets/${encodeURIComponent(assetName)}`
    : match[2];
  const isWideOverview = assetName === "asset-sharing-11.png" || match[1].includes("全員分");
  const figureClass = isWideOverview ? ' class="secret-base-detail__gallery-figure secret-base-detail__gallery-figure--wide"' : ' class="secret-base-detail__gallery-figure"';
  const dimensions = isWideOverview ? ' width="5610" height="2804"' : "";
  return `<figure${figureClass}><img src="${escapeHtml(source)}" alt="${alt}"${dimensions} loading="lazy" decoding="async" /></figure>`;
}

function renderMarkdown(markdown, options = {}) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  const accordion = options.layout === "accordion";
  let paragraph = [];
  let list = [];
  let accordionOpen = false;
  let accordionCount = 0;

  function emit(value) {
    output.push(value);
  }

  function closeAccordion() {
    if (!accordionOpen) return;
    output.push("</div></details>");
    accordionOpen = false;
  }

  function flushParagraph() {
    if (paragraph.length) {
      emit(`<p>${renderInline(paragraph.join("\n")).replaceAll("\n", "<br />")}</p>`);
      paragraph = [];
    }
  }

  function flushList() {
    if (list.length) {
      emit(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const image = renderImage(line);
    if (image) {
      flushParagraph();
      flushList();
      const gallery = [image];
      while (index + 1 < lines.length) {
        const nextImage = renderImage(lines[index + 1].trim());
        if (!nextImage) break;
        gallery.push(nextImage);
        index += 1;
      }
      emit(`<div class="secret-base-detail__gallery">${gallery.join("")}</div>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      if (level === 1) continue;
      if (accordion && level === 2) {
        closeAccordion();
        accordionCount += 1;
        const open = accordionCount === 1 || heading[2].includes("注意事項") ? " open" : "";
        output.push(`<details class="secret-base-detail__accordion"${open}><summary>${renderInline(heading[2])}</summary><div class="secret-base-detail__accordion-body">`);
        accordionOpen = true;
      } else {
        emit(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      }
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      output.push(`<blockquote><p>${renderInline(line.slice(2))}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    if (list.length) flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  closeAccordion();
  return output.join("\n");
}

function pageShell(title, description, body) {
  return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#07172d"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/community/secret-base/secret-base.css"><title>${escapeHtml(title)}｜大人の秘密基地</title></head><body class="secret-base-page secret-base-member"><header class="secret-base-header"><div class="secret-base-shell secret-base-header__inner"><a class="secret-base-brand" href="/" aria-label="ワクワクFIRE トップへ戻る"><span class="secret-base-brand__mark">W</span><span>ワクワク<span>FIRE</span></span></a><a class="secret-base-back-link" href="/community/secret-base/">秘密基地の入口へ</a></div></header>${body}<footer class="secret-base-footer"><div class="secret-base-shell"><a href="/">ワクワクFIRE</a><span>ここから先はコミュニティ限定です。</span></div></footer></body></html>`;
}

function memberIndex() {
  const cards = SECRET_BASE_BENEFITS.map((benefit) => `<a class="secret-base-member-card" href="/community/secret-base/member/${encodeURIComponent(benefit.id)}/"><span class="secret-base-member-card__icon" aria-hidden="true">${escapeHtml(benefit.icon)}</span><h2>${escapeHtml(benefit.title)}</h2><p>${escapeHtml(benefit.summary)}</p><span class="secret-base-member-card__cta">特典を見る →</span></a>`).join("");
  const body = `<main class="secret-base-main"><section class="secret-base-member__hero"><div class="secret-base-shell"><p class="secret-base-eyebrow">UNLOCKED / WAKUWAKU FIRE COMMUNITY</p><h1>🔓 大人の秘密基地へようこそ</h1><p>ここから先はワクワクFIREコミュニティ限定です。<br>気になる特典を選んで、資料や記録を開いてみてください。</p></div></section><section class="secret-base-detail"><div class="secret-base-shell"><div class="secret-base-member-grid">${cards}</div></div></section></main>`;
  return pageShell("🔓 大人の秘密基地へようこそ", "ワクワクFIREコミュニティのメンバー限定エリアです。", body);
}

function memberDetail(benefit) {
  const body = `<main class="secret-base-main"><section class="secret-base-detail"><div class="secret-base-shell"><div class="secret-base-detail__head"><p class="secret-base-eyebrow">MEMBERS ONLY / ${escapeHtml(benefit.id.toUpperCase())}</p><h1>${escapeHtml(benefit.icon)} ${escapeHtml(benefit.title)}</h1><p>${escapeHtml(benefit.summary)}</p></div><article class="secret-base-detail__body">${renderMarkdown(benefit.body, benefit)}</article><a class="secret-base-detail__back" href="/community/secret-base/member/">← 特典一覧へ戻る</a></div></section></main>`;
  return pageShell(benefit.title, benefit.summary, body);
}

function getSegments(context) {
  const raw = context.params && context.params.path;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw || "").split("/").filter(Boolean);
}

function unauthorized() {
  return new Response("Not found", { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
}

async function serveProtectedAsset(context, filename) {
  if (!/^[a-z0-9._-]+$/i.test(filename) || !context.env || !context.env.ASSETS) return unauthorized();
  const assetUrl = new URL(`/community/secret-base/private-assets/${filename}`, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));
  if (!response.ok) return unauthorized();
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, max-age=86400");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, headers });
}

export async function onRequest(context) {
  const secret = context.env && context.env.SECRET_BASE_PASSWORD;
  if (!(await isAuthorized(context.request, secret))) return unauthorized();
  const segments = getSegments(context);
  if (segments[0] === "assets" && segments.length === 2) return serveProtectedAsset(context, segments[1]);
  if (!segments.length) return new Response(memberIndex(), { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
  if (segments.length !== 1) return unauthorized();
  const benefit = SECRET_BASE_BENEFITS.find((item) => item.id === segments[0]);
  if (!benefit) return unauthorized();
  return new Response(memberDetail(benefit), { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
}

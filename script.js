/*
  ワクワクFIREの小さな動きは、このファイルだけで管理しています。
  新しいページを追加するときも、基本はHTMLのカードとリンクを増やせばOKです。
*/

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const siteHeader = document.querySelector(".site-header");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function closeNavigation() {
  if (!navToggle || !siteNav) return;
  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!siteNav.classList.contains("is-open")) return;
    if (siteNav.contains(event.target) || navToggle.contains(event.target)) return;
    closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });
}

// アンカーリンクを押したら、スマホメニューを閉じます。
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? document.querySelector(targetId) : null;

    if (!target) return;

    event.preventDefault();
    closeNavigation();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", targetId);
  });
});

// スクロール中だけヘッダーに影をつけ、ページの位置をわかりやすくします。
function updateHeaderState() {
  if (siteHeader) siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
}

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

// コンテンツカードのカテゴリー絞り込み。
const filterButtons = document.querySelectorAll(".filter-button");
const contentCards = document.querySelectorAll(".content-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    contentCards.forEach((card) => {
      const shouldShow = selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

// FIREコラムのサムネイルからも、対応する記事へ移動できるようにします。
document.querySelectorAll(".article-preview-card").forEach((card) => {
  const articleLink = card.querySelector(".article-preview-card__more[href], .button[href]");
  const media = card.querySelector(".article-preview-card__media");
  const image = media?.querySelector("img");

  if (!articleLink || !media || !image || media.querySelector("a")) return;

  const mediaLink = document.createElement("a");
  mediaLink.className = "article-preview-card__media-link";
  mediaLink.href = articleLink.getAttribute("href");
  mediaLink.setAttribute("aria-label", `${card.querySelector("h2, h3")?.textContent.trim() || "この記事"}を読む`);
  mediaLink.appendChild(image);
  media.replaceChildren(mediaLink);
});

// コラム記事では、本文と一緒に読める「編集部のおすすめ」をPCの右側に表示します。
// 下部の関連記事とは別に、記事一覧から候補を取り出して重複を避けます。
function normalizeRecommendationPath(href, baseUrl = window.location.href) {
  try {
    const url = new URL(href, baseUrl);
    let pathname = url.pathname.replace(/index\.html$/, "");
    if (!pathname.endsWith("/")) pathname += "/";
    return pathname;
  } catch {
    return "";
  }
}

function parseRecommendationCatalog(documentObject, baseUrl) {
  return [...documentObject.querySelectorAll(".article-preview-card")].map((card) => {
    const link = card.querySelector(".article-preview-card__more[href], .button[href]");
    const image = card.querySelector(".article-preview-card__media img");
    const href = link ? new URL(link.getAttribute("href"), baseUrl).href : "";
    const title = card.querySelector("h2, h3")?.textContent.trim() || "";

    if (!href || !title) return null;

    return {
      href,
      path: normalizeRecommendationPath(href),
      title,
      category: card.querySelector(".article-preview-card__category")?.textContent.trim() || "FIREコラム",
      date: card.querySelector(".article-preview-card__date")?.textContent.trim() || "",
      image: image ? new URL(image.getAttribute("src"), baseUrl).href : "",
    };
  }).filter(Boolean);
}

async function loadRecommendationCatalog() {
  const catalogUrl = new URL("../../articles/", window.location.href);
  const response = await fetch(catalogUrl.href, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`記事一覧を読み込めませんでした: ${response.status}`);
  const html = await response.text();
  const catalogDocument = new DOMParser().parseFromString(html, "text/html");
  return parseRecommendationCatalog(catalogDocument, catalogUrl.href);
}

function chooseRecommendationArticles(catalog, currentPath, excludedPaths, currentCategory) {
  const candidates = catalog.filter((article) => (
    article.path
    && article.path !== currentPath
    && !excludedPaths.has(article.path)
  ));
  const selected = [];
  const remaining = [...candidates];

  while (selected.length < 3 && remaining.length) {
    const differentCategory = remaining.find((article) => (
      article.category !== currentCategory
      && !selected.some((picked) => picked.category === article.category)
    ));
    const unusedCategory = remaining.find((article) => (
      !selected.some((picked) => picked.category === article.category)
    ));
    const article = differentCategory || unusedCategory || remaining[0];
    selected.push(article);
    remaining.splice(remaining.indexOf(article), 1);
  }

  return selected;
}

async function renderArticleRecommendations() {
  const layout = document.querySelector(".article-layout");
  const articlePage = layout?.querySelector(".article-page");
  const relatedSection = layout?.querySelector(".related-articles");

  if (!layout || !articlePage || !relatedSection || layout.querySelector(".article-recommendations")) return;

  let catalog;
  try {
    catalog = await loadRecommendationCatalog();
  } catch {
    return;
  }

  const currentPath = normalizeRecommendationPath(window.location.pathname);
  const excludedPaths = new Set([...relatedSection.querySelectorAll("a[href]")]
    .map((link) => normalizeRecommendationPath(link.getAttribute("href")))
    .filter(Boolean));
  const currentCategory = articlePage.querySelector(".article-page__meta span")?.textContent.trim() || "";
  const cards = chooseRecommendationArticles(catalog, currentPath, excludedPaths, currentCategory);
  if (cards.length === 0) return;

  const aside = document.createElement("aside");
  aside.className = "article-recommendations";
  aside.setAttribute("aria-labelledby", "article-recommendations-title");

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow eyebrow--yellow article-recommendations__eyebrow";
  eyebrow.textContent = "READ NEXT";

  const heading = document.createElement("h2");
  heading.className = "article-recommendations__title";
  heading.id = "article-recommendations-title";
  heading.textContent = "編集部のおすすめ";

  const intro = document.createElement("p");
  intro.className = "article-recommendations__intro";
  intro.textContent = "下の関連記事とは別に、次に読みたい3本。";

  const list = document.createElement("ol");
  list.className = "article-recommendations__list";

  cards.forEach((card, index) => {
    const item = document.createElement("li");
    item.className = "article-recommendations__item";

    const link = document.createElement("a");
    link.className = "article-recommendations__link";
    link.href = card.href;

    const thumbnail = document.createElement("span");
    thumbnail.className = "article-recommendations__thumb";
    thumbnail.setAttribute("aria-hidden", "true");
    if (card.image) {
      const image = document.createElement("img");
      image.src = card.image;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => thumbnail.remove(), { once: true });
      thumbnail.append(image);
    } else {
      thumbnail.textContent = "FIRE";
    }

    const number = document.createElement("span");
    number.className = "article-recommendations__number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1).padStart(2, "0");

    const body = document.createElement("span");
    body.className = "article-recommendations__body";

    const category = document.createElement("span");
    category.className = "article-recommendations__category";
    category.textContent = card.category;

    const titleElement = document.createElement("strong");
    titleElement.className = "article-recommendations__article-title";
    titleElement.textContent = card.title;

    const date = document.createElement("span");
    date.className = "article-recommendations__date";
    date.textContent = card.date;

    body.append(category, titleElement, date);
    link.append(thumbnail, number, body);
    item.append(link);
    list.append(item);
  });

  if (list.children.length === 0) return;

  aside.append(eyebrow, heading, intro, list);
  articlePage.insertAdjacentElement("afterend", aside);
}

void renderArticleRecommendations();

// リンクを登録した本だけを、日本時間の日付で1日1冊表示します。
const dailyBookSection = document.querySelector("#daily-book");
const dailyBookImage = document.querySelector("#daily-book-image");
const dailyBookDate = document.querySelector("#daily-book-date");
const dailyBookCategory = document.querySelector("#daily-book-category");
const dailyBookTitle = document.querySelector("#daily-book-book-title");
const dailyBookAuthor = document.querySelector("#daily-book-author");
const dailyBookCatch = document.querySelector("#daily-book-catch");
const dailyBookDescription = document.querySelector("#daily-book-description");
const dailyBookTags = document.querySelector("#daily-book-tags");
const dailyBookCardLink = document.querySelector("#daily-book-card-link");
const dailyBookLink = document.querySelector("#daily-book-link");
const registeredBooks = Array.isArray(window.wakuwakuBooks) ? window.wakuwakuBooks : [];

function getTokyoDateParts(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((parts, item) => {
    parts[item.type] = item.value;
    return parts;
  }, {});
}

function getTokyoDayNumber(date = new Date()) {
  const parts = getTokyoDateParts(date);
  const utcDate = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  return Math.floor(utcDate / 86400000);
}

function clearDailyBook() {
  if (!dailyBookSection) return;
  dailyBookSection.hidden = true;
  if (dailyBookCardLink) {
    dailyBookCardLink.hidden = true;
    dailyBookCardLink.removeAttribute("href");
    dailyBookCardLink.removeAttribute("aria-label");
  }
  if (dailyBookLink) {
    dailyBookLink.hidden = true;
  }
}

function renderDailyBook() {
  if (!dailyBookSection) return;

  const booksWithLinks = registeredBooks.filter((book) => (
    book && typeof book.affiliateUrl === "string" && book.affiliateUrl.trim() !== ""
  ));

  if (booksWithLinks.length === 0) {
    clearDailyBook();
    return;
  }

  const book = booksWithLinks[getTokyoDayNumber() % booksWithLinks.length];
  const categories = Array.isArray(book.category) ? book.category : [];
  const parts = getTokyoDateParts();
  const fallbackImage = "reading.png";

  if (dailyBookImage) {
    dailyBookImage.onerror = () => {
      if (!dailyBookImage.src.endsWith(fallbackImage)) dailyBookImage.src = fallbackImage;
    };
    dailyBookImage.src = book.imageUrl || fallbackImage;
  }

  if (dailyBookDate) dailyBookDate.textContent = `${Number(parts.month)}月${Number(parts.day)}日の一冊`;
  if (dailyBookCategory) dailyBookCategory.textContent = categories.join(" / ");
  if (dailyBookTitle) dailyBookTitle.textContent = book.title;
  if (dailyBookAuthor) dailyBookAuthor.textContent = `著者：${book.author}`;
  if (dailyBookCatch) dailyBookCatch.textContent = book.catchCopy;
  if (dailyBookDescription) dailyBookDescription.textContent = book.description;

  if (dailyBookTags) {
    dailyBookTags.replaceChildren(...categories.map((category) => {
      const tag = document.createElement("span");
      tag.textContent = category;
      return tag;
    }));
  }

  if (dailyBookCardLink) {
    dailyBookCardLink.href = book.affiliateUrl;
    dailyBookCardLink.setAttribute("aria-label", `Amazonで「${book.title}」を見る`);
    dailyBookCardLink.hidden = false;
  }

  if (dailyBookLink) {
    dailyBookLink.hidden = false;
  }

  dailyBookSection.hidden = false;
}

function scheduleDailyBookRefresh() {
  if (!dailyBookSection) return;

  const parts = getTokyoDateParts();
  const nextTokyoMidnight = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + 1,
  ) - (9 * 60 * 60 * 1000) + 250;
  const delay = Math.max(1000, nextTokyoMidnight - Date.now());

  window.setTimeout(() => {
    renderDailyBook();
    scheduleDailyBookRefresh();
  }, delay);
}

renderDailyBook();
scheduleDailyBookRefresh();

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();

// 既存の解析環境がある場合だけ、企業向けページの主要リンクを記録します。
// 解析タグがない環境では何も送信せず、ページの動作にも影響しません。
const analyticsPage = document.body?.dataset.analyticsPage;
if (analyticsPage) {
  const pageEvent = `${analyticsPage}_page_view`;
  if (typeof window.gtag === "function") {
    window.gtag("event", pageEvent, { event_category: document.body?.dataset.analyticsCategory || "business", page_path: window.location.pathname });
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: pageEvent, event_category: document.body?.dataset.analyticsCategory || "business", page_path: window.location.pathname });
  }
}

document.querySelectorAll("[data-analytics-event]").forEach((link) => {
  link.addEventListener("click", () => {
    const eventName = link.dataset.analyticsEvent;
    const eventLabel = link.dataset.analyticsLabel || "";
    if (!eventName) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, { event_category: link.dataset.analyticsCategory || document.body?.dataset.analyticsCategory || "business", event_label: eventLabel });
    } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, event_category: link.dataset.analyticsCategory || document.body?.dataset.analyticsCategory || "business", event_label: eventLabel });
    }
  });
});
// トップページのデザイン刷新用。スクロール演出は軽量な transform/opacity だけで行います。
const designRefresh = document.body?.classList.contains("design-refresh");

if (designRefresh) {
  const revealTargets = document.querySelectorAll(
    ".design-refresh .intro, .design-refresh .column-preview, .design-refresh .contents, " +
    ".design-refresh .daily-book, .design-refresh .fire-card-section, .design-refresh .operator-preview, " +
    ".design-refresh .article-preview-card, .design-refresh .content-card",
  );

  document.body.classList.add("design-motion-ready");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("design-reveal", "is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

    revealTargets.forEach((target, index) => {
      target.classList.add("design-reveal");
      if (target.classList.contains("article-preview-card") || target.classList.contains("content-card")) {
        target.style.setProperty("--design-reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
      }
      revealObserver.observe(target);
    });
  }

  const cinematicHero = document.querySelector(".design-refresh .hero--cinematic");
  const cinematicFrame = cinematicHero?.querySelector(".hero__visual-frame");

  if (cinematicHero && cinematicFrame && !prefersReducedMotion) {
    let parallaxFrame = 0;
    let parallaxQueued = false;

    const updateHeroParallax = () => {
      parallaxQueued = false;
      const rect = cinematicHero.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.5;
      const heroCenter = rect.top + rect.height * 0.5;
      const shift = Math.max(-16, Math.min(16, (viewportCenter - heroCenter) * 0.035));
      cinematicFrame.style.setProperty("--hero-parallax", `${shift.toFixed(2)}px`);
    };

    const queueHeroParallax = () => {
      if (parallaxQueued) return;
      parallaxQueued = true;
      parallaxFrame = window.requestAnimationFrame(updateHeroParallax);
    };

    updateHeroParallax();
    window.addEventListener("scroll", queueHeroParallax, { passive: true });
    window.addEventListener("resize", queueHeroParallax, { passive: true });
    window.addEventListener("pagehide", () => window.cancelAnimationFrame(parallaxFrame), { once: true });
  }
}

// 「自分のFIRE人生」のMVP共通処理。
// 記事側のSEO本文には触れず、ページの外側で訪問・読了・通知だけを管理します。
const fireLifeScriptElement = document.currentScript || Array.from(document.scripts).find((script) => script.src.endsWith("/script.js"));
const fireLifeAssetRoot = new URL(
  "./",
  fireLifeScriptElement?.src || new URL("script.js", document.baseURI).href,
);

if (!document.querySelector('link[data-fire-life-style="true"]')) {
  const fireLifeStylesheet = document.createElement("link");
  fireLifeStylesheet.rel = "stylesheet";
  fireLifeStylesheet.href = new URL("fire-life.css?v=2", fireLifeAssetRoot).href;
  fireLifeStylesheet.dataset.fireLifeStyle = "true";
  document.head.appendChild(fireLifeStylesheet);
}

const fireLifeReady = window.__wakuwakuFireLifeReady || import(new URL("data/fire-life.js?v=3", fireLifeAssetRoot).href);
window.__wakuwakuFireLifeReady = fireLifeReady;

const fireLifeToastQueue = [];
let fireLifeToastIsShowing = false;

function getFireLifeToastLayer() {
  let layer = document.querySelector(".fire-life-toast-layer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.className = "fire-life-toast-layer";
  layer.setAttribute("aria-live", "polite");
  layer.setAttribute("aria-atomic", "true");
  document.body.appendChild(layer);
  return layer;
}

function createFireLifeToast(notification) {
  const toast = document.createElement("article");
  toast.className = `fire-life-toast fire-life-toast--${notification.type || "exp"}`;

  const mark = document.createElement("span");
  mark.className = "fire-life-toast__mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = notification.icon || "🔥";

  const body = document.createElement("span");
  body.className = "fire-life-toast__body";

  const kicker = document.createElement("span");
  kicker.className = "fire-life-toast__kicker";
  kicker.textContent = notification.kicker || "FIRE LIFE";

  const title = document.createElement("strong");
  title.className = "fire-life-toast__title";
  title.textContent = notification.title || "";

  const detail = document.createElement("span");
  detail.className = "fire-life-toast__detail";
  detail.textContent = notification.detail || "";

  body.append(kicker, title, detail);
  toast.append(mark, body);
  return toast;
}

function showNextFireLifeToast() {
  if (fireLifeToastIsShowing || fireLifeToastQueue.length === 0) return;
  fireLifeToastIsShowing = true;

  const notification = fireLifeToastQueue.shift();
  const layer = getFireLifeToastLayer();
  const toast = createFireLifeToast(notification);
  layer.appendChild(toast);

  const duration = notification.duration || (notification.type === "level-up" ? 3600 : 2800);
  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      toast.remove();
      fireLifeToastIsShowing = false;
      showNextFireLifeToast();
    };
    toast.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 600);
  }, duration);
}

function enqueueFireLifeToasts(notifications) {
  fireLifeToastQueue.push(...notifications.filter(Boolean));
  showNextFireLifeToast();
}

function announceFireLifeUpdate(state) {
  window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated", { detail: { state } }));
}

function updateFireLifeEntry(state, api) {
  const level = api.getLevelFromExp(state.totalExp);
  document.querySelectorAll("[data-fire-life-level]").forEach((element) => {
    element.textContent = `Lv.${level}`;
  });

  document.querySelectorAll("[data-fire-life-entry-label]").forEach((element) => {
    element.textContent = state.welcomeSeen ? "FIRE QUESTの続きを見る" : "FIRE QUESTを始める";
  });
}

function showFireLifeWelcome(api, state) {
  if (state.welcomeSeen || document.querySelector(".fire-life-welcome")) return;

  const overlay = document.createElement("div");
  overlay.className = "fire-life-welcome";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "fire-life-welcome-title");

  const panel = document.createElement("div");
  panel.className = "fire-life-welcome__panel";

  const visual = document.createElement("div");
  visual.className = "fire-life-welcome__visual";
  const image = document.createElement("img");
  image.src = new URL("焚火.png", fireLifeAssetRoot).href;
  image.alt = "焚き火を囲みながら始まるワクワクFIREの旅";
  image.width = 1254;
  image.height = 1254;
  visual.appendChild(image);

  const copy = document.createElement("div");
  copy.className = "fire-life-welcome__copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "fire-life-welcome__eyebrow";
  eyebrow.textContent = "LV.1 START";

  const heading = document.createElement("h2");
  heading.id = "fire-life-welcome-title";
  heading.innerHTML = "ワクワクFIREへ<br /><span>ようこそ！</span>";

  const message = document.createElement("p");
  message.textContent = "ワクワクなFIRE人生の始まりだ！";

  const description = document.createElement("p");
  description.textContent = "記事を読んだり、いろんなコンテンツを楽しむとEXPやバッジが貯まります。";

  const startButton = document.createElement("button");
  startButton.className = "fire-life-welcome__start";
  startButton.type = "button";
  startButton.textContent = "はじめる";

  const closeWelcome = () => {
    state.welcomeSeen = true;
    const savedState = api.saveState(state);
    overlay.remove();
    document.body.classList.remove("fire-life-welcome-open");
    updateFireLifeEntry(savedState, api);
    announceFireLifeUpdate(savedState);
  };

  startButton.addEventListener("click", closeWelcome);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeWelcome();
  });

  copy.append(eyebrow, heading, message, description, startButton);
  panel.append(visual, copy);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  document.body.classList.add("fire-life-welcome-open");
  window.requestAnimationFrame(() => startButton.focus());
}

function addFireLifeArticleHint(article, alreadyRead) {
  if (!article?.body || article.body.parentElement?.querySelector("[data-fire-life-article-hint]")) return;

  const note = document.createElement("aside");
  note.className = "fire-life-article-hint";
  note.dataset.fireLifeArticleHint = "true";
  note.setAttribute("aria-label", "FIRE QUESTのEXP");

  const mark = document.createElement("span");
  mark.className = "fire-life-article-hint__mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "🔥";

  const copy = document.createElement("span");
  copy.className = "fire-life-article-hint__copy";

  const label = document.createElement("strong");
  label.textContent = "FIRE QUEST";

  const message = document.createElement("span");
  message.textContent = alreadyRead
    ? "このコラムのEXPは獲得済みです。"
    : "コラムをしっかり読むと、1記事につき＋10 EXP。";

  const detail = document.createElement("small");
  detail.textContent = "同じコラムでEXPが貯まるのは最初の1回だけです。";

  copy.append(label, message, detail);
  note.append(mark, copy);
  article.body.insertAdjacentElement("beforebegin", note);
}

function setupFireLifeArticleTracker(api, state) {
  const article = api.getArticleContext(window.location.pathname, document);
  if (!article) return;

  const alreadyRead = state.readArticles.includes(article.id);
  addFireLifeArticleHint(article, alreadyRead);
  if (alreadyRead) return;

  const startedAt = Date.now();
  let reachedReadingTarget = false;
  let awarded = false;
  let timerId = null;

  const getReadingRatio = () => {
    const bodyTop = article.body.getBoundingClientRect().top + window.scrollY;
    const bodyHeight = Math.max(article.body.scrollHeight, article.body.offsetHeight, 1);
    const visibleBottom = window.scrollY + window.innerHeight;
    return Math.max(0, Math.min(1, (visibleBottom - bodyTop) / bodyHeight));
  };

  const cleanup = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    window.removeEventListener("pagehide", cleanup);
    if (timerId) window.clearTimeout(timerId);
  };

  const tryComplete = () => {
    if (awarded || !reachedReadingTarget || Date.now() - startedAt < 30000) return;
    awarded = true;
    cleanup();

    const result = api.recordArticleRead(state, article.id, new Date(), { title: article.title });
    if (!result.awarded) return;

    const savedState = api.saveState(state);
    updateFireLifeEntry(savedState, api);

    const notifications = [{
      type: "exp",
      icon: "🔥",
      kicker: "記事読了！",
      title: "+10 EXP",
      detail: `Lv.${result.level}まであと${api.getExpToNextLevel(savedState.totalExp)} EXP`,
    }];

    if (result.levelUp) {
      notifications.push({
        type: "level-up",
        icon: "✦",
        kicker: "LEVEL UP!",
        title: `Lv.${result.level}`,
        detail: "FIRE人生が一段、育ちました。",
      });
    }

    result.newlyEarnedBadges.forEach((badge) => {
      notifications.push({
        type: "badge",
        icon: badge.icon,
        kicker: "NEW BADGE",
        title: `「${badge.name}」`,
        detail: badge.description,
      });
    });

    enqueueFireLifeToasts(notifications);
    announceFireLifeUpdate(savedState);
  };

  function onScroll() {
    if (getReadingRatio() >= 0.7) reachedReadingTarget = true;
    tryComplete();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("pagehide", cleanup);
  onScroll();
  timerId = window.setTimeout(tryComplete, 30000);
}

function handleFireLifeContentClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest("a[data-fire-life-content-id]");
  if (!link || !link.href) return;

  event.preventDefault();
  const destination = link.href;
  const target = link.getAttribute("target");

  fireLifeReady.then((api) => {
    const state = api.loadState();
    const result = api.recordDiscovery(state, link.dataset.fireLifeContentId);
    const savedState = api.saveState(state);
    updateFireLifeEntry(savedState, api);

    if (result.newlyEarnedBadges.length > 0) {
      enqueueFireLifeToasts(result.newlyEarnedBadges.map((badge) => ({
        type: "badge",
        icon: badge.icon,
        kicker: "NEW BADGE",
        title: `「${badge.name}」`,
        detail: badge.description,
      })));
    }
    announceFireLifeUpdate(savedState);
  }).catch(() => {}).finally(() => {
    if (target === "_blank") {
      window.open(destination, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(destination);
    }
  });
}

document.addEventListener("click", handleFireLifeContentClick, true);

function startFireLifeMvp(api) {
  const state = api.loadState();
  const hadBadgesBeforeSync = state.badges.length > 0;
  const visitResult = api.recordVisit(state);
  const notifications = visitResult.newlyEarnedBadges.map((badge) => ({
    type: "badge",
    icon: badge.icon,
    kicker: "NEW BADGE",
    title: `「${badge.name}」`,
    detail: badge.description,
  }));

  const discovery = api.getDiscoveryForPath(window.location.pathname);
  if (discovery) {
    const discoveryResult = api.recordDiscovery(state, discovery.sourceContentId);
    discoveryResult.newlyEarnedBadges.forEach((badge) => {
      notifications.push({
        type: "badge",
        icon: badge.icon,
        kicker: "NEW BADGE",
        title: `「${badge.name}」`,
        detail: badge.description,
      });
    });
  }

  const syncedThresholds = api.syncEligibleBadges(state);
  if (!hadBadgesBeforeSync) {
    syncedThresholds.newlyEarnedBadges.forEach((badge) => {
      notifications.push({
        type: "badge",
        icon: badge.icon,
        kicker: "NEW BADGE",
        title: `「${badge.name}」`,
        detail: badge.description,
      });
    });
  }

  const savedState = api.saveState(state);
  updateFireLifeEntry(savedState, api);
  setupFireLifeArticleTracker(api, savedState);

  if (!savedState.welcomeSeen) showFireLifeWelcome(api, savedState);
  enqueueFireLifeToasts(notifications);
  announceFireLifeUpdate(savedState);
}

function addFireLifeNavigationLink() {
  if (!siteNav || siteNav.querySelector("[data-fire-life-nav]")) return;

  const link = document.createElement("a");
  link.href = new URL("my-fire-life/", fireLifeAssetRoot).href;
  link.textContent = "FIRE QUEST";
  link.dataset.fireLifeNav = "true";
  if (window.location.pathname.includes("/my-fire-life")) link.setAttribute("aria-current", "page");

  const cta = siteNav.querySelector(".site-nav__cta");
  siteNav.insertBefore(link, cta || null);
}

function addFireLifeContentIds(api) {
  const externalContentIds = new Map([
    ["wakuwaku-fire-lab.marumarufire.chatgpt.site", "fire-lab"],
  ]);

  document.querySelectorAll("a[href]").forEach((link) => {
    if (link.dataset.fireLifeContentId) return;

    let url;
    try {
      url = new URL(link.href, document.baseURI);
    } catch {
      return;
    }

    const discovery = api.getDiscoveryForPath(url.pathname);
    const contentId = discovery?.sourceContentId || externalContentIds.get(url.hostname);
    if (contentId) link.dataset.fireLifeContentId = contentId;
  });
}

addFireLifeNavigationLink();
fireLifeReady.then((api) => {
  window.WakuwakuFireLife = api;
  addFireLifeContentIds(api);
  startFireLifeMvp(api);
}).catch(() => {
  // 既存ページは、MVP用モジュールが読み込めない場合も通常どおり表示します。
});

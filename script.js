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
    window.gtag("event", pageEvent, { event_category: "business", page_path: window.location.pathname });
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: pageEvent, event_category: "business", page_path: window.location.pathname });
  }
}

document.querySelectorAll("[data-analytics-event]").forEach((link) => {
  link.addEventListener("click", () => {
    const eventName = link.dataset.analyticsEvent;
    const eventLabel = link.dataset.analyticsLabel || "";
    if (!eventName) return;

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, { event_category: "business", event_label: eventLabel });
    }

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, event_category: "business", event_label: eventLabel });
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

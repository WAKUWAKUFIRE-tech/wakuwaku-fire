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

// コラム記事では、本文と一緒に読めるおすすめ記事をPCの右側に表示します。
// 元の関連記事カードを使うため、記事が追加されても自動的に内容が更新されます。
function renderArticleRecommendations() {
  const layout = document.querySelector(".article-layout");
  const articlePage = layout?.querySelector(".article-page");
  const relatedSection = layout?.querySelector(".related-articles");

  if (!layout || !articlePage || !relatedSection || layout.querySelector(".article-recommendations")) return;

  const cards = [...relatedSection.querySelectorAll(".article-preview-card")].slice(0, 5);
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
  heading.textContent = "おすすめ記事";

  const intro = document.createElement("p");
  intro.className = "article-recommendations__intro";
  intro.textContent = "気になるFIREコラムを、もう1本。";

  const list = document.createElement("ol");
  list.className = "article-recommendations__list";

  cards.forEach((card, index) => {
    const href = card.matches("a[href]")
      ? card.getAttribute("href")
      : card.querySelector("a[href]")?.getAttribute("href");
    const title = card.querySelector("h2, h3")?.textContent.trim();

    if (!href || !title) return;

    const item = document.createElement("li");
    item.className = "article-recommendations__item";

    const link = document.createElement("a");
    link.className = "article-recommendations__link";
    link.href = href;

    const number = document.createElement("span");
    number.className = "article-recommendations__number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1).padStart(2, "0");

    const body = document.createElement("span");
    body.className = "article-recommendations__body";

    const category = document.createElement("span");
    category.className = "article-recommendations__category";
    category.textContent = card.querySelector(".article-preview-card__category")?.textContent.trim() || "FIREコラム";

    const titleElement = document.createElement("strong");
    titleElement.className = "article-recommendations__article-title";
    titleElement.textContent = title;

    const date = document.createElement("span");
    date.className = "article-recommendations__date";
    date.textContent = card.querySelector(".article-preview-card__date")?.textContent.trim() || "";

    body.append(category, titleElement, date);
    link.append(number, body);
    item.append(link);
    list.append(item);
  });

  if (list.children.length === 0) return;

  aside.append(eyebrow, heading, intro, list);
  articlePage.insertAdjacentElement("afterend", aside);
}

renderArticleRecommendations();

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

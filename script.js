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
  if (dailyBookLink) {
    dailyBookLink.hidden = true;
    dailyBookLink.removeAttribute("href");
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

  if (dailyBookLink) {
    dailyBookLink.href = book.affiliateUrl;
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

// 気分転換になるランダムメッセージ。
const messageButton = document.querySelector("#message-button");
const messageText = document.querySelector("#message-text");
const messages = [
  "やりたいことは、<br /><strong>やりたいと思った日</strong>から始まってる。",
  "未来の自分に、<br /><strong>今日ちょっとだけ</strong>プレゼント。",
  "自由は、遠くにあるものじゃない。<br /><strong>小さな選択</strong>の積み重ね。",
  "迷ったら、<br /><strong>ワクワクする方</strong>へ一歩。",
  "人生は一回。<br /><strong>遊びながら考えて</strong>いい。",
];
let lastMessageIndex = 0;

if (messageButton && messageText) {
  messageButton.addEventListener("click", () => {
    let nextMessageIndex = Math.floor(Math.random() * messages.length);

    while (messages.length > 1 && nextMessageIndex === lastMessageIndex) {
      nextMessageIndex = Math.floor(Math.random() * messages.length);
    }

    lastMessageIndex = nextMessageIndex;
    messageText.innerHTML = messages[nextMessageIndex];
  });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();

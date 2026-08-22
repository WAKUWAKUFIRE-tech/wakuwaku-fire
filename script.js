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
const filterEmpty = document.querySelector("#filter-empty");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    contentCards.forEach((card) => {
      const shouldShow = selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.classList.toggle("is-hidden", !shouldShow);
      if (shouldShow) visibleCount += 1;
    });

    if (filterEmpty) filterEmpty.hidden = visibleCount !== 0;
  });
});

// 準備中の期間も楽しめる、ランダムメッセージ。
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

const fireLifePageReady = window.__wakuwakuFireLifeReady || import("../data/fire-life.js?v=4");

const lifeElements = {
  level: document.querySelector("#life-level"),
  exp: document.querySelector("#life-exp"),
  next: document.querySelector("#life-next"),
  expBar: document.querySelector("#life-exp-bar"),
  expProgress: document.querySelector(".life-exp-bar"),
  streak: document.querySelector("#life-streak"),
  visits: document.querySelector("#life-visits"),
  displayName: document.querySelector("#life-display-name"),
  avatar: document.querySelector(".life-profile-card__avatar"),
  nicknameForm: document.querySelector("[data-nickname-form]"),
  nicknameInput: document.querySelector("#life-nickname-input"),
  nicknameStatus: document.querySelector("[data-nickname-status]"),
  badgeCount: document.querySelector("#badge-count"),
  earnedBadges: document.querySelector("#earned-badges"),
  badgeEmpty: document.querySelector("#badge-empty"),
  nextBadges: document.querySelector("#next-badges-list"),
  footprints: document.querySelector("#life-footprints"),
  footprintsEmpty: document.querySelector("#life-footprints-empty"),
  footprintsNote: document.querySelector("#life-footprints-note"),
  detailDialog: document.querySelector("#badge-detail-dialog"),
  detailMark: document.querySelector("#badge-detail-mark"),
  detailCategory: document.querySelector("#badge-detail-category"),
  detailTitle: document.querySelector("#badge-detail-title"),
  detailCondition: document.querySelector("#badge-detail-condition"),
  detailDate: document.querySelector("#badge-detail-date"),
  detailDescription: document.querySelector("#badge-detail-description"),
  detailLegacy: document.querySelector("#badge-detail-legacy"),
  reset: document.querySelector("[data-reset-fire-life]"),
  exportData: document.querySelector("[data-export-fire-life]"),
  importData: document.querySelector("[data-import-fire-life]"),
  importInput: document.querySelector("[data-import-fire-life-input]"),
  dataStatus: document.querySelector("[data-data-status]"),
  futureCta: document.querySelector("[data-future-cta]"),
  devTools: document.querySelector("[data-dev-tools]"),
  devLevels: document.querySelectorAll("[data-dev-level]"),
};

function getNicknameInitial(nickname) {
  return nickname ? Array.from(nickname)[0] : "W";
}

function getCategoryLabel(api, category) {
  return api.categoryLabels[category] || String(category || "BADGE").toUpperCase();
}

const SVG_NS = "http://www.w3.org/2000/svg";

const BADGE_FRAME_PATHS = Object.freeze({
  circle: "M60 7a53 53 0 1 1 0 106a53 53 0 1 1 0-106Z",
  medal: "M60 8C32 8 15 26 15 52v11c0 25 18 43 45 49 27-6 45-24 45-49V52C105 26 88 8 60 8Z",
  shield: "M60 6l46 17v33c0 28-17 49-46 58C31 105 14 84 14 56V23L60 6Z",
  hex: "M32 8h56l24 25v54l-24 25H32L8 87V33L32 8Z",
});

const BADGE_ARTWORK = Object.freeze({
  ember: '<path class="badge-emblem__art-fill" d="M60 89c-16 0-27-10-27-25 0-11 7-20 17-29-1 12 5 18 12 22-2-13 4-25 13-35 1 18 19 23 19 42 0 14-11 25-34 25Z"/><path class="badge-emblem__cutout" d="M60 80c-6 0-11-4-11-10 0-5 3-9 8-14 0 6 3 9 6 11 0-5 2-9 5-13 1 8 8 11 8 17 0 5-5 9-16 9Z"/>',
  spark: '<path class="badge-emblem__art-fill" d="M60 22l7 29 31 9-31 9-7 29-7-29-31-9 31-9z"/><circle class="badge-emblem__art-dot" cx="31" cy="42" r="3"/><circle class="badge-emblem__art-dot" cx="89" cy="79" r="3"/>',
  compass: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="29"/><path class="badge-emblem__art-fill" d="M60 31l8 29-8 29-8-29z"/><path class="badge-emblem__art" d="M60 37v46M37 60h46"/><circle class="badge-emblem__art-dot" cx="60" cy="60" r="4"/>',
  horizon: '<circle class="badge-emblem__art-fill" cx="60" cy="43" r="13"/><path class="badge-emblem__art" d="M27 83l23-27 12 14 11-18 20 31M29 88h62"/>',
  cut: '<circle class="badge-emblem__art-ring" cx="39" cy="40" r="8"/><circle class="badge-emblem__art-ring" cx="39" cy="80" r="8"/><path class="badge-emblem__art" d="M45 46l37 32M45 74l37-32"/>',
  orbit: '<ellipse class="badge-emblem__art-ring" cx="60" cy="60" rx="35" ry="16" transform="rotate(-24 60 60)"/><path class="badge-emblem__art-fill" d="M60 41l11 19-11 19-11-19z"/><circle class="badge-emblem__art-dot" cx="89" cy="44" r="4"/>',
  arrow: '<path class="badge-emblem__art" d="M29 73h51M67 57l16 16-16 16M29 73V43h26"/><circle class="badge-emblem__art-dot" cx="29" cy="43" r="3"/>',
  wings: '<path class="badge-emblem__art" d="M57 55C46 39 34 32 24 35c8 9 11 20 11 31 8-4 15-3 22 2M63 55c11-16 23-23 33-20-8 9-11 20-11 31-8-4-15-3-22 2M60 51v37"/>',
  blueprint: '<rect class="badge-emblem__art-ring" x="29" y="29" width="62" height="62" rx="4"/><path class="badge-emblem__art-muted" d="M43 29v62M58 29v62M74 29v62M29 45h62M29 61h62M29 77h62"/>',
  clock: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="29"/><path class="badge-emblem__art" d="M60 42v19l14 9"/><circle class="badge-emblem__art-dot" cx="60" cy="60" r="4"/><path class="badge-emblem__art-muted" d="M60 25v6M95 60h-6M60 95v-6M25 60h6"/>',
  rewind: '<path class="badge-emblem__art-fill" d="M49 34L27 60l22 26zM83 34L61 60l22 26z"/><path class="badge-emblem__art" d="M27 60h61"/>',
  ticket: '<path class="badge-emblem__art" d="M27 39h66v15a8 8 0 0 0 0 12v15H27V66a8 8 0 0 0 0-12z"/><path class="badge-emblem__art-muted" d="M52 42v36M67 42v36"/><circle class="badge-emblem__art-dot" cx="42" cy="60" r="3"/>',
  sun: '<circle class="badge-emblem__art-fill" cx="60" cy="60" r="15"/><path class="badge-emblem__art" d="M60 25v12M60 83v12M25 60h12M83 60h12M35 35l9 9M76 76l9 9M85 35l-9 9M44 76l-9 9"/>',
  cup: '<path class="badge-emblem__art" d="M37 42h39v19c0 11-8 18-19 18s-20-7-20-18zM76 48h7c6 0 9 4 9 9s-3 10-9 10h-7M47 87h26"/>',
  camp: '<path class="badge-emblem__art" d="M26 86l34-52 34 52M37 69h46M47 55l13 15 13-15"/><path class="badge-emblem__art-fill" d="M60 84c-6 0-10-4-10-9 0-4 3-7 6-10 0 4 2 6 4 7 0-5 3-8 5-11 0 6 7 8 7 14 0 5-4 9-12 9Z"/>',
  play: '<circle class="badge-emblem__art-ring" cx="60" cy="60" r="31"/><path class="badge-emblem__art-fill" d="M51 42l27 18-27 18z"/><path class="badge-emblem__art-muted" d="M34 60h9M77 60h9"/>',
  bolt: '<path class="badge-emblem__art-fill" d="M68 24L38 64h21l-6 33 29-43H61z"/>',
  map: '<path class="badge-emblem__art" d="M27 33l23-9 20 9 23-9v64l-23 9-20-9-23 9zM50 24v64M70 33v64"/><path class="badge-emblem__art-muted" d="M35 49h8M78 51h8"/>',
  flag: '<path class="badge-emblem__art" d="M39 92V28M39 31c17 10 25-9 43 2v31c-18-11-26 8-43-2"/><circle class="badge-emblem__art-dot" cx="39" cy="22" r="4"/>',
  lens: '<circle class="badge-emblem__art-ring" cx="55" cy="54" r="22"/><path class="badge-emblem__art" d="M71 70l19 19"/><path class="badge-emblem__art-fill" d="M55 39l4 11 12 4-12 4-4 12-4-12-12-4 12-4z"/>',
  flask: '<path class="badge-emblem__art" d="M49 25h22M54 25v23L37 80c-3 6 1 11 8 11h30c7 0 11-5 8-11L66 48V25M45 69h30"/><circle class="badge-emblem__art-dot" cx="57" cy="60" r="3"/><circle class="badge-emblem__art-dot" cx="68" cy="54" r="2"/>',
  paw: '<circle class="badge-emblem__art-fill" cx="39" cy="43" r="7"/><circle class="badge-emblem__art-fill" cx="57" cy="35" r="7"/><circle class="badge-emblem__art-fill" cx="76" cy="43" r="7"/><path class="badge-emblem__art-fill" d="M60 86c-13 0-23-7-23-17 0-9 8-15 15-15 4 0 6 2 8 4 2-2 4-4 8-4 7 0 15 6 15 15 0 10-10 17-23 17Z"/>',
  risk: '<path class="badge-emblem__art" d="M26 76l18-20 12 12 21-32 17 14"/><path class="badge-emblem__art-muted" d="M31 89h58M60 26v13"/><circle class="badge-emblem__art-dot" cx="60" cy="22" r="4"/>',
  flower: '<path class="badge-emblem__art" d="M60 54v36M60 70c-10-8-17-8-23-3M60 78c10-8 17-8 23-3"/><circle class="badge-emblem__art-fill" cx="60" cy="47" r="9"/><circle class="badge-emblem__art-ring" cx="60" cy="32" r="9"/><circle class="badge-emblem__art-ring" cx="45" cy="47" r="9"/><circle class="badge-emblem__art-ring" cx="75" cy="47" r="9"/>',
  trail: '<path class="badge-emblem__art" d="M29 77c10-21 22-30 35-27 12 3 18 0 27-12M36 91c9-13 17-17 26-14 10 3 17 1 24-6"/><circle class="badge-emblem__art-dot" cx="29" cy="77" r="4"/><circle class="badge-emblem__art-dot" cx="92" cy="38" r="4"/>',
  sprout: '<path class="badge-emblem__art" d="M60 89V53M60 65C49 53 39 52 31 57c6 10 16 14 29 11M60 58c7-14 17-20 29-18-1 14-10 22-26 24"/><circle class="badge-emblem__art-dot" cx="60" cy="43" r="4"/>',
  "home-flame": '<path class="badge-emblem__art" d="M29 57l31-27 31 27v30H29zM47 87V67h26v20"/><path class="badge-emblem__art-fill" d="M60 79c-7 0-12-5-12-11 0-5 4-9 8-14 0 6 3 8 6 10 0-5 3-10 7-14 0 9 9 12 9 20 0 5-5 9-18 9Z"/>',
  calendar: '<rect class="badge-emblem__art-ring" x="29" y="31" width="62" height="59" rx="5"/><path class="badge-emblem__art" d="M29 48h62M44 25v13M76 25v13M43 61h1M59 61h1M75 61h1M43 76h1M59 76h1M75 76h1"/>',
  seat: '<path class="badge-emblem__art" d="M38 40v24h45M38 64l-8 27M83 64l8 27M38 40h36c5 0 9 4 9 9v15M38 64h45"/><path class="badge-emblem__art-muted" d="M29 91h63"/>',
  village: '<path class="badge-emblem__art" d="M25 87V57l15-13 15 13v30M55 87V49l17-15 17 15v38M38 87V72h5v15M69 87V70h6v17"/><circle class="badge-emblem__art-dot" cx="40" cy="62" r="3"/><circle class="badge-emblem__art-dot" cx="72" cy="55" r="3"/>',
  tree: '<path class="badge-emblem__art" d="M60 54v37M48 91h24M60 68L46 56M60 76l16-15"/><path class="badge-emblem__art-fill" d="M60 24c-10 0-17 8-15 17-10-1-17 6-17 15 0 10 8 17 18 17h28c10 0 18-7 18-17 0-9-7-16-17-15 2-9-5-17-15-17Z"/>',
  home: '<path class="badge-emblem__art" d="M27 57l33-28 33 28v32H27zM48 89V68h24v21M38 56h5M77 56h5"/>',
});

const DEFAULT_BADGE_ART = Object.freeze({
  level: "ember",
  discovery: "compass",
  streak: "trail",
  visit: "compass",
  legacy: "spark",
});

function createBadgeEmblem(badge, { locked = false } = {}) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const shape = badge.shape || "circle";
  const frame = BADGE_FRAME_PATHS[shape] || BADGE_FRAME_PATHS.circle;
  const artKey = badge.artKey || DEFAULT_BADGE_ART[badge.category] || "spark";
  const artwork = locked
    ? '<text class="badge-emblem__question" x="60" y="77">?</text>'
    : BADGE_ARTWORK[artKey] || BADGE_ARTWORK.spark;

  svg.classList.add("badge-emblem", `my-badge--${shape}`, `badge-tone-${badge.tone || "gray"}`);
  svg.classList.add(locked ? "badge-emblem--locked" : "badge-emblem--earned");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", locked ? "未取得バッジ" : badge.name || "獲得バッジ");
  svg.innerHTML = `
    <path class="badge-emblem__shadow" d="${frame}" transform="translate(0 3)" />
    <path class="badge-emblem__rim" d="${frame}" />
    <path class="badge-emblem__face" d="${frame}" transform="translate(4 4) scale(.9333)" />
    <path class="badge-emblem__inner-line" d="${frame}" transform="translate(9 9) scale(.85)" />
    <path class="badge-emblem__crest" d="M60 4l5 7-5 7-5-7z" />
    <path class="badge-emblem__rune" d="M27 98h17M76 98h17" />
    <g class="badge-emblem__art">${artwork}</g>
  `;
  return svg;
}

function createBadgeCard(api, badge) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `badge-card badge-card--${badge.category} badge-tone-${badge.tone || "gray"}`;
  card.setAttribute("aria-label", `${badge.name}の詳細を見る`);

  const visual = document.createElement("span");
  visual.className = "badge-card__visual";
  const seal = createBadgeEmblem(badge);
  seal.classList.add("badge-card__seal");
  seal.setAttribute("aria-hidden", "true");
  visual.appendChild(seal);

  const body = document.createElement("span");
  body.className = "badge-card__body";

  const category = document.createElement("span");
  category.className = "badge-card__category";
  category.textContent = getCategoryLabel(api, badge.category);

  const name = document.createElement("strong");
  name.className = "badge-card__name";
  name.textContent = badge.name;

  const condition = document.createElement("span");
  condition.className = "badge-card__condition";
  condition.textContent = badge.condition;

  const date = document.createElement("span");
  date.className = "badge-card__date";
  date.textContent = `獲得日：${api.formatDate(badge.earnedAt)}`;

  body.append(category, name, condition, date);

  if (badge.legacy) {
    const legacy = document.createElement("span");
    legacy.className = "badge-card__legacy";
    legacy.textContent = "現在は獲得できないバッジです。";
    body.appendChild(legacy);
  }

  card.append(visual, body);
  card.addEventListener("click", () => openBadgeDetail(api, badge));
  return card;
}

function createNextBadge(api, state, badge) {
  const item = document.createElement("article");
  item.className = "next-badge next-badge--locked";
  item.classList.add(`badge-tone-${badge.tone || "gray"}`);

  const seal = createBadgeEmblem(badge, { locked: true });
  seal.classList.add("next-badge__seal");
  seal.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "next-badge__body";

  const category = document.createElement("span");
  category.className = "next-badge__category";
  category.textContent = getCategoryLabel(api, badge.category);

  const name = document.createElement("strong");
  name.className = "next-badge__name";
  name.textContent = badge.name;

  const condition = document.createElement("span");
  condition.className = "next-badge__condition";
  condition.textContent = badge.condition;

  const distance = document.createElement("strong");
  distance.className = "next-badge__distance";
  distance.textContent = api.getBadgeDistance(state, badge).label;

  body.append(category, name, distance, condition);
  item.append(seal, body);
  return item;
}

const footprintCategoryLabels = Object.freeze({
  START: "はじまり",
  VISIT: "訪問",
  READ: "読了",
  BADGE: "バッジ",
});

function createFootprint(api, footprint) {
  const item = document.createElement("article");
  item.className = `life-footprint life-footprint--${footprint.category.toLowerCase()}`;

  const marker = document.createElement("span");
  marker.className = "life-footprint__marker";
  marker.setAttribute("aria-hidden", "true");
  if (footprint.category === "BADGE") {
    marker.classList.add("life-footprint__marker--badge");
    marker.appendChild(createBadgeEmblem(footprint));
  } else {
    marker.textContent = footprint.icon || "•";
  }

  const body = document.createElement("div");
  body.className = "life-footprint__body";

  const category = document.createElement("span");
  category.className = "life-footprint__category";
  category.textContent = footprintCategoryLabels[footprint.category] || footprint.category;

  const title = document.createElement("h3");
  title.className = "life-footprint__title";
  title.textContent = footprint.title;

  const detail = document.createElement("p");
  detail.className = "life-footprint__detail";
  detail.textContent = footprint.detail;

  const date = document.createElement("time");
  date.className = "life-footprint__date";
  if (footprint.dateValue) date.dateTime = footprint.dateValue;
  date.textContent = api.formatDate(footprint.dateValue);

  body.append(category, title, detail, date);
  item.append(marker, body);
  return item;
}

function openBadgeDetail(api, badge) {
  if (!lifeElements.detailDialog) return;

  lifeElements.detailMark.className = "badge-detail-dialog__badge";
  lifeElements.detailMark.replaceChildren(createBadgeEmblem(badge));
  lifeElements.detailCategory.textContent = getCategoryLabel(api, badge.category);
  lifeElements.detailTitle.textContent = badge.name;
  lifeElements.detailCondition.textContent = badge.condition;
  lifeElements.detailDate.textContent = api.formatDate(badge.earnedAt);
  lifeElements.detailDescription.textContent = badge.description;
  lifeElements.detailLegacy.hidden = !badge.legacy;

  if (typeof lifeElements.detailDialog.showModal === "function") {
    lifeElements.detailDialog.showModal();
  } else {
    lifeElements.detailDialog.setAttribute("open", "");
  }
}

function closeBadgeDetail() {
  if (!lifeElements.detailDialog) return;
  if (typeof lifeElements.detailDialog.close === "function") {
    lifeElements.detailDialog.close();
  } else {
    lifeElements.detailDialog.removeAttribute("open");
  }
}

function renderLifePage(api) {
  const state = api.loadState();
  const level = api.getLevelFromExp(state.totalExp);
  const progress = api.getLevelProgress(state.totalExp);
  const earnedBadges = api.getEarnedBadges(state);
  const nextBadges = api.getNextBadges(state, 3);
  const footprints = api.getFootprints(state, 8);
  const displayName = state.nickname || "名無しの冒険者";

  if (lifeElements.level) lifeElements.level.textContent = String(level);
  if (lifeElements.exp) lifeElements.exp.textContent = `${state.totalExp.toLocaleString("ja-JP")} EXP`;
  if (lifeElements.next) lifeElements.next.textContent = `Lv.${level + 1}まであと${api.getExpToNextLevel(state.totalExp)} EXP`;
  if (lifeElements.displayName) lifeElements.displayName.textContent = displayName;
  if (lifeElements.avatar) lifeElements.avatar.textContent = getNicknameInitial(state.nickname);
  if (lifeElements.nicknameInput && document.activeElement !== lifeElements.nicknameInput) lifeElements.nicknameInput.value = state.nickname;
  if (lifeElements.streak) lifeElements.streak.textContent = `${state.currentStreak}日`;
  if (lifeElements.visits) lifeElements.visits.textContent = `${state.totalVisitDays}日`;
  if (lifeElements.expBar) lifeElements.expBar.style.width = `${progress}%`;
  if (lifeElements.expProgress) lifeElements.expProgress.setAttribute("aria-valuenow", String(progress));
  if (lifeElements.badgeCount) lifeElements.badgeCount.textContent = `${earnedBadges.length}個`;

  if (lifeElements.earnedBadges) {
    lifeElements.earnedBadges.replaceChildren(...earnedBadges.map((badge) => createBadgeCard(api, badge)));
  }
  if (lifeElements.badgeEmpty) lifeElements.badgeEmpty.toggleAttribute("hidden", earnedBadges.length > 0);

  if (lifeElements.nextBadges) {
    if (nextBadges.length > 0) {
      lifeElements.nextBadges.replaceChildren(...nextBadges.map((badge) => createNextBadge(api, state, badge)));
    } else {
      const empty = document.createElement("p");
      empty.className = "next-badges__empty";
      empty.textContent = "次の寄り道を、ゆっくり探しています。";
      lifeElements.nextBadges.replaceChildren(empty);
    }
  }

  if (lifeElements.footprints) {
    lifeElements.footprints.replaceChildren(...footprints.map((footprint) => createFootprint(api, footprint)));
  }
  if (lifeElements.footprintsEmpty) lifeElements.footprintsEmpty.toggleAttribute("hidden", footprints.length > 0);
  if (lifeElements.footprintsNote) {
    const sourceEventCount = (state.firstVisitDate ? 1 : 0) + Math.max(0, state.visitDates.length - (state.firstVisitDate ? 1 : 0)) + state.articleReadHistory.length + state.badges.length;
    lifeElements.footprintsNote.toggleAttribute("hidden", sourceEventCount <= footprints.length);
  }
}

fireLifePageReady.then((api) => {
  renderLifePage(api);
  window.addEventListener("wakuwaku:fire-life-updated", () => renderLifePage(api));

  const params = new URLSearchParams(window.location.search);
  const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (lifeElements.devTools && (isLocalPreview || params.get("dev") === "1")) {
    lifeElements.devTools.hidden = false;
  }

  lifeElements.nicknameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = api.loadState();
    state.nickname = lifeElements.nicknameInput?.value || "";
    const savedState = api.saveState(state);
    renderLifePage(api);
    if (lifeElements.nicknameStatus) {
      lifeElements.nicknameStatus.textContent = savedState.nickname
        ? `「${savedState.nickname}」として保存しました。`
        : "ニックネームを消去しました。";
    }
    window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated"));
  });

  lifeElements.exportData?.addEventListener("click", () => {
    try {
      const backup = api.createBackup(api.loadState());
      const blob = new Blob([backup], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wakuwaku-fire-life-${api.getTokyoDateKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "バックアップを保存しました。";
    } catch {
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "データを保存できませんでした。";
    }
  });

  lifeElements.importData?.addEventListener("click", () => lifeElements.importInput?.click());
  lifeElements.importInput?.addEventListener("change", async () => {
    const file = lifeElements.importInput.files?.[0];
    if (!file) return;

    try {
      const contents = await file.text();
      const previewState = api.parseBackup(contents);
      const previewLevel = api.getLevelFromExp(previewState.totalExp);
      const shouldRestore = window.confirm(`Lv.${previewLevel}・${previewState.totalExp.toLocaleString("ja-JP")} EXPのFIRE人生データで、現在のデータを上書きしますか？`);
      if (!shouldRestore) {
        if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "復元をキャンセルしました。";
        return;
      }
      const restoredState = api.restoreBackup(contents);
      renderLifePage(api);
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = "FIRE人生データを復元しました。";
      window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated", { detail: { state: restoredState } }));
    } catch (error) {
      if (lifeElements.dataStatus) lifeElements.dataStatus.textContent = error instanceof Error ? error.message : "データを復元できませんでした。";
    } finally {
      lifeElements.importInput.value = "";
    }
  });

  document.querySelector("[data-close-badge-dialog]")?.addEventListener("click", closeBadgeDetail);
  lifeElements.detailDialog?.addEventListener("click", (event) => {
    if (event.target === lifeElements.detailDialog) closeBadgeDetail();
  });

  lifeElements.reset?.addEventListener("click", () => {
    const shouldReset = window.confirm("この端末に保存されているFIRE人生データを初期化しますか？");
    if (!shouldReset) return;
    api.resetState();
    window.location.reload();
  });

  lifeElements.devLevels.forEach((button) => {
    button.addEventListener("click", () => {
      const targetLevel = Number(button.dataset.devLevel);
      if (!Number.isFinite(targetLevel) || targetLevel < 1) return;
      const state = api.loadState();
      state.totalExp = (targetLevel - 1) * 100;
      api.syncEligibleBadges(state);
      api.saveState(state);
      renderLifePage(api);
      window.dispatchEvent(new CustomEvent("wakuwaku:fire-life-updated"));
    });
  });

  lifeElements.futureCta?.addEventListener("click", () => {
    lifeElements.futureCta.textContent = "会員機能は準備中です";
    lifeElements.futureCta.setAttribute("aria-disabled", "true");
  });
}).catch(() => {
  // 共通MVPが利用できない場合も、ページの静的な案内は表示します。
});



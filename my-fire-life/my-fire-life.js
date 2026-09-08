const fireLifePageReady = window.__wakuwakuFireLifeReady || import("../data/fire-life.js?v=3");

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

function addBadgeVisualClasses(element, badge) {
  element.classList.add(`my-badge--${badge.shape || "circle"}`, `badge-tone-${badge.tone || "gray"}`);
}

function createBadgeCard(api, badge) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `badge-card badge-card--${badge.category}`;
  card.setAttribute("aria-label", `${badge.name}の詳細を見る`);

  const visual = document.createElement("span");
  visual.className = "badge-card__visual";
  const seal = document.createElement("span");
  seal.className = "badge-card__seal";
  addBadgeVisualClasses(seal, badge);
  seal.setAttribute("aria-hidden", "true");
  seal.textContent = badge.icon || "🏅";
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

  const seal = document.createElement("span");
  seal.className = `next-badge__seal my-badge--${badge.shape || "circle"}`;
  seal.setAttribute("aria-hidden", "true");
  seal.textContent = "?";

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
  marker.textContent = footprint.icon || "•";

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
  addBadgeVisualClasses(lifeElements.detailMark, badge);
  lifeElements.detailMark.textContent = badge.icon || "🏅";
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
  const displayName = state.nickname || "FIRE QUEST";

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



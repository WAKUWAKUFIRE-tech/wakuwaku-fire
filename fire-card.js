(() => {
  const cards = Array.isArray(window.wakuwakuFireCards) ? window.wakuwakuFireCards : [];
  const section = document.querySelector("#fire-card-section");

  if (!section || cards.length === 0) return;

  const STORAGE_KEYS = {
    collection: "wakuwakuFireCardCollectionV1",
    lastDraw: "wakuwakuFireCardLastDrawDateV1",
    completed: "wakuwakuFireCardCompletedV1",
    drawLock: "wakuwakuFireCardDrawLockV1",
  };
  const memoryStorage = new Map();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const elements = {
    count: document.querySelector("#fire-card-count"),
    status: document.querySelector("#fire-card-status"),
    next: document.querySelector("#fire-card-next"),
    drawButton: document.querySelector("#fire-card-draw-button"),
    collectionButton: document.querySelector("#fire-card-collection-button"),
    dailyModal: document.querySelector("#fire-card-daily-modal"),
    dailyStage: document.querySelector("#fire-card-daily-stage"),
    dailyImage: document.querySelector("#fire-card-daily-image"),
    dailyNew: document.querySelector("#fire-card-daily-new"),
    dailyResult: document.querySelector("#fire-card-daily-result"),
    dailyName: document.querySelector("#fire-card-daily-name"),
    dailyRarity: document.querySelector("#fire-card-daily-rarity"),
    dailyComplete: document.querySelector("#fire-card-daily-complete"),
    dailyAction: document.querySelector("#fire-card-daily-action"),
    collectionModal: document.querySelector("#fire-card-collection-modal"),
    collectionGrid: document.querySelector("#fire-card-collection-grid"),
    collectionCount: document.querySelector("#fire-card-collection-count"),
    collectionStatus: document.querySelector("#fire-card-collection-status"),
    detailModal: document.querySelector("#fire-card-detail-modal"),
    detailImage: document.querySelector("#fire-card-detail-image"),
    detailLocked: document.querySelector("#fire-card-detail-locked"),
    detailName: document.querySelector("#fire-card-detail-name"),
    detailRarity: document.querySelector("#fire-card-detail-rarity"),
  };

  const collectedIdSet = new Set(cards.map((card) => Number(card.id)));
  let pendingCard = null;
  let isDrawing = false;
  let autoOpenedDate = null;
  let lastObservedDate = getTokyoDateKey();

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return memoryStorage.has(key) ? memoryStorage.get(key) : null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      memoryStorage.set(key, value);
    }
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      memoryStorage.delete(key);
    }
  }

  function getTokyoDateKey() {
    const parts = dateFormatter.formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function getNextTokyoMidnight() {
    const [year, month, day] = getTokyoDateKey().split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1) - (9 * 60 * 60 * 1000));
  }

  function formatUntilNextCard() {
    const milliseconds = Math.max(0, getNextTokyoMidnight().getTime() - Date.now());
    const totalMinutes = Math.ceil(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) return `次のカードまであと${hours}時間${minutes}分`;
    return `次のカードまであと${Math.max(1, minutes)}分`;
  }

  function getState() {
    let collection = [];

    try {
      const parsed = JSON.parse(storageGet(STORAGE_KEYS.collection) || "[]");
      collection = Array.isArray(parsed) ? parsed.map(Number).filter((id) => collectedIdSet.has(id)) : [];
    } catch (error) {
      collection = [];
    }

    collection = [...new Set(collection)];
    const completed = storageGet(STORAGE_KEYS.completed) === "true" || collection.length >= cards.length;

    return {
      collection,
      collectionSet: new Set(collection),
      lastDrawDate: storageGet(STORAGE_KEYS.lastDraw) || "",
      completed,
    };
  }

  function saveState(collection, lastDrawDate) {
    const uniqueCollection = [...new Set(collection.map(Number))].filter((id) => collectedIdSet.has(id));
    storageSet(STORAGE_KEYS.collection, JSON.stringify(uniqueCollection));
    storageSet(STORAGE_KEYS.lastDraw, lastDrawDate);
    storageSet(STORAGE_KEYS.completed, String(uniqueCollection.length >= cards.length));
  }

  function isModalOpen(modal) {
    return Boolean(modal && !modal.hidden);
  }

  function updateBodyLock() {
    const open = [elements.dailyModal, elements.collectionModal, elements.detailModal].some(isModalOpen);
    document.body.classList.toggle("fire-card-modal-open", open);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    updateBodyLock();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    updateBodyLock();
  }

  function closeAllModals() {
    closeModal(elements.detailModal);
    closeModal(elements.collectionModal);
    closeModal(elements.dailyModal);
  }

  function setImageSource(image, path, alt) {
    if (!image) return;
    image.src = new URL(path, document.baseURI).href;
    image.alt = alt;
  }

  function renderSummary() {
    const state = getState();
    const today = getTokyoDateKey();
    const hasDrawnToday = state.lastDrawDate === today;

    if (elements.count) elements.count.textContent = `${state.collection.length} / ${cards.length}`;
    if (elements.collectionButton) elements.collectionButton.textContent = `🔥 FIREカード ${state.collection.length} / ${cards.length}`;

    if (state.completed) {
      if (elements.status) elements.status.textContent = "🎉 FIREカード 第1弾 COMPLETE！";
      if (elements.next) elements.next.textContent = "全10種類を集めました。図鑑からいつでも見返せます。";
    } else if (hasDrawnToday) {
      if (elements.status) elements.status.textContent = "本日のカード GET済み！";
      if (elements.next) elements.next.textContent = `次のカードは明日。${formatUntilNextCard()}`;
    } else {
      if (elements.status) elements.status.textContent = "本日のカードを受け取ろう！";
      if (elements.next) elements.next.textContent = "1日1枚、重複なしで集まります。";
    }

    if (elements.drawButton) {
      elements.drawButton.disabled = state.completed || hasDrawnToday || isDrawing;
      elements.drawButton.setAttribute("aria-disabled", String(elements.drawButton.disabled));
    }
  }

  function resetDailyVisual() {
    if (!elements.dailyStage) return;
    elements.dailyStage.className = "fire-card-draw-stage";
    if (elements.dailyImage) {
      elements.dailyImage.hidden = true;
      elements.dailyImage.removeAttribute("src");
      elements.dailyImage.alt = "";
    }
    if (elements.dailyNew) elements.dailyNew.hidden = true;
    if (elements.dailyResult) elements.dailyResult.hidden = true;
    if (elements.dailyComplete) elements.dailyComplete.hidden = true;
    if (elements.dailyName) elements.dailyName.textContent = "";
    if (elements.dailyRarity) elements.dailyRarity.textContent = "";
    if (elements.dailyAction) {
      elements.dailyAction.disabled = false;
      elements.dailyAction.textContent = "カードを引く";
    }
  }

  function openDailyModal() {
    const state = getState();
    const today = getTokyoDateKey();
    if (state.completed || state.lastDrawDate === today || isDrawing) {
      renderSummary();
      return;
    }

    pendingCard = null;
    resetDailyVisual();
    openModal(elements.dailyModal);
  }

  function renderCollection() {
    const state = getState();
    if (elements.collectionCount) elements.collectionCount.textContent = `${state.collection.length} / ${cards.length}`;
    if (!elements.collectionGrid) return;

    elements.collectionGrid.replaceChildren();
    cards.forEach((card) => {
      const collected = state.collectionSet.has(Number(card.id));
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = `fire-card-slot${collected ? " is-collected" : " is-locked"}`;
      slot.dataset.fireCardId = String(card.id);
      slot.setAttribute("aria-label", collected ? `${card.name}のカードを見る` : `No.${card.number}のカードはロック中`);

      if (collected) {
        const image = document.createElement("img");
        image.loading = "lazy";
        image.decoding = "async";
        setImageSource(image, card.image, `${card.name} FIREカード`);
        slot.append(image);
      } else {
        const question = document.createElement("span");
        question.className = "fire-card-slot__question";
        question.textContent = "?";
        slot.append(question);
      }

      const number = document.createElement("span");
      number.className = "fire-card-slot__number";
      number.textContent = `No.${card.number}`;
      slot.append(number);
      slot.addEventListener("click", () => openDetail(card, collected));
      elements.collectionGrid.append(slot);
    });

    if (elements.collectionStatus) {
      elements.collectionStatus.textContent = state.completed
        ? "🎉 第1弾コンプリート！すべてのFIREカードに出会いました。"
        : "集めたカードをタップすると、詳細を見られます。ロック中のカードは、これからのお楽しみ。";
    }
  }

  function openCollection() {
    renderCollection();
    openModal(elements.collectionModal);
  }

  function openDetail(card, collected) {
    if (!elements.detailModal) return;

    if (elements.detailImage) {
      elements.detailImage.hidden = !collected;
      if (collected) setImageSource(elements.detailImage, card.image, `${card.name} FIREカード`);
      else elements.detailImage.removeAttribute("src");
    }
    if (elements.detailLocked) elements.detailLocked.hidden = collected;
    if (elements.detailName) elements.detailName.textContent = collected ? card.name : `No.${card.number}`;
    if (elements.detailRarity) elements.detailRarity.textContent = collected ? card.rarityLabel : "LOCKED";
    elements.detailModal.dataset.rarity = card.rarity;
    openModal(elements.detailModal);
  }

  function acquireDrawLock() {
    const existing = storageGet(STORAGE_KEYS.drawLock) || "";
    const existingStamp = Number(existing.split("|")[1]);
    if (existing && Number.isFinite(existingStamp) && Date.now() - existingStamp < 5000) return null;

    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const lockValue = `${token}|${Date.now()}`;
    storageSet(STORAGE_KEYS.drawLock, lockValue);
    return storageGet(STORAGE_KEYS.drawLock) === lockValue ? token : null;
  }

  function releaseDrawLock(token) {
    const current = storageGet(STORAGE_KEYS.drawLock) || "";
    if (token && current.startsWith(`${token}|`)) storageRemove(STORAGE_KEYS.drawLock);
  }

  function revealCard(card, completed) {
    if (!elements.dailyStage) return;

    elements.dailyStage.className = `fire-card-draw-stage is-opening rarity-${card.rarity}${completed ? " is-complete" : ""}`;
    window.setTimeout(() => {
      setImageSource(elements.dailyImage, card.image, `${card.name} FIREカード`);
      elements.dailyImage.hidden = false;
      elements.dailyStage.classList.add("is-revealed");
      elements.dailyNew.hidden = false;
      elements.dailyResult.hidden = false;
      elements.dailyName.textContent = card.name;
      elements.dailyRarity.textContent = card.rarityLabel;
      elements.dailyComplete.hidden = !completed;
      elements.dailyAction.disabled = false;
      elements.dailyAction.textContent = completed ? "コンプリートを確認" : "カード図鑑を見る";
      isDrawing = false;
      renderSummary();
    }, 2250);
  }

  function drawCard() {
    if (isDrawing) return;

    const today = getTokyoDateKey();
    const initialState = getState();
    if (initialState.completed || initialState.lastDrawDate === today) {
      renderSummary();
      closeModal(elements.dailyModal);
      return;
    }

    const lockToken = acquireDrawLock();
    if (!lockToken) return;

    try {
      const state = getState();
      if (state.completed || state.lastDrawDate === today) {
        renderSummary();
        closeModal(elements.dailyModal);
        return;
      }

      const availableCards = cards.filter((card) => !state.collectionSet.has(Number(card.id)));
      if (availableCards.length === 0) {
        saveState(state.collection, today);
        renderSummary();
        closeModal(elements.dailyModal);
        return;
      }

      const selected = availableCards[Math.floor(Math.random() * availableCards.length)];
      const nextCollection = [...state.collection, Number(selected.id)];
      const completed = nextCollection.length >= cards.length;
      saveState(nextCollection, today);
      pendingCard = selected;
      isDrawing = true;
      elements.dailyAction.disabled = true;
      elements.dailyStage.classList.remove("is-revealed");
      revealCard(selected, completed);
    } finally {
      releaseDrawLock(lockToken);
    }
  }

  function maybeOpenForToday() {
    const today = getTokyoDateKey();
    if (autoOpenedDate === today) return;
    const state = getState();
    if (state.completed || state.lastDrawDate === today) return;

    autoOpenedDate = today;
    window.setTimeout(() => {
      if (!document.hidden) openDailyModal();
    }, 650);
  }

  function handleDateChange() {
    const today = getTokyoDateKey();
    if (today !== lastObservedDate) {
      lastObservedDate = today;
      renderSummary();
      maybeOpenForToday();
    } else {
      renderSummary();
    }
  }

  function resetForDevelopment() {
    Object.values(STORAGE_KEYS).forEach(storageRemove);
    window.location.reload();
  }

  elements.drawButton?.addEventListener("click", openDailyModal);
  elements.collectionButton?.addEventListener("click", openCollection);
  elements.dailyAction?.addEventListener("click", () => {
    if (pendingCard) {
      closeModal(elements.dailyModal);
      openCollection();
    } else {
      drawCard();
    }
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-fire-card-close]");
    if (!closeTarget) return;
    const target = closeTarget.dataset.fireCardClose;
    if (target === "daily") closeModal(elements.dailyModal);
    if (target === "collection") closeModal(elements.collectionModal);
    if (target === "detail") closeModal(elements.detailModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isModalOpen(elements.detailModal)) closeModal(elements.detailModal);
    else if (isModalOpen(elements.collectionModal)) closeModal(elements.collectionModal);
    else if (isModalOpen(elements.dailyModal)) closeModal(elements.dailyModal);
  });

  window.addEventListener("pageshow", handleDateChange);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) handleDateChange();
  });
  window.setInterval(handleDateChange, 30000);

  window.resetWakuwakuFireCards = resetForDevelopment;
  renderSummary();
  maybeOpenForToday();
})();

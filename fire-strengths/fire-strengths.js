import {
  QUESTIONS,
  TRAITS,
  DOMAINS,
  FIRE_TYPES,
  TRAIT_BY_ID,
  TYPE_BY_ID,
  calculateFireStrengthResult,
  getRarityLabel
} from "../data/fire-strengths-data.js";

const app = document.querySelector("#fire-strengths-app");
if (app) {
  const isStatsPage = app.dataset.page === "stats";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    displayName: "",
    answers: [],
    responseTimes: [],
    questionIndex: 0,
    questionShownAt: 0,
    answerLocked: false,
    result: null,
    resultId: "",
    stats: null,
    pendingSave: null
  };

  const qs = (selector) => app.querySelector(selector);
  const qsa = (selector) => [...app.querySelectorAll(selector)];
  const live = qs("#fs-live");

  function announce(message) {
    if (live) live.textContent = message;
  }

  function scrollToApp() {
    const top = Math.max(0, app.getBoundingClientRect().top + window.scrollY - 86);
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function setScreen(name, shouldScroll = true) {
    qsa("[data-screen]").forEach((screen) => {
      const active = screen.dataset.screen === name;
      screen.hidden = !active;
      screen.setAttribute("aria-hidden", String(!active));
    });
    app.dataset.screen = name;
    if (shouldScroll) scrollToApp();
  }

  function randomUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") window.crypto.getRandomValues(bytes);
    else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function track(eventName, extra = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, extra);
      return;
    }
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: eventName, ...extra });
  }

  function normalizeName(value) {
    return String(value || "").trim().replace(/[\t\r\n ]+/g, " ");
  }

  function validName(value) {
    const length = [...value].length;
    return length >= 1 && length <= 20;
  }

  function updateNameCounter() {
    const input = qs("#fs-name-input");
    const counter = qs("#fs-name-count");
    if (input && counter) counter.textContent = `${[...input.value].length} / 20`;
  }

  function startIntake() {
    setScreen("intake");
    const input = qs("#fs-name-input");
    if (input) window.setTimeout(() => input.focus(), reducedMotion ? 0 : 180);
  }

  function showHome() {
    state.displayName = "";
    state.answers = [];
    state.responseTimes = [];
    state.result = null;
    setScreen("home");
  }

  function startQuiz() {
    state.answers = [];
    state.responseTimes = [];
    state.questionIndex = 0;
    state.answerLocked = false;
    state.result = null;
    setScreen("quiz");
    renderQuestion();
    track("fire_strength_start");
  }

  function renderQuestion() {
    const question = QUESTIONS[state.questionIndex];
    if (!question) return;
    const count = qs("#fs-question-count");
    const progress = qs("#fs-progress-bar");
    const progressTrack = qs(".fs-progress-track");
    const prompt = qs("#fs-question-prompt");
    const title = qs("#fs-question-title");
    const choiceA = qs("#fs-choice-a");
    const choiceB = qs("#fs-choice-b");
    const card = qs("#fs-question-card");
    if (count) count.textContent = `${question.id} / ${QUESTIONS.length}`;
    if (progress) progress.style.width = `${((state.questionIndex + 1) / QUESTIONS.length) * 100}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(state.questionIndex + 1));
    if (prompt) {
      prompt.hidden = !question.prompt;
      prompt.textContent = question.prompt;
    }
    if (title) title.textContent = question.prompt ? "あなたなら、どちらを選ぶ？" : "もし、どちらかしか選べないなら？";
    if (choiceA) choiceA.textContent = question.options[0].text;
    if (choiceB) choiceB.textContent = question.options[1].text;
    qsa(".fs-choice-card").forEach((button) => {
      button.classList.remove("is-selected");
      button.disabled = false;
    });
    if (card) {
      card.classList.remove("is-switching");
      window.requestAnimationFrame(() => card.classList.add("is-switching"));
    }
    state.questionShownAt = performance.now();
    if (!document.hidden) {
      window.setTimeout(() => qs('.fs-choice-card[data-choice="A"]')?.focus({ preventScroll: true }), reducedMotion ? 0 : 80);
    }
  }

  function answerQuestion(choice) {
    if (state.answerLocked || document.hidden) return;
    const question = QUESTIONS[state.questionIndex];
    if (!question) return;
    state.answerLocked = true;
    const elapsed = Math.max(0, Math.round(performance.now() - state.questionShownAt));
    state.answers[state.questionIndex] = choice;
    state.responseTimes[state.questionIndex] = Math.min(elapsed, 3600000);
    const selectedButton = qs(`.fs-choice-card[data-choice="${choice}"]`);
    if (selectedButton) selectedButton.classList.add("is-selected");
    track("fire_strength_question_answer", { question_number: question.id, choice });
    const delay = reducedMotion ? 0 : 170;
    window.setTimeout(() => {
      if (state.questionIndex >= QUESTIONS.length - 1) {
        completeQuiz();
        return;
      }
      state.questionIndex += 1;
      state.answerLocked = false;
      renderQuestion();
    }, delay);
  }

  function completeQuiz() {
    state.answerLocked = true;
    state.result = calculateFireStrengthResult(state.answers, state.responseTimes);
    state.resultId = randomUuid();
    setScreen("analysis");
    window.setTimeout(() => {
      renderResult();
      setScreen("result");
      track("fire_strength_complete", { fire_type: state.result.fireType.id });
      saveResult();
    }, reducedMotion ? 0 : 320);
  }

  function setSaveStatus(message, canRetry = false) {
    const status = qs("#fs-save-status");
    const retry = qs("#fs-save-retry");
    if (status) status.textContent = message;
    if (retry) retry.hidden = !canRetry;
  }

  async function saveResult() {
    if (!state.result) return;
    const body = {
      id: state.resultId,
      displayName: state.displayName,
      fireTypeId: state.result.fireType.id,
      topTraitIds: state.result.topTraits.map((trait) => trait.id),
      answers: state.result.answers,
      responseTimes: state.result.responseTimes
    };
    state.pendingSave = body;
    setSaveStatus("結果を匿名で集計に反映しています…", false);
    try {
      const response = await fetch("/api/fire-strengths/results", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) throw new Error("save_failed");
      state.pendingSave = null;
      setSaveStatus(payload.saved === false ? "結果はすでに匿名で集計されています。" : "結果を匿名で集計しました。", false);
    } catch (error) {
      setSaveStatus("結果は表示されています。集計への保存に失敗したため、あとで再送できます。", true);
    }
    loadStatsForResult();
  }

  function retrySave() {
    if (!state.pendingSave) return;
    saveResult();
  }

  function traitName(traitId) {
    return TRAIT_BY_ID[traitId]?.name || traitId;
  }

  function appendText(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function renderTopTraits() {
    const list = qs("#fs-top-traits");
    if (!list || !state.result) return;
    list.replaceChildren();
    const medals = ["🥇", "🥈", "🥉", "4位", "5位"];
    state.result.topTraits.forEach((trait, index) => {
      const item = document.createElement("li");
      item.className = "fs-top-trait";
      appendText(item, "span", "fs-top-rank", medals[index]);
      appendText(item, "h3", "", trait.name);
      appendText(item, "p", "", trait.description);
      appendText(item, "p", "fs-trait-core", trait.core);
      list.appendChild(item);
    });
  }

  function renderTypeDetail() {
    const detail = qs("#fs-type-detail");
    const toggle = qs('[data-action="toggle-detail"]');
    if (!detail || !state.result) return;
    const content = state.result.fireType;
    detail.replaceChildren();
    const introBlock = document.createElement("div");
    introBlock.className = "fs-detail-block";
    content.details.intro.forEach((paragraph) => appendText(introBlock, "p", "", paragraph));
    detail.appendChild(introBlock);
    const extra = document.createElement("div");
    extra.className = "fs-detail-extra";
    extra.hidden = true;
    const sections = [
      ["あなたの強み", content.details.strengths],
      ["気をつけたいこと", content.details.caution]
    ];
    sections.forEach(([heading, paragraphs]) => {
      const block = document.createElement("div");
      block.className = "fs-detail-block";
      appendText(block, "h3", "", heading);
      paragraphs.forEach((paragraph) => appendText(block, "p", "", paragraph));
      extra.appendChild(block);
    });
    const lifeBlock = document.createElement("div");
    lifeBlock.className = "fs-detail-block";
    appendText(lifeBlock, "h3", "", "向いているFIRE生活");
    appendText(lifeBlock, "p", "fs-detail-life", content.details.life);
    extra.appendChild(lifeBlock);
    detail.appendChild(extra);
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = "詳しい診断を見る <span aria-hidden=\"true\">＋</span>";
    }
  }

  function renderTraitBars() {
    const list = qs("#fs-trait-bars");
    if (!list || !state.result) return;
    list.replaceChildren();
    const maxScore = Math.max(1, ...state.result.rankedTraits.map((trait) => trait.finalScore));
    const topIds = new Set(state.result.topTraits.map((trait) => trait.id));
    state.result.rankedTraits.forEach((trait) => {
      const row = document.createElement("div");
      row.className = `fs-bar-row${topIds.has(trait.id) ? " is-top" : ""}`;
      row.setAttribute("aria-label", `${trait.name} ${trait.strengthLabel}`);
      const label = document.createElement("div");
      label.className = "fs-bar-label";
      appendText(label, "strong", "", trait.name);
      if (topIds.has(trait.id)) appendText(label, "small", "", "TOP5");
      const track = document.createElement("div");
      track.className = "fs-bar-track";
      const fill = document.createElement("span");
      fill.className = "fs-bar-fill";
      fill.style.setProperty("--fs-bar-width", `${Math.max(5, (trait.finalScore / maxScore) * 100)}%`);
      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      appendText(row, "span", "fs-bar-status", trait.strengthLabel);
      list.appendChild(row);
    });
  }

  function renderDomainBars() {
    const list = qs("#fs-domain-bars");
    const summary = qs("#fs-domain-summary");
    if (!list || !state.result) return;
    list.replaceChildren();
    const maxScore = Math.max(1, ...state.result.domainScores.map((domain) => domain.score));
    state.result.domainScores.forEach((domain) => {
      const row = document.createElement("div");
      row.className = "fs-domain-row";
      row.setAttribute("aria-label", `${domain.name}の傾向`);
      appendText(row, "strong", "fs-domain-label", domain.name);
      const track = document.createElement("div");
      track.className = "fs-domain-track";
      const fill = document.createElement("span");
      fill.className = "fs-domain-fill";
      fill.style.setProperty("--fs-bar-width", `${Math.max(7, (domain.score / maxScore) * 100)}%`);
      track.appendChild(fill);
      row.appendChild(track);
      appendText(row, "span", "fs-domain-score", "傾向");
      list.appendChild(row);
    });
    const topDomains = state.result.domainScores.slice().sort((left, right) => right.score - left.score).slice(0, 2);
    if (summary) summary.textContent = `あなたは「${topDomains[0].name}」と「${topDomains[1].name}」を重視する傾向があります。FIRE後の満足度を高めるヒントとして、2つの領域を眺めてみてください。`;
  }

  function questionForAnswer(answer) {
    const question = QUESTIONS[answer.questionId - 1];
    if (!question) return null;
    const selected = question.options[answer.choice === "B" ? 1 : 0];
    return { question, selected };
  }

  function renderReflectionList(selector, answers, isFast = false) {
    const list = qs(selector);
    if (!list) return;
    list.replaceChildren();
    if (!answers.length) {
      appendText(list, "p", "fs-loading-copy", isFast ? "今回は、どの回答も十分に考えて選んだようです。" : "回答時間をまだ表示できません。");
      return;
    }
    answers.forEach((answer, index) => {
      const item = questionForAnswer(answer);
      if (!item) return;
      const card = document.createElement("article");
      card.className = `fs-reflection-card${index === 0 ? " is-primary" : ""}`;
      const top = document.createElement("div");
      top.className = "fs-reflection-card__top";
      appendText(top, "span", "fs-reflection-card__label", `${index + 1} / ${isFast ? "直感" : "迷い"}`);
      appendText(top, "span", "fs-reflection-time", `${(answer.analysisTimeMs / 1000).toFixed(1)}秒`);
      card.appendChild(top);
      const questionText = item.question.prompt ? `${item.question.prompt}\n${item.question.options[0].text}\n${item.question.options[1].text}` : `${item.question.options[0].text}\n${item.question.options[1].text}`;
      appendText(card, "p", "fs-reflection-question", questionText);
      appendText(card, "p", "fs-reflection-choice", `${answer.choice}：${item.selected.text}`);
      appendText(card, "p", "fs-reflection-core", `${item.selected ? traitName(item.selected.traitId) : ""} — ${TRAIT_BY_ID[item.selected.traitId]?.core || ""}`);
      list.appendChild(card);
    });
  }

  function renderStandout() {
    const section = qs("#fs-standout-section");
    const name = qs("#fs-standout-name");
    const text = qs("#fs-standout-text");
    if (!section || !state.result) return;
    if (!state.result.standout) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    name.textContent = `🔥 ${state.result.standout.name}`;
    text.textContent = `あなたは他の資質と比べても、「${state.result.standout.core}」という価値観が特に強く出ています。`;
  }

  function renderRecommendations() {
    const list = qs("#fs-recommendations");
    const links = qs("#fs-related-links");
    if (!list || !links || !state.result) return;
    list.replaceChildren();
    links.replaceChildren();
    state.result.fireType.recommendations.forEach((recommendation) => appendText(list, "span", "fs-recommendation", recommendation));
    state.result.fireType.links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.textContent = `${link.label} ↗`;
      links.appendChild(anchor);
    });
  }

  function renderResultRanking(types = []) {
    const list = qs("#fs-result-ranking");
    const toggle = qs('[data-action="toggle-ranking"]');
    if (!list || !toggle) return;
    list.replaceChildren();
    if (!types.length) {
      appendText(list, "p", "fs-loading-copy", "集計データはまだありません。");
      toggle.hidden = true;
      return;
    }
    const currentId = state.result?.fireType.id;
    const visible = types.slice(0, 5);
    if (currentId && !visible.some((type) => type.typeId === currentId)) {
      const current = types.find((type) => type.typeId === currentId);
      if (current) visible.push(current);
    }
    const maxCount = Math.max(1, ...types.map((type) => Number(type.count) || 0));
    const addRow = (type, extra = false) => {
      const row = document.createElement("div");
      row.className = `fs-rank-row${type.typeId === currentId ? " is-current" : ""}${extra ? " fs-rank-row--extra" : ""}`;
      if (extra) row.hidden = true;
      appendText(row, "span", "fs-rank-number", type.rank <= 3 ? ["🥇", "🥈", "🥉"][type.rank - 1] : `${type.rank}位`);
      appendText(row, "strong", "fs-rank-type", type.name);
      const bar = document.createElement("div");
      bar.className = "fs-rank-bar";
      const fill = document.createElement("span");
      fill.style.setProperty("--fs-bar-width", `${Math.max(2, ((Number(type.count) || 0) / maxCount) * 100)}%`);
      bar.appendChild(fill);
      row.appendChild(bar);
      const stat = document.createElement("span");
      stat.className = "fs-rank-stat";
      stat.textContent = `${Number(type.count) || 0}人`;
      appendText(stat, "small", "", `${Number(type.percentage || 0).toFixed(1)}%`);
      row.appendChild(stat);
      list.appendChild(row);
    };
    types.forEach((type) => addRow(type, !visible.includes(type)));
    const extras = qsa(".fs-rank-row--extra");
    toggle.hidden = extras.length === 0;
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "全12タイプを見る <span aria-hidden=\"true\">＋</span>";
  }

  function renderRarity() {
    const label = qs("#fs-rarity-label");
    const text = qs("#fs-rarity-text");
    if (!label || !text || !state.result) return;
    const current = state.stats?.types?.find((type) => type.typeId === state.result.fireType.id);
    if (!current) {
      label.textContent = "まだデータ収集中です";
      text.textContent = "同じタイプの割合は、集計データが届くとここに表示されます。珍しさは優秀さを表すものではありません。";
      return;
    }
    const total = Number(state.stats.totalResults) || 0;
    const percentage = Number(current.percentage) || 0;
    label.textContent = getRarityLabel(percentage, total);
    text.textContent = total < 20
      ? `現在は${total}人の集計です。診断者が増えると、あなたのタイプの割合がより見やすくなります。珍しい＝優秀という意味ではありません。`
      : `現在${total}人の集計では、あなたと同じ「${current.name}」は${current.count}人・${percentage.toFixed(1)}%。これは価値観の集まり方を示す目安で、珍しい＝優秀という意味ではありません。`;
  }

  function renderResult() {
    if (!state.result) return;
    const result = state.result;
    const type = result.fireType;
    const resultName = qs("#fs-result-heading");
    if (resultName) resultName.textContent = `${state.displayName}さんの診断結果`;
    const typeName = qs("#fs-type-name");
    if (typeName) typeName.textContent = type.name;
    const phrase = qs("#fs-type-phrase");
    if (phrase) phrase.textContent = type.phrase;
    const summary = qs("#fs-result-summary");
    if (summary) summary.textContent = type.summary;
    const caption = qs("#fs-type-caption");
    if (caption) caption.textContent = type.caption;
    const typeSummary = qs("#fs-type-summary");
    if (typeSummary) typeSummary.textContent = type.summary;
    renderTopTraits();
    renderTypeDetail();
    renderTraitBars();
    renderDomainBars();
    renderStandout();
    renderReflectionList("#fs-slow-questions", result.slowQuestions, false);
    renderReflectionList("#fs-fast-questions", result.fastQuestions, true);
    renderRecommendations();
    const alertHead = qs("#fs-alert-head");
    const alertText = qs("#fs-alert-text");
    if (alertHead) alertHead.textContent = type.alert;
    if (alertText) alertText.textContent = type.details.caution[type.details.caution.length - 1] || type.alert;
    const lowName = qs("#fs-low-trait-name");
    const lowText = qs("#fs-low-trait-text");
    if (lowName) lowName.textContent = result.lowestTrait.name;
    if (lowText) lowText.textContent = `${result.lowestTrait.name}を最優先するより、今は別の価値観を大切にする傾向が強く出ています。`;
    renderShareCard();
    renderResultRanking([]);
    renderRarity();
    setSaveStatus("結果を匿名で集計に反映しています…", false);
    const checkbox = qs("#fs-hide-share-name");
    if (checkbox) checkbox.checked = false;
  }

  function wrapCanvasText(context, value, x, y, maxWidth, lineHeight, maxLines = 4) {
    const text = String(value || "");
    const lines = [];
    let line = "";
    [...text].forEach((character) => {
      const next = line + character;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => context.fillText(item, x, y + (index * lineHeight)));
    return Math.min(lines.length, maxLines);
  }

  function renderShareCard() {
    const canvas = qs("#fs-share-canvas");
    if (!canvas || !state.result) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const hideName = Boolean(qs("#fs-hide-share-name")?.checked);
    const type = state.result.fireType;
    const topThree = state.result.topTraits.slice(0, 3);
    const current = state.stats?.types?.find((item) => item.typeId === type.id);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#ea3e31");
    gradient.addColorStop(.56, "#d93850");
    gradient.addColorStop(1, "#854c99");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255, 207, 69, .2)";
    context.beginPath();
    context.arc(870, 145, 190, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 255, 255, .13)";
    context.beginPath();
    context.arc(105, 1010, 270, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.25)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(830, 160, 255, .4, 2.7);
    context.stroke();

    context.fillStyle = "#ffcf45";
    context.font = "900 31px Arial, 'Yu Gothic', sans-serif";
    context.fillText("WAKUWAKU FIRE", 75, 86);
    context.fillStyle = "#ffffff";
    context.font = "800 28px Arial, 'Yu Gothic', sans-serif";
    context.fillText("FIREストレングス診断", 75, 147);
    context.font = "800 34px Arial, 'Yu Gothic', sans-serif";
    context.fillText(hideName ? "あなたは" : `${state.displayName}さんは`, 75, 247);
    context.font = "950 72px Arial, 'Yu Gothic', sans-serif";
    const typeLines = wrapCanvasText(context, type.name, 75, 338, 860, 84, 2);
    context.fillStyle = "#ffcf45";
    context.font = "900 34px Arial, 'Yu Gothic', sans-serif";
    wrapCanvasText(context, type.phrase, 75, 370 + (typeLines * 84), 880, 45, 2);

    const topStart = 585 + (typeLines > 1 ? 35 : 0);
    context.fillStyle = "rgba(255,255,255,.87)";
    context.font = "800 23px Arial, 'Yu Gothic', sans-serif";
    context.fillText("あなたのTOP3資質", 75, topStart);
    const medals = ["🥇", "🥈", "🥉"];
    topThree.forEach((trait, index) => {
      const y = topStart + 75 + (index * 60);
      context.fillStyle = "#ffffff";
      context.font = "800 29px Arial, 'Yu Gothic', sans-serif";
      context.fillText(`${medals[index]}  ${trait.name}`, 75, y);
    });
    context.fillStyle = "rgba(255,255,255,.83)";
    context.font = "700 22px Arial, 'Yu Gothic', sans-serif";
    const sharePercentage = current ? `${Number(current.percentage || 0).toFixed(1)}%` : "集計中";
    context.fillText(`同タイプは全体の ${sharePercentage}`, 75, 850);
    context.fillStyle = "rgba(255,255,255,.72)";
    context.font = "700 20px Arial, 'Yu Gothic', sans-serif";
    context.fillText("wakuwaku-fire-git.pages.dev/fire-strengths", 75, 1009);
  }

  function canvasBlob() {
    const canvas = qs("#fs-share-canvas");
    if (!canvas || typeof canvas.toBlob !== "function") return Promise.resolve(null);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function shareText() {
    if (!state.result) return "FIREストレングス診断をやってみた！";
    const names = state.result.topTraits.slice(0, 3).map((trait) => trait.name).join("・");
    return `FIREストレングス診断やってみた！\n僕は「${state.result.fireType.name}」タイプ🔥\nTOP3は「${names}」でした。\nみんな何タイプになる？\n${new URL("./", document.baseURI).href}`;
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (error) {
      // 下の互換手段へ進みます。
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
    textarea.remove();
    return copied;
  }

  async function shareResult() {
    if (!state.result) return;
    track("fire_strength_share", { fire_type: state.result.fireType.id });
    const text = shareText();
    const url = new URL("./", document.baseURI).href;
    const blob = await canvasBlob();
    const file = blob && typeof File === "function" ? new File([blob], "fire-strengths-result.png", { type: "image/png" }) : null;
    try {
      if (navigator.share) {
        if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "FIREストレングス診断", text, url, files: [file] });
        } else {
          await navigator.share({ title: "FIREストレングス診断", text, url });
        }
        announce("共有画面を開きました。");
        return;
      }
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
    const copied = await copyText(text);
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    announce(copied ? "文章をコピーして、Xの共有画面を開きました。" : "Xの共有画面を開きました。");
  }

  async function downloadShareCard() {
    const blob = await canvasBlob();
    if (!blob) return;
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "fire-strengths-result.png";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
    announce("シェアカードを保存しました。");
  }

  function renderComparison() {
    const slot = qs("#fs-comparison-slot");
    if (!slot) return;
    slot.replaceChildren();
    if (!state.stats || state.stats.available !== true || !state.result) {
      appendText(slot, "p", "fs-comparison-unavailable", "現在集計を取得できません。あなたの診断結果はそのまま表示されています。");
      return;
    }
    const total = Number(state.stats.totalResults) || 0;
    const current = state.stats.types.find((type) => type.typeId === state.result.fireType.id);
    if (!current) {
      appendText(slot, "p", "fs-comparison-unavailable", "現在集計を取得できません。あなたの診断結果はそのまま表示されています。");
      return;
    }
    const card = document.createElement("div");
    card.className = "fs-comparison-card";
    const main = document.createElement("div");
    main.className = "fs-comparison-main";
    appendText(main, "span", "", `現在 ${total.toLocaleString("ja-JP")}人が診断`);
    appendText(main, "strong", "", `あなたと同じ「${current.name}」`);
    appendText(main, "p", "", `${current.rank}位 / 12タイプ中`);
    card.appendChild(main);
    const count = document.createElement("div");
    count.className = "fs-comparison-metric";
    appendText(count, "span", "", "同じタイプ");
    appendText(count, "strong", "", `${current.count}人`);
    appendText(count, "em", "", "集計結果");
    card.appendChild(count);
    const percentage = document.createElement("div");
    percentage.className = "fs-comparison-metric";
    appendText(percentage, "span", "", "全体の割合");
    appendText(percentage, "strong", "", `${Number(current.percentage || 0).toFixed(1)}%`);
    appendText(percentage, "em", "", "集計結果");
    card.appendChild(percentage);
    slot.appendChild(card);
  }

  async function fetchStats() {
    try {
      const response = await fetch("/api/fire-strengths/stats", { headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.available !== true) return { available: false };
      return payload;
    } catch (error) {
      return { available: false };
    }
  }

  async function loadStatsForResult() {
    state.stats = await fetchStats();
    renderComparison();
    renderResultRanking(state.stats.available === true ? state.stats.types : []);
    renderRarity();
    renderShareCard();
  }

  function renderStatsTypeList(types) {
    const list = qs("#fs-stats-type-list");
    if (!list) return;
    list.replaceChildren();
    const maxCount = Math.max(1, ...types.map((type) => Number(type.count) || 0));
    types.forEach((type) => {
      const row = document.createElement("div");
      row.className = "fs-stats-type-row";
      appendText(row, "span", "fs-stats-rank", type.rank <= 3 ? ["🥇", "🥈", "🥉"][type.rank - 1] : `${type.rank}位`);
      appendText(row, "strong", "fs-stats-type-name", type.name);
      const bar = document.createElement("div");
      bar.className = "fs-rank-bar";
      const fill = document.createElement("span");
      fill.style.setProperty("--fs-bar-width", `${Math.max(2, ((Number(type.count) || 0) / maxCount) * 100)}%`);
      bar.appendChild(fill);
      row.appendChild(bar);
      const stat = document.createElement("span");
      stat.className = "fs-stats-row-stat";
      stat.textContent = `${Number(type.count) || 0}人`;
      appendText(stat, "small", "", `${Number(type.percentage || 0).toFixed(1)}%`);
      row.appendChild(stat);
      list.appendChild(row);
    });
  }

  function renderStatsTraitList(traits) {
    const list = qs("#fs-stats-trait-list");
    if (!list) return;
    list.replaceChildren();
    const maxCount = Math.max(1, ...traits.map((trait) => Number(trait.count) || 0));
    traits.forEach((trait) => {
      const row = document.createElement("div");
      row.className = "fs-stats-trait-row";
      appendText(row, "span", "fs-stats-rank", trait.rank <= 3 ? ["🥇", "🥈", "🥉"][trait.rank - 1] : `${trait.rank}位`);
      appendText(row, "strong", "fs-stats-trait-name", trait.name);
      const bar = document.createElement("div");
      bar.className = "fs-rank-bar";
      const fill = document.createElement("span");
      fill.style.setProperty("--fs-bar-width", `${Math.max(2, ((Number(trait.count) || 0) / maxCount) * 100)}%`);
      bar.appendChild(fill);
      row.appendChild(bar);
      const stat = document.createElement("span");
      stat.className = "fs-stats-row-stat";
      stat.textContent = `${Number(trait.count) || 0}人`;
      appendText(stat, "small", "", `${Number(trait.percentage || 0).toFixed(1)}%`);
      row.appendChild(stat);
      list.appendChild(row);
    });
  }

  function renderStatsError() {
    const message = qs("#fs-stats-message");
    if (message) {
      message.hidden = false;
      message.textContent = "現在集計を取得できません。診断そのものはいつでも利用できます。時間をおいてもう一度ご覧ください。";
    }
    ["#fs-stats-type-list", "#fs-stats-trait-list"].forEach((selector) => {
      const list = qs(selector);
      if (list) {
        list.replaceChildren();
        appendText(list, "p", "fs-loading-copy", "集計データを取得できませんでした。");
      }
    });
  }

  function renderStatsPage(data) {
    if (!data || data.available !== true) {
      renderStatsError();
      return;
    }
    const types = Array.isArray(data.types) ? data.types : [];
    const traits = Array.isArray(data.topTraits) ? data.topTraits : [];
    const total = Number(data.totalResults) || 0;
    const totalElement = qs("#fs-stats-total");
    if (totalElement) totalElement.textContent = total.toLocaleString("ja-JP");
    const most = types.find((type) => Number(type.count) > 0);
    const mostElement = qs("#fs-stats-most");
    const mostCount = qs("#fs-stats-most-count");
    if (mostElement) mostElement.textContent = most ? most.name : "—";
    if (mostCount) mostCount.textContent = most ? `${most.count}人` : "まだありません";
    const least = total > 0 && types.length ? types[types.length - 1] : null;
    const leastElement = qs("#fs-stats-least");
    const leastCount = qs("#fs-stats-least-count");
    if (leastElement) leastElement.textContent = least ? least.name : "—";
    if (leastCount) leastCount.textContent = least ? `${least.count}人` : "まだありません";
    const traitLeader = traits.find((trait) => Number(trait.count) > 0);
    const traitElement = qs("#fs-stats-trait-leader");
    if (traitElement) traitElement.textContent = traitLeader ? traitLeader.name : "—";
    renderStatsTypeList(types);
    renderStatsTraitList(traits);
    track("fire_strength_stats_view");
  }

  function handleAction(action) {
    if (action === "start-intake") startIntake();
    if (action === "go-home") showHome();
    if (action === "go-intake") startIntake();
    if (action === "start-quiz") startQuiz();
    if (action === "restart") {
      track("fire_strength_restart");
      startIntake();
    }
    if (action === "retry-save") retrySave();
    if (action === "share" || action === "share-top-url") {
      if (action === "share-top-url") copyText(new URL("./", document.baseURI).href).then((copied) => announce(copied ? "診断TOPのURLをコピーしました。" : "診断TOPのURLを表示しました。"));
      else shareResult();
    }
    if (action === "copy-result") copyText(shareText()).then((copied) => announce(copied ? "結果の文章をコピーしました。" : "結果の文章をコピーできませんでした。"));
    if (action === "download-share") downloadShareCard();
    if (action === "toggle-detail") {
      const extra = qs(".fs-detail-extra");
      const button = qs('[data-action="toggle-detail"]');
      if (!extra || !button) return;
      const expanded = button.getAttribute("aria-expanded") === "true";
      extra.hidden = expanded;
      button.setAttribute("aria-expanded", String(!expanded));
      button.innerHTML = expanded ? "詳しい診断を見る <span aria-hidden=\"true\">＋</span>" : "診断の続きを閉じる <span aria-hidden=\"true\">−</span>";
    }
    if (action === "toggle-ranking") {
      const rows = qsa(".fs-rank-row--extra");
      const button = qs('[data-action="toggle-ranking"]');
      if (!button || rows.length === 0) return;
      const expanded = button.getAttribute("aria-expanded") === "true";
      rows.forEach((row) => { row.hidden = expanded; });
      button.setAttribute("aria-expanded", String(!expanded));
      button.innerHTML = expanded ? "全12タイプを見る <span aria-hidden=\"true\">＋</span>" : "ランキングを閉じる <span aria-hidden=\"true\">−</span>";
    }
  }

  qsa("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  qsa(".fs-choice-card").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(button.dataset.choice));
  });

  const nameInput = qs("#fs-name-input");
  if (nameInput) {
    nameInput.addEventListener("input", updateNameCounter);
    updateNameCounter();
  }
  const nameForm = qs("#fs-name-form");
  if (nameForm) {
    nameForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const normalized = normalizeName(nameInput?.value);
      const error = qs("#fs-name-error");
      if (!validName(normalized)) {
        if (error) error.textContent = "1〜20文字で入力してください。";
        nameInput?.focus();
        return;
      }
      if (error) error.textContent = "";
      state.displayName = normalized;
      const preflightName = qs("#fs-preflight-name");
      if (preflightName) preflightName.textContent = state.displayName;
      setScreen("preflight");
    });
  }
  const shareNameToggle = qs("#fs-hide-share-name");
  if (shareNameToggle) shareNameToggle.addEventListener("change", renderShareCard);

  document.addEventListener("keydown", (event) => {
    if (isStatsPage || app.dataset.screen !== "quiz" || state.answerLocked) return;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      answerQuestion("A");
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "b") {
      event.preventDefault();
      answerQuestion("B");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (app.dataset.screen === "quiz" && !state.answerLocked && !document.hidden) state.questionShownAt = performance.now();
    if (app.dataset.screen === "quiz" && document.hidden) state.questionShownAt = 0;
  });

  if (isStatsPage) {
    fetchStats().then(renderStatsPage);
  } else {
    setScreen("home", false);
  }
}

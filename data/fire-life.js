const STORAGE_KEY = "wakuwaku-fire-life";
const DATA_VERSION = 3;

const categoryLabels = Object.freeze({
  level: "LEVEL",
  discovery: "DISCOVERY",
  streak: "STREAK",
  visit: "VISIT",
});

// バッジの見た目は絵文字ではなく、FIRE QUEST専用の紋章として描画します。
const badgeArtKeys = Object.freeze({
  "level-1-free-fire": "ember",
  "level-5-rookie": "spark",
  "level-10-adventurer": "compass",
  "level-15-searcher": "horizon",
  "level-20-end-of-cage": "cut",
  "level-25-own-answer": "orbit",
  "level-30-own-destination": "arrow",
  "level-35-wings": "wings",
  "level-40-life-designer": "blueprint",
  "level-45-time-asset": "clock",
  "level-50-time-traveler": "rewind",
  "level-55-beginning-of-journey": "ticket",
  "level-60-life-stroller": "sun",
  "level-65-boredom-brave": "cup",
  "level-70-secret-base": "camp",
  "level-75-play-life": "play",
  "level-80-serious-play": "spark",
  "level-85-now-courage": "bolt",
  "level-90-wakuwaku-return": "ember",
  "level-95-unmapped-journey": "map",
  "level-100-fire-legend": "flag",
  "discovery-fire-strengths": "lens",
  "discovery-world-tour": "compass",
  "discovery-fire-lab": "flask",
  "discovery-fire-animal": "paw",
  "discovery-migration-japan": "map",
  "discovery-migration-world": "wings",
  "discovery-risk-runner": "risk",
  "discovery-otoku": "flower",
  "streak-3": "ember",
  "streak-7": "trail",
  "streak-14": "sprout",
  "streak-30": "sun",
  "streak-50": "trail",
  "streak-100": "home-flame",
  "streak-365": "calendar",
  "visit-3-regular": "cup",
  "visit-10-wakuwaku-regular": "spark",
  "visit-30-usual-seat": "seat",
  "visit-50-quite-living": "home",
  "visit-100-almost-resident": "village",
  "visit-300-long-relationship": "tree",
  "visit-500-home": "home",
});

const levelBadges = [
  { id: "level-1-free-fire", name: "自由の火を灯す者", threshold: 1, icon: "🔥", tone: "red", shape: "circle", description: "自由を考え始めた瞬間に、自分のFIRE人生へ最初の火を灯した証です。", condition: "Lv.1に到達する" },
  { id: "level-5-rookie", name: "FIREルーキー", threshold: 5, icon: "✦", tone: "blue", shape: "medal", description: "まだ知らない自由へ向かって、最初のページをめくった人です。", condition: "Lv.5に到達する" },
  { id: "level-10-adventurer", name: "FIRE冒険者", threshold: 10, icon: "🧭", tone: "purple", shape: "shield", description: "お金の先にある時間や暮らしまで、冒険の視野に入れ始めました。", condition: "Lv.10に到達する" },
  { id: "level-15-searcher", name: "まだ見ぬ自由を探す者", threshold: 15, icon: "⌁", tone: "orange", shape: "hex", description: "誰かの答えで満足せず、自分に合う自由を探し続ける人です。", condition: "Lv.15に到達する" },
  { id: "level-20-end-of-cage", name: "選べない人生に終止符を", threshold: 20, icon: "✂", tone: "red", shape: "circle", description: "選べないことを当たり前にせず、自分の選択肢を見つめ始めた証です。", condition: "Lv.20に到達する" },
  { id: "level-25-own-answer", name: "誰かの正解を降りた者", threshold: 25, icon: "✦", tone: "mint", shape: "shield", description: "人の正解を借りるだけではなく、自分の暮らしを考える側へ進みました。", condition: "Lv.25に到達する" },
  { id: "level-30-own-destination", name: "行き先は、自分で決める", threshold: 30, icon: "✈", tone: "blue", shape: "hex", description: "人生の行き先を、誰かの地図ではなく自分の意思で選び始めました。", condition: "Lv.30に到達する" },
  { id: "level-35-wings", name: "自由への翼", threshold: 35, icon: "🪽", tone: "yellow", shape: "medal", description: "場所や時間に縛られない未来を、少しずつ想像できるようになった証です。", condition: "Lv.35に到達する" },
  { id: "level-40-life-designer", name: "自由設計士", threshold: 40, icon: "✎", tone: "purple", shape: "circle", description: "自由を待つのではなく、自分の暮らしとして設計し始めた人です。", condition: "Lv.40に到達する" },
  { id: "level-45-time-asset", name: "時間資産家", threshold: 45, icon: "◷", tone: "orange", shape: "shield", description: "増やしたい資産の中に、時間という大切な資産を見つけました。", condition: "Lv.45に到達する" },
  { id: "level-50-time-traveler", name: "時間を取り戻す旅人", threshold: 50, icon: "⟲", tone: "red", shape: "hex", description: "自分の時間を自分の手へ戻す旅を、ここまで歩いてきました。", condition: "Lv.50に到達する" },
  { id: "level-55-beginning-of-journey", name: "不自由の終わり、旅の始まり", threshold: 55, icon: "🎫", tone: "blue", shape: "medal", description: "何かから逃げるだけではなく、自由な旅へ踏み出す視点を持ちました。", condition: "Lv.55に到達する" },
  { id: "level-60-life-stroller", name: "人生を散歩する者", threshold: 60, icon: "☀", tone: "mint", shape: "circle", description: "急がず、寄り道しながら、人生そのものを味わう人です。", condition: "Lv.60に到達する" },
  { id: "level-65-boredom-brave", name: "暇を恐れない者", threshold: 65, icon: "☕", tone: "yellow", shape: "shield", description: "予定で埋め尽くさなくても、自分の時間を楽しめる胆力を育てました。", condition: "Lv.65に到達する" },
  { id: "level-70-secret-base", name: "大人の秘密基地の住人", threshold: 70, icon: "🏕", tone: "purple", shape: "hex", description: "大人になってからの遊び場と居場所を、自分の手で育てています。", condition: "Lv.70に到達する" },
  { id: "level-75-play-life", name: "遊ぶ、ゆえに人生", threshold: 75, icon: "▶", tone: "red", shape: "medal", description: "遊びを余りものにせず、人生の真ん中へ置くことを知りました。", condition: "Lv.75に到達する" },
  { id: "level-80-serious-play", name: "大人の本気は、遊びに使う", threshold: 80, icon: "✹", tone: "orange", shape: "circle", description: "本気で働く力も、本気で遊ぶ力も、自分の人生のために使います。", condition: "Lv.80に到達する" },
  { id: "level-85-now-courage", name: "いつかではなく、今を生きる胆力", threshold: 85, icon: "⚡", tone: "yellow", shape: "shield", description: "未来のために今を置き去りにせず、今日の人生にも火を灯す人です。", condition: "Lv.85に到達する" },
  { id: "level-90-wakuwaku-return", name: "ワクワクを取り戻す者", threshold: 90, icon: "✦", tone: "mint", shape: "hex", description: "いつの間にか置き忘れていた好奇心を、自分の手元へ取り戻しました。", condition: "Lv.90に到達する" },
  { id: "level-95-unmapped-journey", name: "前人未到の旅の始まり", threshold: 95, icon: "🗺", tone: "blue", shape: "medal", description: "まだ誰も決めていない、自分だけの旅の入口に立っています。", condition: "Lv.95に到達する" },
  { id: "level-100-fire-legend", name: "FIREレジェンド", threshold: 100, icon: "⚑", tone: "red", shape: "circle", description: "ここまでの積み重ねを力に変え、次の景色へ進み続ける人です。", condition: "Lv.100に到達する" },
].map((badge) => ({ ...badge, category: "level", enabled: true, legacy: false, sourceContentId: null }));

const discoveryBadges = [
  { id: "discovery-fire-strengths", name: "自分を知る旅", sourceContentId: "fire-strengths", pathPrefixes: ["/fire-strengths"], icon: "🔍", tone: "purple", shape: "circle", description: "FIREストレングス診断を開いて、自分の価値観をのぞいた証です。", condition: "FIREストレングス診断を初めて開く" },
  { id: "discovery-world-tour", name: "世界へ一歩", sourceContentId: "world-tour", pathPrefixes: ["/ワールドツアー", "/world-tour"], icon: "🌏", tone: "blue", shape: "hex", description: "マルとシバくんと一緒に、自由な旅の行き先を想像した証です。", condition: "FIREワールドツアーを初めて開く" },
  { id: "discovery-fire-lab", name: "FIRE研究員デビュー", sourceContentId: "fire-lab", pathPrefixes: ["/FIRE研究室", "/fire-lab"], icon: "🧪", tone: "mint", shape: "shield", description: "数字を使って、自分のFIRE人生を覗いてみた証です。", condition: "ワクワクFIRE研究室を初めて開く" },
  { id: "discovery-fire-animal", name: "FIREタイプを覗いた人", sourceContentId: "fire-animal", pathPrefixes: ["/fire-animal-test"], icon: "🐾", tone: "orange", shape: "medal", description: "動物FIRE診断で、自分らしいFIREの形を覗いた証です。", condition: "動物FIRE診断を初めて開く" },
  { id: "discovery-migration-japan", name: "ここじゃないどこかへ", sourceContentId: "migration-japan", pathPrefixes: ["/fire-migration-japan"], icon: "🗾", tone: "red", shape: "circle", description: "会社を辞めた後の暮らしを、日本のどこかへ飛ばして想像した証です。", condition: "国内FIRE移住診断を初めて開く" },
  { id: "discovery-migration-world", name: "世界のどこかへ", sourceContentId: "migration-world", pathPrefixes: ["/fire-migration-world"], icon: "✈", tone: "blue", shape: "shield", description: "いつか暮らしたい国や街へ、想像の翼を伸ばした証です。", condition: "海外FIRE移住診断を初めて開く" },
  { id: "discovery-risk-runner", name: "暴落と遊んだ人", sourceContentId: "risk-runner", pathPrefixes: ["/risk-runner"], icon: "↘", tone: "orange", shape: "hex", description: "RISK RUNNERで、資産を守る判断をゲームとして楽しんだ証です。", condition: "RISK RUNNERを初めて開く" },
  { id: "discovery-otoku", name: "お得の寄り道人", sourceContentId: "otoku", pathPrefixes: ["/otoku"], icon: "✿", tone: "yellow", shape: "medal", description: "今日・今週のお得情報へ、暮らしの寄り道をしに行った証です。", condition: "今日・今週のお得一覧を初めて開く" },
].map((badge) => ({ ...badge, category: "discovery", threshold: null, enabled: true, legacy: false }));

const streakBadges = [
  { id: "streak-3", name: "三日坊主、突破", threshold: 3, icon: "🔥", tone: "red", shape: "circle", description: "3日連続でワクワクFIREへ遊びに来ました。", condition: "3日連続で訪問する" },
  { id: "streak-7", name: "一週間の火守り", threshold: 7, icon: "✦", tone: "yellow", shape: "medal", description: "一週間、あなたの火を絶やさずに歩きました。", condition: "7日連続で訪問する" },
  { id: "streak-14", name: "習慣の芽", threshold: 14, icon: "🌱", tone: "mint", shape: "shield", description: "ワクワクFIREが、少しずつ日々の習慣になっています。", condition: "14日連続で訪問する" },
  { id: "streak-30", name: "毎日がFIRE", threshold: 30, icon: "☀", tone: "orange", shape: "hex", description: "30日間、自由な人生を考える時間を日常に置きました。", condition: "30日連続で訪問する" },
  { id: "streak-50", name: "日々に火が灯る", threshold: 50, icon: "✹", tone: "red", shape: "circle", description: "毎日を大きく変えなくても、火は静かに灯り続けます。", condition: "50日連続で訪問する" },
  { id: "streak-100", name: "暮らしに根づく火", threshold: 100, icon: "⌂", tone: "purple", shape: "medal", description: "FIREを考える時間が、あなたの暮らしに根づきました。", condition: "100日連続で訪問する" },
  { id: "streak-365", name: "一年、一緒に歩いた人", threshold: 365, icon: "🎂", tone: "yellow", shape: "shield", description: "一年分の訪問が、ひとつの長いFIRE人生になりました。", condition: "365日連続で訪問する" },
].map((badge) => ({ ...badge, category: "streak", sourceContentId: null, enabled: true, legacy: false }));

const visitBadges = [
  { id: "visit-3-regular", name: "ちょっと常連", threshold: 3, icon: "☕", tone: "orange", shape: "medal", description: "気になる日に、気軽に立ち寄る場所になってきました。", condition: "累計3日訪問する" },
  { id: "visit-10-wakuwaku-regular", name: "ワクワク常連", threshold: 10, icon: "✦", tone: "yellow", shape: "shield", description: "10日分の寄り道が、あなたのFIRE人生に積もっています。", condition: "累計10日訪問する" },
  { id: "visit-30-usual-seat", name: "いつもの席", threshold: 30, icon: "🪑", tone: "mint", shape: "hex", description: "ここへ戻ってくることが、いつもの時間になりました。", condition: "累計30日訪問する" },
  { id: "visit-50-quite-living", name: "かなり住んでる", threshold: 50, icon: "🏡", tone: "red", shape: "circle", description: "50日分の読み・遊び・寄り道が、あなたの中に残っています。", condition: "累計50日訪問する" },
  { id: "visit-100-almost-resident", name: "ほぼ住人", threshold: 100, icon: "🏘", tone: "purple", shape: "medal", description: "たまに帰ってくる場所ではなく、人生の一部のような場所です。", condition: "累計100日訪問する" },
  { id: "visit-300-long-relationship", name: "長い付き合い", threshold: 300, icon: "🌳", tone: "green", shape: "shield", description: "長い時間を一緒に歩いてきた証です。", condition: "累計300日訪問する" },
  { id: "visit-500-home", name: "もうここ家やん", threshold: 500, icon: "🏠", tone: "yellow", shape: "hex", description: "500日の寄り道。もう、ここはほとんどあなたの家です。", condition: "累計500日訪問する" },
].map((badge) => ({ ...badge, category: "visit", sourceContentId: null, enabled: true, legacy: false }));

// 既存端末の獲得記録を消さないため、旧VISIT定義はレガシーとして保持する。
const legacyVisitBadges = [
  { id: "visit-3", name: "また来た", threshold: 3, icon: "👋", tone: "blue", shape: "circle", description: "累計3日、ワクワクFIREへ戻ってきました。", condition: "累計3日訪問する" },
  { id: "visit-10", name: "ちょっと常連", threshold: 10, icon: "☕", tone: "orange", shape: "medal", description: "気になる日に、気軽に立ち寄る場所になってきました。", condition: "累計10日訪問する" },
  { id: "visit-30", name: "ワクワク常連", threshold: 30, icon: "✦", tone: "yellow", shape: "shield", description: "30日分の寄り道が、あなたのFIRE人生に積もっています。", condition: "累計30日訪問する" },
  { id: "visit-50", name: "いつもの席", threshold: 50, icon: "🪑", tone: "mint", shape: "hex", description: "ここへ戻ってくることが、いつもの時間になりました。", condition: "累計50日訪問する" },
  { id: "visit-100", name: "かなり住んでる", threshold: 100, icon: "🏡", tone: "red", shape: "circle", description: "100日分の読み・遊び・寄り道が、あなたの中に残っています。", condition: "累計100日訪問する" },
  { id: "visit-300", name: "ほぼ住人", threshold: 300, icon: "🏘", tone: "purple", shape: "medal", description: "たまに帰ってくる場所ではなく、人生の一部のような場所です。", condition: "累計300日訪問する" },
  { id: "visit-500", name: "長い付き合い", threshold: 500, icon: "🌳", tone: "green", shape: "shield", description: "長い時間を一緒に歩いてきた証です。", condition: "累計500日訪問する" },
  { id: "visit-1000", name: "もうここ家やん", threshold: 1000, icon: "🏠", tone: "yellow", shape: "hex", description: "1000日の寄り道。もう、ここはほとんどあなたの家です。", condition: "累計1000日訪問する" },
].map((badge) => ({ ...badge, category: "visit", sourceContentId: null, enabled: false, legacy: true }));

export const badgeDefinitions = Object.freeze([
  ...levelBadges,
  ...discoveryBadges,
  ...streakBadges,
  ...visitBadges,
  ...legacyVisitBadges,
].map((badge) => ({
  ...badge,
  artKey: badgeArtKeys[badge.id] || `${badge.category}-default`,
})));

export { categoryLabels, DATA_VERSION, STORAGE_KEY };

export function getDefaultState() {
  return {
    version: DATA_VERSION,
    nickname: "",
    totalExp: 0,
    readArticles: [],
    articleReadHistory: [],
    badges: [],
    currentStreak: 0,
    longestStreak: 0,
    totalVisitDays: 0,
    visitDates: [],
    lastVisitDate: null,
    firstVisitDate: null,
    welcomeSeen: false,
  };
}

function normalizeEarnedBadge(item, fallbackDate = null) {
  if (typeof item === "string") return { id: item, earnedAt: fallbackDate };
  if (!item || typeof item.id !== "string") return null;
  return { id: item.id, earnedAt: typeof item.earnedAt === "string" ? item.earnedAt : fallbackDate };
}

function normalizeArticleRead(item) {
  if (!item || typeof item.id !== "string" || item.id.trim() === "") return null;
  const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
  const readAt = typeof item.readAt === "string" ? item.readAt : null;
  return { id: item.id, title, readAt };
}

function normalizeNickname(value) {
  const nickname = typeof value === "string" ? value.trim().slice(0, 24) : "";
  // 以前の仮デフォルト名は、任意のニックネームではなく未設定として扱います。
  return nickname === "FIRE QUEST" ? "" : nickname;
}

function normalizeState(raw) {
  const base = getDefaultState();
  const source = raw && typeof raw === "object" ? raw : {};
  const state = { ...base, ...source };
  const sourceVersion = Number(source.version) || 1;
  state.version = DATA_VERSION;
  state.nickname = normalizeNickname(state.nickname);
  state.totalExp = Number.isFinite(Number(state.totalExp)) ? Math.max(0, Math.floor(Number(state.totalExp))) : 0;
  state.readArticles = [...new Set(Array.isArray(state.readArticles) ? state.readArticles.filter((item) => typeof item === "string" && item.trim() !== "") : [])];
  const articleReadHistory = new Map(
    (Array.isArray(state.articleReadHistory) ? state.articleReadHistory : [])
      .map(normalizeArticleRead)
      .filter(Boolean)
      .map((item) => [item.id, item]),
  );
  state.readArticles.forEach((articleId) => {
    if (!articleReadHistory.has(articleId)) articleReadHistory.set(articleId, { id: articleId, title: "", readAt: null });
  });
  state.articleReadHistory = [...articleReadHistory.values()];
  state.readArticles = [...new Set([...state.readArticles, ...state.articleReadHistory.map((item) => item.id)])];
  state.visitDates = [...new Set(Array.isArray(state.visitDates) ? state.visitDates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)) : [])].sort();
  state.totalVisitDays = Math.max(state.visitDates.length, Number.isFinite(Number(state.totalVisitDays)) ? Math.floor(Number(state.totalVisitDays)) : 0);
  state.currentStreak = Number.isFinite(Number(state.currentStreak)) ? Math.max(0, Math.floor(Number(state.currentStreak))) : 0;
  state.longestStreak = Number.isFinite(Number(state.longestStreak)) ? Math.max(state.currentStreak, Math.floor(Number(state.longestStreak))) : state.currentStreak;
  state.badges = [...new Map((Array.isArray(state.badges) ? state.badges : []).map((item) => normalizeEarnedBadge(item, state.lastVisitDate)).filter(Boolean).map((item) => [item.id, item])).values()];
  state.welcomeSeen = Boolean(state.welcomeSeen);
  state.lastVisitDate = typeof state.lastVisitDate === "string" ? state.lastVisitDate : null;
  state.firstVisitDate = typeof state.firstVisitDate === "string" ? state.firstVisitDate : null;
  if (sourceVersion < DATA_VERSION) {
    // v1には記事タイトル付きの履歴がなかったため、IDだけの記録も足あととして残します。
    state.articleReadHistory = state.articleReadHistory.map((item) => ({ ...item, title: item.title || "" }));
  }
  return state;
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return getDefaultState();
  }
}

export function saveState(state) {
  const normalized = normalizeState(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // localStorageが使えない環境でも、ページの閲覧自体は続けられるようにします。
  }
  return normalized;
}

export function createBackup(state = loadState(), now = new Date()) {
  return JSON.stringify({
    app: "wakuwaku-fire-life",
    version: DATA_VERSION,
    exportedAt: now.toISOString(),
    state: normalizeState(state),
  }, null, 2);
}

export function parseBackup(raw) {
  let payload = raw;
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("FIRE人生データの形式を読み取れませんでした。");
    }
  }

  const candidate = payload && typeof payload === "object" && payload.state && typeof payload.state === "object"
    ? payload.state
    : payload;
  const recognizedKeys = ["nickname", "totalExp", "readArticles", "articleReadHistory", "badges", "visitDates", "currentStreak", "totalVisitDays"];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || !recognizedKeys.some((key) => Object.prototype.hasOwnProperty.call(candidate, key))) {
    throw new Error("FIRE人生データとして復元できるファイルではありません。");
  }
  return normalizeState(candidate);
}

export function restoreBackup(raw) {
  return saveState(parseBackup(raw));
}

export function resetState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 何もしません。次回の初期化時に新しい状態を作ります。
  }
  return getDefaultState();
}

export function getTokyoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, item) => {
    result[item.type] = item.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtc(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return NaN;
  return Date.UTC(year, month - 1, day);
}

export function daysBetween(fromDateKey, toDateKey) {
  const from = dateKeyToUtc(fromDateKey);
  const to = dateKeyToUtc(toDateKey);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return NaN;
  return Math.round((to - from) / 86400000);
}

export function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T00:00:00+09:00`) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

export function getLevelFromExp(totalExp) {
  return Math.floor(Math.max(0, Number(totalExp) || 0) / 100) + 1;
}

export function getExpToNextLevel(totalExp) {
  const level = getLevelFromExp(totalExp);
  return Math.max(0, (level * 100) - Math.max(0, Number(totalExp) || 0));
}

export function getLevelProgress(totalExp) {
  return Math.max(0, Math.min(99, Math.max(0, Number(totalExp) || 0) % 100));
}

function getEarnedRecord(state, badgeId) {
  return state.badges.find((item) => item.id === badgeId) || null;
}

function awardBadge(state, badge, now = new Date()) {
  if (!badge || !badge.enabled || badge.legacy || getEarnedRecord(state, badge.id)) return null;
  const earned = { id: badge.id, earnedAt: now.toISOString() };
  state.badges.push(earned);
  return { ...badge, earnedAt: earned.earnedAt };
}

function awardThresholdBadges(state, category, value, now = new Date()) {
  return badgeDefinitions
    .filter((badge) => {
      if (badge.category !== category || !badge.enabled || badge.legacy || !Number.isFinite(badge.threshold) || value < badge.threshold) return false;
      return true;
    })
    .sort((a, b) => a.threshold - b.threshold)
    .map((badge) => awardBadge(state, badge, now))
    .filter(Boolean);
}

export function recordVisit(state, now = new Date()) {
  const today = getTokyoDateKey(now);
  const isNewDay = !state.visitDates.includes(today);
  const newlyEarnedBadges = [];

  if (!state.firstVisitDate) state.firstVisitDate = today;

  if (isNewDay) {
    const previousDate = state.lastVisitDate;
    state.visitDates = [...state.visitDates, today].sort();
    state.totalVisitDays = Math.max(state.totalVisitDays + 1, state.visitDates.length);
    state.currentStreak = previousDate && daysBetween(previousDate, today) === 1 ? state.currentStreak + 1 : 1;
    state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    state.lastVisitDate = today;
    newlyEarnedBadges.push(...awardThresholdBadges(state, "streak", state.currentStreak, now));
    newlyEarnedBadges.push(...awardThresholdBadges(state, "visit", state.totalVisitDays, now));
  }

  return { isNewDay, today, newlyEarnedBadges };
}

export function recordDiscovery(state, sourceContentId, now = new Date()) {
  const badge = badgeDefinitions.find((item) => item.category === "discovery" && item.sourceContentId === sourceContentId);
  const earned = awardBadge(state, badge, now);
  return { newlyEarnedBadges: earned ? [earned] : [] };
}

export function recordArticleRead(state, articleId, now = new Date(), metadata = {}) {
  if (!articleId || state.readArticles.includes(articleId)) {
    return { awarded: false, expGained: 0, levelUp: false, newlyEarnedBadges: [], level: getLevelFromExp(state.totalExp), beforeLevel: getLevelFromExp(state.totalExp) };
  }

  const beforeLevel = getLevelFromExp(state.totalExp);
  state.readArticles.push(articleId);
  if (!Array.isArray(state.articleReadHistory)) state.articleReadHistory = [];
  state.articleReadHistory.push({
    id: articleId,
    title: typeof metadata.title === "string" ? metadata.title.trim().slice(0, 120) : "",
    readAt: now.toISOString(),
  });
  state.totalExp += 10;
  const level = getLevelFromExp(state.totalExp);
  const newlyEarnedBadges = awardThresholdBadges(state, "level", level, now);
  return { awarded: true, expGained: 10, levelUp: level > beforeLevel, beforeLevel, level, newlyEarnedBadges };
}

export function syncEligibleBadges(state, now = new Date()) {
  const newlyEarnedBadges = [
    ...awardThresholdBadges(state, "level", getLevelFromExp(state.totalExp), now),
    ...awardThresholdBadges(state, "streak", state.currentStreak, now),
    ...awardThresholdBadges(state, "visit", state.totalVisitDays, now),
  ];
  return { newlyEarnedBadges };
}

export function getBadgeDefinition(badgeId) {
  return badgeDefinitions.find((badge) => badge.id === badgeId) || null;
}

export function getEarnedBadges(state) {
  return state.badges
    .map((record) => {
      const definition = getBadgeDefinition(record.id);
      if (!definition) {
        return { id: record.id, name: "過去のバッジ", category: "legacy", icon: "🏅", tone: "gray", shape: "circle", description: "現在は定義が更新されたバッジです。", condition: "過去に獲得済み", enabled: false, legacy: true, earnedAt: record.earnedAt };
      }
      return { ...definition, legacy: definition.legacy || !definition.enabled, earnedAt: record.earnedAt };
    })
    .sort((a, b) => String(b.earnedAt || "").localeCompare(String(a.earnedAt || "")));
}

export function getBadgeDistance(state, badge) {
  if (!badge) return { value: null, label: "" };

  if (badge.category === "level") {
    const value = Math.max(0, Number(badge.threshold) - getLevelFromExp(state.totalExp));
    return { value, label: `Lv.${badge.threshold}まであと${value}Lv` };
  }

  if (badge.category === "streak") {
    const value = Math.max(0, Number(badge.threshold) - state.currentStreak);
    return { value, label: `あと${value}日連続` };
  }

  if (badge.category === "visit") {
    const value = Math.max(0, Number(badge.threshold) - state.totalVisitDays);
    return { value, label: `累計あと${value}日` };
  }

  return { value: null, label: "開くと獲得" };
}

export function getNextBadges(state, limit = 3) {
  const earned = new Set(state.badges.map((item) => item.id));
  const currentValues = {
    level: getLevelFromExp(state.totalExp),
    streak: state.currentStreak,
    visit: state.totalVisitDays,
  };
  const candidates = badgeDefinitions.filter((badge) => {
    if (!badge.enabled || badge.legacy || earned.has(badge.id)) return false;
    if (badge.category === "level") return badge.threshold > currentValues.level;
    if (badge.category === "streak") return badge.threshold > currentValues.streak;
    if (badge.category === "visit") return badge.threshold > currentValues.visit;
    return true;
  });
  const firstByCategory = ["level", "streak", "visit", "discovery"].map((category) => candidates.filter((badge) => badge.category === category).sort((a, b) => {
    const aDistance = getBadgeDistance(state, a).value;
    const bDistance = getBadgeDistance(state, b).value;
    if (aDistance !== null && bDistance !== null && aDistance !== bDistance) return aDistance - bDistance;
    return badgeDefinitions.indexOf(a) - badgeDefinitions.indexOf(b);
  })[0]).filter(Boolean);
  return firstByCategory.slice(0, limit);
}

export function getFootprints(state, limit = 8) {
  const events = [];
  const firstVisitDate = state.firstVisitDate;

  if (firstVisitDate) {
    events.push({
      id: `start-${firstVisitDate}`,
      category: "START",
      icon: "🔥",
      title: "ワクワクFIREへようこそ",
      detail: "ここから、あなたのFIRE人生が始まりました。",
      dateValue: firstVisitDate,
      sortKey: `${firstVisitDate}T00:00:00+09:00`,
      priority: 0,
    });
  }

  state.visitDates
    .filter((date) => date !== firstVisitDate)
    .forEach((date) => {
      events.push({
        id: `visit-${date}`,
        category: "VISIT",
        icon: "↺",
        title: "また、ここへ帰ってきた",
        detail: "今日も自分のFIRE人生に時間を置きました。",
        dateValue: date,
        sortKey: `${date}T00:00:00+09:00`,
        priority: 1,
      });
    });

  state.articleReadHistory.forEach((record) => {
    const dateValue = typeof record.readAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(record.readAt) ? record.readAt.slice(0, 10) : null;
    events.push({
      id: `article-${record.id}`,
      category: "READ",
      icon: "✎",
      title: record.title || "FIREコラムを読んだ",
      detail: "一記事分の積み重ねが、次の景色を連れてきます。",
      dateValue,
      sortKey: record.readAt || "0000-00-00T00:00:00+09:00",
      priority: 2,
    });
  });

  state.badges.forEach((record) => {
    const definition = getBadgeDefinition(record.id);
    events.push({
      id: `badge-${record.id}`,
      category: "BADGE",
      icon: definition?.icon || "🏅",
      artKey: definition?.artKey || "spark",
      tone: definition?.tone || "gray",
      shape: definition?.shape || "circle",
      title: definition?.name || "過去のバッジ",
      detail: definition?.legacy || !definition?.enabled ? "現在は獲得できないバッジです。" : "歩いてきた時間が、ひとつの称号になりました。",
      dateValue: typeof record.earnedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(record.earnedAt) ? record.earnedAt.slice(0, 10) : null,
      sortKey: record.earnedAt || "0000-00-00T00:00:00+09:00",
      priority: 3,
    });
  });

  const safeLimit = Math.max(1, Math.floor(Number(limit) || 8));
  return events
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey) || b.priority - a.priority)
    .slice(0, safeLimit);
}

export function getDiscoveryForPath(pathname) {
  const decodedPath = decodeURIComponent(String(pathname || "")).replace(/\/index\.html$/, "").replace(/\/+$/, "") || "/";
  return badgeDefinitions.find((badge) => badge.category === "discovery" && badge.enabled && badge.pathPrefixes?.some((prefix) => decodedPath === prefix || decodedPath.startsWith(`${prefix}/`))) || null;
}

export function getArticleContext(pathname, documentRef = document) {
  const decodedPath = decodeURIComponent(String(pathname || ""));
  const match = decodedPath.match(/\/articles\/([^/]+)\/?$/);
  if (!match || !match[1] || match[1] === "index.html") return null;
  const body = documentRef.querySelector("[data-article-body], .article-page__body");
  if (!body) return null;
  const title = documentRef.querySelector("article h1, main h1")?.textContent?.trim() || documentRef.title;
  return { id: match[1], body, title };
}



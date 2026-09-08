import test from "node:test";
import assert from "node:assert/strict";
import {
  badgeDefinitions,
  createBackup,
  getDefaultState,
  getBadgeDistance,
  getDiscoveryForPath,
  getFootprints,
  getLevelFromExp,
  parseBackup,
  recordArticleRead,
  recordVisit,
  restoreBackup,
  syncEligibleBadges,
} from "../data/fire-life.js";

const requestedLevelTitles = [
  [1, "自由の火を灯す者"],
  [5, "FIREルーキー"],
  [10, "FIRE冒険者"],
  [15, "まだ見ぬ自由を探す者"],
  [20, "選べない人生に終止符を"],
  [25, "誰かの正解を降りた者"],
  [30, "行き先は、自分で決める"],
  [35, "自由への翼"],
  [40, "自由設計士"],
  [45, "時間資産家"],
  [50, "時間を取り戻す旅人"],
  [55, "不自由の終わり、旅の始まり"],
  [60, "人生を散歩する者"],
  [65, "暇を恐れない者"],
  [70, "大人の秘密基地の住人"],
  [75, "遊ぶ、ゆえに人生"],
  [80, "大人の本気は、遊びに使う"],
  [85, "いつかではなく、今を生きる胆力"],
  [90, "ワクワクを取り戻す者"],
  [95, "前人未到の旅の始まり"],
  [100, "FIREレジェンド"],
];

test("FIRE人生のLEVELはEXPから上限なしで計算する", () => {
  assert.equal(getLevelFromExp(0), 1);
  assert.equal(getLevelFromExp(100), 2);
  assert.equal(getLevelFromExp(10_000), 101);
});

test("LEVELバッジは指定された21の節目と称号を持つ", () => {
  const actual = badgeDefinitions
    .filter((badge) => badge.category === "level")
    .sort((a, b) => a.threshold - b.threshold)
    .map((badge) => [badge.threshold, badge.name]);
  assert.deepEqual(actual, requestedLevelTitles);
});

test("同じ記事は一度だけEXPになり、読了でLEVELバッジも判定する", () => {
  const state = getDefaultState();
  for (let index = 0; index < 10; index += 1) {
    const result = recordArticleRead(state, `article-${index}`, new Date("2026-01-01T00:00:00Z"));
    assert.equal(result.awarded, true);
  }

  const duplicate = recordArticleRead(state, "article-0", new Date("2026-01-01T00:00:00Z"));
  assert.equal(duplicate.awarded, false);
  assert.equal(state.totalExp, 100);
  assert.equal(state.badges.some((badge) => badge.id === "level-1-free-fire"), true);
  assert.equal(state.articleReadHistory.length, 10);
});

test("初回訪問だけでは空状態を保ち、最初の記事でLv.1バッジが灯る", () => {
  const state = getDefaultState();
  recordVisit(state, new Date("2026-01-01T00:00:00Z"));
  syncEligibleBadges(state, new Date("2026-01-01T00:00:00Z"));
  assert.equal(state.badges.length, 0);

  const result = recordArticleRead(state, "first-article", new Date("2026-01-01T00:00:00Z"), { title: "最初のFIREコラム" });
  assert.equal(result.newlyEarnedBadges.some((badge) => badge.id === "level-1-free-fire"), true);
  assert.deepEqual(state.articleReadHistory[0], {
    id: "first-article",
    title: "最初のFIREコラム",
    readAt: "2026-01-01T00:00:00.000Z",
  });
});

test("訪問はJSTの同じ日を重複せず、連続と累計を別に積み上げる", () => {
  const state = getDefaultState();
  recordVisit(state, new Date("2026-01-01T14:30:00Z"));
  const sameTokyoDay = recordVisit(state, new Date("2026-01-01T14:59:00Z"));
  recordVisit(state, new Date("2026-01-01T15:00:00Z"));
  recordVisit(state, new Date("2026-01-03T15:00:00Z"));

  assert.equal(sameTokyoDay.isNewDay, false);
  assert.equal(state.totalVisitDays, 3);
  assert.equal(state.currentStreak, 1);
  assert.equal(state.longestStreak, 2);
  assert.equal(state.badges.some((badge) => badge.id === "visit-3-regular"), true);
});

test("主要コンテンツのURLはDISCOVERYバッジ定義へ解決する", () => {
  assert.equal(getDiscoveryForPath("/ワールドツアー/index.html").sourceContentId, "world-tour");
  assert.equal(getDiscoveryForPath("/risk-runner/").sourceContentId, "risk-runner");
  assert.equal(getDiscoveryForPath("/articles/fire-4percent-rule/"), null);
});

test("定義されたカテゴリ数と既存値からの閾値同期を確認する", () => {
  const categories = badgeDefinitions.filter((badge) => badge.enabled && !badge.legacy).reduce((result, badge) => {
    result[badge.category] = (result[badge.category] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(categories, { level: 21, discovery: 8, streak: 7, visit: 7 });

  const state = getDefaultState();
  state.totalExp = 4_900;
  const result = syncEligibleBadges(state, new Date("2026-01-01T00:00:00Z"));
  assert.equal(result.newlyEarnedBadges.some((badge) => badge.id === "level-50-time-traveler"), true);
});

test("VISITバッジは称号を繰り上げ、1000日定義を新規付与しない", () => {
  const active = badgeDefinitions
    .filter((badge) => badge.category === "visit" && badge.enabled && !badge.legacy)
    .sort((a, b) => a.threshold - b.threshold)
    .map((badge) => [badge.threshold, badge.name]);
  assert.deepEqual(active, [
    [3, "ちょっと常連"],
    [10, "ワクワク常連"],
    [30, "いつもの席"],
    [50, "かなり住んでる"],
    [100, "ほぼ住人"],
    [300, "長い付き合い"],
    [500, "もうここ家やん"],
  ]);
  assert.equal(badgeDefinitions.some((badge) => badge.id === "visit-1000" && badge.enabled), false);
  assert.equal(badgeDefinitions.some((badge) => badge.id === "visit-3" && badge.legacy), true);
});

test("次のバッジにカテゴリごとの距離を表示できる", () => {
  const state = getDefaultState();
  state.totalExp = 1_600;
  state.currentStreak = 5;
  state.totalVisitDays = 8;

  const levelBadge = badgeDefinitions.find((badge) => badge.id === "level-20-end-of-cage");
  const streakBadge = badgeDefinitions.find((badge) => badge.id === "streak-7");
  const visitBadge = badgeDefinitions.find((badge) => badge.id === "visit-10-wakuwaku-regular");
  const discoveryBadge = badgeDefinitions.find((badge) => badge.id === "discovery-world-tour");

  assert.equal(getBadgeDistance(state, levelBadge).label, "Lv.20まであと3Lv");
  assert.equal(getBadgeDistance(state, streakBadge).label, "あと2日連続");
  assert.equal(getBadgeDistance(state, visitBadge).label, "累計あと2日");
  assert.equal(getBadgeDistance(state, discoveryBadge).label, "開くと獲得");
});

test("FIRE人生の足あとを時系列で組み立て、バックアップから復元できる", () => {
  const state = getDefaultState();
  recordVisit(state, new Date("2026-01-01T00:00:00Z"));
  recordVisit(state, new Date("2026-01-02T00:00:00Z"));
  recordArticleRead(state, "article-trail", new Date("2026-01-02T02:00:00Z"), { title: "足あとになる記事" });
  syncEligibleBadges(state, new Date("2026-01-02T02:00:00Z"));

  const footprints = getFootprints(state, 8);
  assert.equal(footprints[0].category, "BADGE");
  assert.equal(footprints.some((item) => item.category === "READ" && item.title === "足あとになる記事"), true);
  assert.equal(footprints.some((item) => item.category === "START"), true);

  state.nickname = "まる";
  const backup = createBackup(state, new Date("2026-01-03T00:00:00Z"));
  const restored = parseBackup(backup);
  assert.equal(restored.nickname, "まる");
  assert.equal(restored.articleReadHistory[0].title, "足あとになる記事");
  assert.equal(restored.version, 2);
  assert.equal(restoreBackup(backup).totalExp, state.totalExp);
});



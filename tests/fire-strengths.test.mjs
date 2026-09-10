import test from "node:test";
import assert from "node:assert/strict";
import {
  QUESTIONS,
  TRAITS,
  FIRE_TYPES,
  calculateTypeScore,
  calculateFireStrengthResult
} from "../data/fire-strengths-data.js";
import { onRequestPost } from "../functions/api/fire-strengths/results.js";
import { MINIMUM_RESULTS, onRequestGet } from "../functions/api/fire-strengths/stats.js";

function bodyFor(answers = Array(QUESTIONS.length).fill("A"), responseTimes = Array(QUESTIONS.length).fill(1200)) {
  const result = calculateFireStrengthResult(answers, responseTimes);
  return {
    id: "6f1e3c4a-1db7-4b0e-8d64-10b8df5d0d12",
    displayName: "テストさん",
    fireTypeId: result.fireType.id,
    topTraitIds: result.topTraits.map((trait) => trait.id),
    answers,
    responseTimes
  };
}

function postContext(database, body) {
  return {
    env: { DB: database },
    request: new Request("https://example.test/api/fire-strengths/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  };
}

class InsertDatabase {
  constructor() {
    this.ids = new Set();
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...values) {
        this.values = values;
        return this;
      },
      async run() {
        const id = this.values[0];
        const changes = database.ids.has(id) ? 0 : 1;
        database.ids.add(id);
        return { meta: { changes } };
      }
    };
  }
}

test("質問は45問で、全資質がA3回・B3回・合計6回、対戦カードも重複しない", () => {
  assert.equal(QUESTIONS.length, 45);
  assert.equal(TRAITS.length, 15);
  const counts = Object.fromEntries(TRAITS.map((trait) => [trait.id, { A: 0, B: 0 }]));
  const pairs = new Set();
  QUESTIONS.forEach((question) => {
    assert.equal(question.options.length, 2);
    const [a, b] = question.options;
    assert.notEqual(a.traitId, b.traitId);
    counts[a.traitId].A += 1;
    counts[b.traitId].B += 1;
    const pair = [a.traitId, b.traitId].sort().join("|");
    assert.equal(pairs.has(pair), false, `重複した対戦カード: ${pair}`);
    pairs.add(pair);
  });
  assert.equal(pairs.size, 45);
  Object.values(counts).forEach((count) => assert.deepEqual(count, { A: 3, B: 3 }));
});
test("同じ回答セットは決定論的で、TOP5と15資質順位を返す", () => {
  const answers = QUESTIONS.map((_, index) => index % 2 ? "B" : "A");
  const times = QUESTIONS.map((_, index) => 600 + index * 20);
  const first = calculateFireStrengthResult(answers, times);
  const second = calculateFireStrengthResult(answers, times);
  assert.deepEqual(first, second);
  assert.equal(first.rankedTraits.length, 15);
  assert.equal(first.topTraits.length, 5);
  assert.equal(new Set(first.topTraits.map((trait) => trait.id)).size, 5);
  assert.equal(first.typeScores.length, FIRE_TYPES.length);
  assert.equal(first.fireType.score, calculateTypeScore(first.fireType, first.traitScores));
});

test("全A・全Bでも同じ入力は毎回同じ結果になり、回答時間補正は相対値で計算される", () => {
  const answersA = Array(QUESTIONS.length).fill("A");
  const answersB = Array(QUESTIONS.length).fill("B");
  const times = Array(QUESTIONS.length).fill(1000);
  assert.deepEqual(calculateFireStrengthResult(answersA, times), calculateFireStrengthResult(answersA, times));
  assert.deepEqual(calculateFireStrengthResult(answersB, times), calculateFireStrengthResult(answersB, times));
  const quick = calculateFireStrengthResult(answersA, [100, ...Array(44).fill(1000)]);
  assert.ok(quick.traitScores.income.speedAdjustment > 0 || quick.traitScores.play.speedAdjustment > 0);
});

test("保存APIは回答から再計算し、同じidの二重送信を1件にする", async () => {
  const database = new InsertDatabase();
  const body = bodyFor();
  const firstResponse = await onRequestPost(postContext(database, body));
  const first = await firstResponse.json();
  assert.equal(firstResponse.status, 200);
  assert.equal(first.saved, true);
  const secondResponse = await onRequestPost(postContext(database, body));
  const second = await secondResponse.json();
  assert.equal(secondResponse.status, 200);
  assert.equal(second.saved, false);
  assert.equal(database.ids.size, 1);
});

test("保存APIは不正なタイプや改ざんされたTOP5を拒否する", async () => {
  const database = new InsertDatabase();
  const invalidType = bodyFor();
  invalidType.fireTypeId = "unknown";
  const invalidTypeResponse = await onRequestPost(postContext(database, invalidType));
  assert.equal(invalidTypeResponse.status, 400);
  const mismatchedTop = bodyFor();
  mismatchedTop.topTraitIds = ["freedom", "margin", "self_design", "security", "now"];
  const mismatchedResponse = await onRequestPost(postContext(database, mismatchedTop));
  assert.equal(mismatchedResponse.status, 400);
});

test("統計APIはSQL集計値から12タイプと1位資質の割合を返す", async () => {
  const queries = [];
  const database = {
    prepare(sql) {
      queries.push(sql);
      if (sql.includes("COUNT(*) AS total_results")) return { all: async () => ({ results: [{ total_results: MINIMUM_RESULTS }] }) };
      if (sql.includes("fire_type_id")) return { all: async () => ({ results: [{ fire_type_id: "enjoy_life", count: 5 }, { fire_type_id: "adventure", count: 5 }] }) };
      return { all: async () => ({ results: [{ trait_id: "play", count: 5 }, { trait_id: "experience", count: 5 }] }) };
    }
  };
  const response = await onRequestGet({ env: { DB: database }, request: new Request("https://example.test/api/fire-strengths/stats") });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.available, true);
  assert.equal(payload.totalResults, MINIMUM_RESULTS);
  assert.equal(payload.types.length, 12);
  assert.equal(payload.types[0].typeId, "adventure");
  assert.equal(payload.types.find((type) => type.typeId === "enjoy_life").percentage, 50);
  assert.equal(payload.topTraits.length, 15);
  assert.equal(payload.topTraits[0].percentage, 50);
  assert.ok(queries.some((sql) => sql.includes("top_trait_1")));
});

test("統計APIは回答が10件未満なら集計内容を返さない", async () => {
  const queries = [];
  const database = {
    prepare(sql) {
      queries.push(sql);
      return { all: async () => ({ results: [{ total_results: MINIMUM_RESULTS - 1 }] }) };
    }
  };
  const response = await onRequestGet({ env: { DB: database }, request: new Request("https://example.test/api/fire-strengths/stats") });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.available, false);
  assert.equal(payload.reason, "insufficient_results");
  assert.equal(payload.minimumResults, MINIMUM_RESULTS);
  assert.equal(payload.totalResults, MINIMUM_RESULTS - 1);
  assert.equal(queries.length, 1);
});

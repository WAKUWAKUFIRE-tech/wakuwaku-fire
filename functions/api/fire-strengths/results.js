import {
  ALGORITHM_VERSION,
  QUESTION_VERSION,
  QUESTIONS,
  TRAITS,
  calculateFireStrengthResult
} from "../../../data/fire-strengths-data.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 50000;
const MAX_RESPONSE_TIME_MS = 3600000;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
function cleanDisplayName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/[\t\r\n ]+/g, " ");
}

function isValidAnswers(value) {
  return Array.isArray(value) && value.length === QUESTIONS.length && value.every((answer) => answer === "A" || answer === "B");
}

function isValidResponseTimes(value) {
  return Array.isArray(value) && value.length === QUESTIONS.length && value.every((time) => {
    const number = Number(time);
    return Number.isFinite(number) && number >= 0 && number <= MAX_RESPONSE_TIME_MS;
  });
}

function sameIds(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function serializableTraitScores(result) {
  return Object.fromEntries(TRAITS.map((trait) => {
    const score = result.traitScores[trait.id];
    return [trait.id, {
      baseWins: score.baseWins,
      finalScore: Number(score.finalScore.toFixed(6)),
      winRate: score.winRate,
      strengthLabel: score.strengthLabel
    }];
  }));
}

export async function onRequestPost(context) {
  const database = context.env && context.env.DB;
  if (!database) return json({ ok: false, available: false, error: "database_unavailable" }, 503);

  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: "request_too_large" }, 413);

  let body;
  try {
    body = await context.request.json();
  } catch (error) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const id = body && body.id;
  const displayName = cleanDisplayName(body && body.displayName);
  const answers = body && body.answers;
  const responseTimes = body && body.responseTimes;
  const fireTypeId = body && body.fireTypeId;
  const topTraitIds = body && body.topTraitIds;
  if (
    typeof id !== "string" || !UUID_PATTERN.test(id) ||
    [...displayName].length < 1 || [...displayName].length > 20 ||
    !isValidAnswers(answers) || !isValidResponseTimes(responseTimes) ||
    typeof fireTypeId !== "string" || !Array.isArray(topTraitIds) || topTraitIds.length !== 5 ||
    topTraitIds.some((traitId) => !TRAITS.some((trait) => trait.id === traitId))
  ) {
    return json({ ok: false, error: "invalid_result" }, 400);
  }

  const calculated = calculateFireStrengthResult(answers, responseTimes);
  const calculatedTopTraitIds = calculated.topTraits.map((trait) => trait.id);
  if (fireTypeId !== calculated.fireType.id || !sameIds(topTraitIds, calculatedTopTraitIds)) {
    return json({ ok: false, error: "result_mismatch" }, 400);
  }

  const createdAt = new Date().toISOString();
  const traitScoresJson = JSON.stringify(serializableTraitScores(calculated));
  const domainScoresJson = JSON.stringify(calculated.domainScores.map((domain) => ({ id: domain.id, score: Number(domain.score.toFixed(6)) })));
  const answersJson = JSON.stringify(calculated.answers);
  const responseTimesJson = JSON.stringify(calculated.responseTimes);
  try {
    const query = await database.prepare(
      "INSERT INTO fire_strength_results (" +
      "id, display_name, fire_type_id, fire_type_name, top_trait_1, top_trait_2, top_trait_3, top_trait_4, top_trait_5, " +
      "trait_scores_json, domain_scores_json, answers_json, response_times_json, algorithm_version, question_version, created_at" +
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT (id) DO NOTHING"
    ).bind(
      id.toLowerCase(),
      displayName,
      calculated.fireType.id,
      calculated.fireType.name,
      calculatedTopTraitIds[0],
      calculatedTopTraitIds[1],
      calculatedTopTraitIds[2],
      calculatedTopTraitIds[3],
      calculatedTopTraitIds[4],
      traitScoresJson,
      domainScoresJson,
      answersJson,
      responseTimesJson,
      ALGORITHM_VERSION,
      QUESTION_VERSION,
      createdAt
    ).run();
    const changes = query && query.meta && Number.isFinite(Number(query.meta.changes)) ? Number(query.meta.changes) : 1;
    return json({ ok: true, available: true, id: id.toLowerCase(), saved: changes > 0 });
  } catch (error) {
    return json({ ok: false, available: false, error: "database_unavailable" }, 503);
  }
}

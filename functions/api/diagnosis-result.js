import { DIAGNOSIS_TYPES, hasResultId } from "../_result-master.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function onRequestPost(context) {
  const database = context.env && context.env.DB;
  if (!database) {
    return json({ ok: false, available: false, error: "ranking_unavailable" }, 503);
  }

  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return json({ ok: false, error: "request_too_large" }, 413);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (error) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const diagnosisType = body && body.diagnosis_type;
  const resultId = body && body.result_id;
  const anonymousId = body && body.anonymous_id;
  if (
    typeof diagnosisType !== "string" || !DIAGNOSIS_TYPES.includes(diagnosisType) ||
    typeof resultId !== "string" || !hasResultId(diagnosisType, resultId) ||
    typeof anonymousId !== "string" || !UUID_PATTERN.test(anonymousId)
  ) {
    return json({ ok: false, error: "invalid_result" }, 400);
  }

  const now = new Date().toISOString();
  try {
    await database.prepare(
      "INSERT INTO diagnosis_results (anonymous_id, diagnosis_type, result_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT (anonymous_id, diagnosis_type) DO UPDATE SET result_id = excluded.result_id, updated_at = excluded.updated_at"
    ).bind(anonymousId.toLowerCase(), diagnosisType, resultId, now, now).run();
  } catch (error) {
    return json({ ok: false, available: false, error: "database_unavailable" }, 503);
  }

  return json({ ok: true, available: true });
}



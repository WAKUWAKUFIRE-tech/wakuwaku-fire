import { RESULT_MASTER, DIAGNOSIS_TYPES } from "../_result-master.js";

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

export async function onRequestGet(context) {
  const type = new URL(context.request.url).searchParams.get("type");
  if (!DIAGNOSIS_TYPES.includes(type)) {
    return json({ available: false, error: "invalid_type" }, 400);
  }

  const database = context.env && context.env.DB;
  if (!database) {
    return json({ available: false, error: "ranking_unavailable" }, 503);
  }

  try {
    const query = await database.prepare(
      "SELECT result_id, COUNT(*) AS count FROM diagnosis_results WHERE diagnosis_type = ? GROUP BY result_id"
    ).bind(type).all();
    const counts = {};
    (query.results || []).forEach(function (row) {
      if (Object.prototype.hasOwnProperty.call(RESULT_MASTER[type], row.result_id)) {
        counts[row.result_id] = Number(row.count) || 0;
      }
    });

    const resultIds = Object.keys(RESULT_MASTER[type]);
    const total = resultIds.reduce(function (sum, resultId) {
      return sum + (counts[resultId] || 0);
    }, 0);
    resultIds.sort(function (left, right) {
      const countDifference = (counts[right] || 0) - (counts[left] || 0);
      if (countDifference) return countDifference;
      return left < right ? -1 : left > right ? 1 : 0;
    });

    return json({
      available: true,
      type: type,
      total: total,
      results: resultIds.map(function (resultId, index) {
        const count = counts[resultId] || 0;
        return {
          resultId: resultId,
          count: count,
          percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0,
          rank: index + 1
        };
      })
    });
  } catch (error) {
    return json({ available: false, error: "database_unavailable" }, 503);
  }
}


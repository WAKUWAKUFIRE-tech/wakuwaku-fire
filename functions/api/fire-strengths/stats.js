import { FIRE_TYPES, TRAITS } from "../../../data/fire-strengths-data.js";

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
export async function onRequestGet(context) {
  const database = context.env && context.env.DB;
  if (!database) return json({ ok: false, available: false, error: "database_unavailable" }, 503);

  try {
    const [totalQuery, typeQuery, traitQuery] = await Promise.all([
      database.prepare("SELECT COUNT(*) AS total_results FROM fire_strength_results").all(),
      database.prepare("SELECT fire_type_id, MAX(fire_type_name) AS fire_type_name, COUNT(*) AS count FROM fire_strength_results GROUP BY fire_type_id").all(),
      database.prepare("SELECT top_trait_1 AS trait_id, COUNT(*) AS count FROM fire_strength_results WHERE top_trait_1 IS NOT NULL GROUP BY top_trait_1").all()
    ]);
    const totalResults = Number(totalQuery.results?.[0]?.total_results) || 0;
    const typeCounts = Object.fromEntries((typeQuery.results || []).map((row) => [row.fire_type_id, Number(row.count) || 0]));
    const traitCounts = Object.fromEntries((traitQuery.results || []).map((row) => [row.trait_id, Number(row.count) || 0]));
    const typeOrder = Object.fromEntries(FIRE_TYPES.map((type, index) => [type.id, index]));
    const types = FIRE_TYPES.map((type) => ({
      typeId: type.id,
      name: type.name,
      count: typeCounts[type.id] || 0,
      percentage: totalResults ? Number((((typeCounts[type.id] || 0) / totalResults) * 100).toFixed(1)) : 0,
      order: typeOrder[type.id]
    })).sort((left, right) => right.count - left.count || left.order - right.order).map((type, index) => ({
      typeId: type.typeId,
      name: type.name,
      count: type.count,
      percentage: type.percentage,
      rank: index + 1
    }));
    const traits = TRAITS.map((trait, index) => ({
      traitId: trait.id,
      name: trait.name,
      count: traitCounts[trait.id] || 0,
      percentage: totalResults ? Number((((traitCounts[trait.id] || 0) / totalResults) * 100).toFixed(1)) : 0,
      order: index
    })).sort((left, right) => right.count - left.count || left.order - right.order).map((trait, index) => ({
      traitId: trait.traitId,
      name: trait.name,
      count: trait.count,
      percentage: trait.percentage,
      rank: index + 1
    }));

    return json({ ok: true, available: true, totalResults, types, topTraits: traits });
  } catch (error) {
    return json({ ok: false, available: false, error: "database_unavailable" }, 503);
  }
}

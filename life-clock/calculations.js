// Values are yen and years. Fixed effective annual return, end-of-month spending.
export const DAYS_PER_YEAR = 365.2425;
export const DAY_MS = 86400000;
export function validateProfile(p) {
  const errors = {};
  for (const key of ['age', 'assets', 'spending', 'rate', 'lifespan', 'healthspan']) {
    if (!Number.isFinite(p[key])) errors[key] = '数値を入力してください。';
  }
  if (!Number.isInteger(p.age) || p.age < 0 || p.age > 120) errors.age = '現在年齢は0〜120歳の整数で入力してください。';
  if (p.assets < 0 || p.assets > 1e12) errors.assets = '金融資産は0〜1億万円で入力してください。';
  if (p.spending <= 0 || p.spending > 1e10) errors.spending = '年間生活費は0より大きい額（100万万円以下）を入力してください。';
  if (p.rate < -50 || p.rate > 50) errors.rate = '利回りは−50〜50%で入力してください。';
  if (!Number.isInteger(p.lifespan) || p.lifespan <= p.age || p.lifespan > 130) errors.lifespan = '平均寿命の目安は現在年齢より大きく、130歳以下にしてください。';
  if (!Number.isInteger(p.healthspan) || p.healthspan < p.age || p.healthspan > p.lifespan) errors.healthspan = '健康寿命の目安は現在年齢以上、平均寿命の目安以下にしてください。';
  return errors;
}
export function elapsedDays(anchor, now = Date.now()) {
  return Math.max(0, Math.floor((now - Date.parse(anchor)) / DAY_MS)) || 0;
}
export function calculateRemainingDays(age, horizon, daysElapsed = 0) {
  // Include the final partial day so an exact year horizon does not display one fewer day.
  return Math.max(0, Math.ceil((horizon - age) * DAYS_PER_YEAR) - daysElapsed);
}
export function calculateHealthyDays(age, healthspan, daysElapsed = 0) {
  return calculateRemainingDays(age, healthspan, daysElapsed);
}
export function calculateDailyLifeBudget(assets, rate, days) {
  if (days <= 0 || assets <= 0) return 0;
  const daily = Math.expm1(Math.log1p(rate / 100) / DAYS_PER_YEAR);
  return Math.abs(daily) < 1e-12 ? assets / days : assets * daily / -Math.expm1(-days * Math.log1p(daily));
}
export function calculateAssetLifetime(assets, spending, rate) {
  if (assets <= 0) return 0;
  if (spending <= 0) return Infinity;
  const r = Math.expm1(Math.log1p(rate / 100) / 12), payment = spending / 12;
  if (Math.abs(r) < 1e-12) return assets / spending;
  if (r > 0 && assets * r >= payment) return Infinity;
  // Fractional month locates the zero crossing of the amortization curve.
  return -Math.log1p(-assets * r / payment) / Math.log1p(r) / 12;
}
export function calculateProjectedAssets(assets, spending, rate, years) {
  if (years <= 0) return Math.max(0, assets);
  if (assets <= 0 || years >= calculateAssetLifetime(assets, spending, rate)) return 0;
  const r = Math.expm1(Math.log1p(rate / 100) / 12);
  if (Math.abs(r) < 1e-12) return Math.max(0, assets - spending * years);
  const growth = Math.expm1(years * 12 * Math.log1p(r));
  return Math.max(0, assets * (1 + growth) - spending / 12 * growth / r);
}
export function calculateRemainingEvents(days, frequency, period = 'year') {
  return Math.max(0, Math.floor(days / DAYS_PER_YEAR * frequency * (period === 'month' ? 12 : 1) + 1e-9));
}
export function calculateProjection(p, daysElapsed = 0) {
  const ageNow = p.age + daysElapsed / DAYS_PER_YEAR;
  const yearsLeft = Math.max(0, p.lifespan - ageNow);
  // Assets are a snapshot at anchor; age/date advance without pretending to know actual balances.
  const lifetime = calculateAssetLifetime(p.assets, p.spending, p.rate);
  const points = [];
  for (let y = 0; y < yearsLeft; y += 1) points.push({ age: ageNow + y, assets: calculateProjectedAssets(p.assets, p.spending, p.rate, y) });
  if (lifetime < yearsLeft) points.push({ age: ageNow + lifetime, assets: 0 });
  points.push({ age: Math.max(ageNow, p.lifespan), assets: calculateProjectedAssets(p.assets, p.spending, p.rate, yearsLeft) });
  points.sort((a, b) => a.age - b.age);
  return { ageNow, lifetime, zeroAge: ageNow + lifetime, points, finalAssets: calculateProjectedAssets(p.assets, p.spending, p.rate, yearsLeft) };
}


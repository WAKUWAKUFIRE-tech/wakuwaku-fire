import test from 'node:test';
import assert from 'node:assert/strict';
import { DAYS_PER_YEAR, DAY_MS, validateProfile, elapsedDays, calculateHealthyDays, calculateDailyLifeBudget, calculateAssetLifetime, calculateProjectedAssets, calculateRemainingEvents, calculateProjection } from '../life-clock/calculations.js';
import { createStorage, emptyState, STORAGE_KEY } from '../life-clock/storage.js';
const A = { age: 36, assets: 60e6, spending: 3e6, rate: 3, lifespan: 88, healthspan: 75 };
const B = { age: 50, assets: 20e6, spending: 4e6, rate: 1, lifespan: 90, healthspan: 72 };
const C = { age: 30, assets: 100e6, spending: 2.4e6, rate: 4, lifespan: 85, healthspan: 78 };
// Independent month-by-month recurrence to check the closed-form implementation.
function simulate(p, months) { let balance = p.assets; const rate = (1 + p.rate / 100) ** (1 / 12) - 1; for (let i = 0; i < months; i++) balance = Math.max(0, balance * (1 + rate) - p.spending / 12); return balance; }
for (const [name, p] of Object.entries({ A, B, C })) {
  test(`Case ${name}: projection matches independent monthly recurrence`, () => {
    assert.deepEqual(validateProfile(p), {});
    for (const years of [1, 3, 5, 10, p.lifespan - p.age]) assert.ok(Math.abs(calculateProjectedAssets(p.assets, p.spending, p.rate, years) - simulate(p, years * 12)) < .05);
    const life = calculateAssetLifetime(p.assets, p.spending, p.rate);
    if (Number.isFinite(life)) { assert.ok(simulate(p, Math.floor(life * 12)) > 0); assert.equal(simulate(p, Math.ceil(life * 12)), 0); }
    else assert.ok(simulate(p, 100 * 12) > p.assets);
  });
}
test('A/B/C expected ranges, without optimistic lifetime assumptions', () => {
  const a = calculateAssetLifetime(A.assets, A.spending, A.rate), b = calculateAssetLifetime(B.assets, B.spending, B.rate);
  assert.ok(a > 30 && a < 31); assert.ok(b > 5 && b < 5.2); assert.equal(calculateAssetLifetime(C.assets, C.spending, C.rate), Infinity);
});
test('D: zero assets stays zero', () => { assert.deepEqual(validateProfile({ ...A, assets: 0 }), {}); assert.equal(calculateAssetLifetime(0, A.spending, 3), 0); assert.equal(calculateProjectedAssets(0, A.spending, 3, 52), 0); assert.equal(calculateDailyLifeBudget(0, 3, 100), 0); });
test('E: zero expenses explained in validation, pure functions do not divide by zero', () => { assert.ok(validateProfile({ ...A, spending: 0 }).spending); assert.equal(calculateAssetLifetime(60e6, 0, 3), Infinity); assert.ok(Number.isFinite(calculateProjectedAssets(60e6, 0, 3, 10))); });
test('F: healthspan below age rejected', () => assert.ok(validateProfile({ ...A, healthspan: 35 }).healthspan));
test('G: healthspan above lifespan rejected', () => assert.ok(validateProfile({ ...A, healthspan: 90 }).healthspan));
test('Nonfinite, negative, empty and unreasonable inputs rejected', () => { for (const key of Object.keys(A)) assert.ok(Object.keys(validateProfile({ ...A, [key]: NaN })).length); assert.ok(validateProfile({ ...A, assets: -1 }).assets); assert.ok(validateProfile({ ...A, rate: -100 }).rate); assert.ok(validateProfile({ ...A, lifespan: A.age }).lifespan); });
test('Healthy days subtract elapsed time and clamp to zero', () => { assert.equal(calculateHealthyDays(36, 75), 14245); assert.equal(calculateHealthyDays(36, 75, 7), 14238); assert.equal(calculateHealthyDays(75, 75), 0); assert.equal(calculateHealthyDays(76, 75), 0); assert.equal(calculateRemainingEvents(calculateHealthyDays(36, 75), 1), 39); });
test('Elapsed days handles future dates and clock skew', () => { const now = Date.parse('2026-09-10T12:00:00Z'); assert.equal(elapsedDays('2026-09-03T12:00:00Z', now), 7); assert.equal(elapsedDays('2026-10-10T12:00:00Z', now), 0); assert.equal(elapsedDays('bad', now), 0); assert.equal(elapsedDays(new Date(now - DAY_MS).toISOString(), now), 1); });
test('Budget zero return and zero horizon', () => { assert.equal(calculateDailyLifeBudget(100000, 0, 100), 1000); assert.equal(calculateDailyLifeBudget(100000, 3, 0), 0); });
test('Budget amortizes exactly at daily positive and negative returns', () => { for (const rate of [-10, 0, 3, 10]) { const days = 1000, start = 1e6, draw = calculateDailyLifeBudget(start, rate, days), r = (1 + rate / 100) ** (1 / DAYS_PER_YEAR) - 1; let balance = start; for (let i = 0; i < days; i++) balance = balance * (1 + r) - draw; assert.ok(Math.abs(balance) < .001); } });
test('Zero and negative returns use correct depletion and no negative balance', () => { assert.equal(calculateAssetLifetime(60e6, 3e6, 0), 20); assert.equal(calculateProjectedAssets(60e6, 3e6, 0, 10), 30e6); assert.ok(calculateAssetLifetime(60e6, 3e6, -5) < 20); assert.equal(calculateProjectedAssets(60e6, 3e6, -5, 80), 0); });
test('Event frequency matches years/months and clamps past horizon', () => { assert.equal(calculateRemainingEvents(31 * DAYS_PER_YEAR, 1), 31); assert.equal(calculateRemainingEvents(31 * DAYS_PER_YEAR, 2), 62); assert.equal(calculateRemainingEvents(31 * DAYS_PER_YEAR, 2, 'month'), 744); assert.equal(calculateRemainingEvents(0, 2), 0); });
test('Graph includes zero crossing and final endpoint in sorted order', () => { const m = calculateProjection(B); assert.equal(m.points[0].age, 50); assert.equal(m.points.at(-1).age, 90); assert.ok(m.points.some(p => p.age === m.zeroAge && p.assets === 0)); assert.ok(m.points.every((p, i) => i === 0 || p.age >= m.points[i - 1].age)); });
test('Storage saves and reloads exact data and resets only its namespace', () => { const map = new Map([['other-app', 'keep']]); const adapter = createStorage({ getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }); const data = { ...emptyState(), profile: { ...A, anchor: new Date().toISOString() }, events: [{ id: '1', name: '親と会う', frequency: 1, period: 'month' }], logs: [{ id: '1', text: '公園', date: new Date().toISOString() }] }; adapter.save(data); assert.deepEqual(adapter.load(), data); adapter.reset(); assert.equal(map.has(STORAGE_KEY), false); assert.equal(map.get('other-app'), 'keep'); });
test('Corrupt and future-version storage never silently overwrites', () => { for (const value of ['{bad', '{"version":2,"events":[],"logs":[]}', '{"version":1,"events":[{}],"logs":[]}']) { let written = false; const s = createStorage({ getItem: () => value, setItem: () => { written = true; } }); assert.throws(() => s.load()); assert.equal(written, false); } });
test('Storage quota failure propagates to UI for honest feedback', () => { const s = createStorage({ setItem: () => { throw new Error('quota'); } }); assert.throws(() => s.save(emptyState()), /quota/); });

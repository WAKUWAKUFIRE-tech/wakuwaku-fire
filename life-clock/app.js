import { DAYS_PER_YEAR, DAY_MS, elapsedDays, validateProfile, calculateRemainingDays, calculateHealthyDays, calculateDailyLivingBudget, calculateRequiredLifetimeAssets, calculateWakuwakuSurplus, calculateDailyWakuwakuBudget, calculateCurrentDailyLivingCost, calculateProjection, calculateRemainingEvents, calculateRemainingPersonMeetings, calculateYearRemaining, calculateTrueFreeTime, calculateBucketDaysUntil } from './calculations.js';
import { createStorage, emptyState, createDefaultPeople, createDefaultTimeCategories } from './storage.js';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const fmt = n => nf.format(n);
const write = (id, text) => { $(id).textContent = text; };
const defaults = [
  { name: '🌸 桜を見る', frequency: 1, period: 'year', unit: '回' },
  { name: '🎂 誕生日', frequency: 1, period: 'year', unit: '回' },
  { name: '✈ 年2回の旅行', frequency: 2, period: 'year', unit: '回' },
  { name: '🍜 月2回のラーメン', frequency: 2, period: 'month', unit: '杯' },
];
const allowedEvents = new Set(['life_clock_start', 'life_clock_calculated', 'life_event_added', 'life_log_added', 'pwa_install_clicked', 'share_clicked', 'return_visit']);
// Local extension hook only. No analytics endpoint, profile, identifiers, or log text.
function emit(name) { if (allowedEvents.has(name)) window.dispatchEvent(new CustomEvent('life-clock:event', { detail: { name } })); }
let state = emptyState(), storage, storageBroken = false, noticeTimer, logLimit = 10, installPrompt = null;
function notice(text, persistent = false) {
  clearTimeout(noticeTimer); write('notice', text);
  if (!persistent) noticeTimer = setTimeout(() => write('notice', ''), 6000);
}
try { storage = createStorage(window.localStorage); state = storage.load(); }
catch { storageBroken = true; notice('保存データを読み込めません。ブラウザの保存設定をご確認ください。データを上書きせず停止しています。設定から削除してやり直すこともできます。', true); }
function persist(next) {
  if (storageBroken) { notice('保存データを保護しています。設定で削除するか、ブラウザの保存設定をご確認ください。', true); return false; }
  try { storage.save(next); state = next; return true; }
  catch { notice('保存できませんでした。変更は確定していません。端末の空き容量やブラウザの保存設定をご確認ください。', true); return false; }
}
function show(view) {
  for (const id of ['welcome', 'setup', 'dashboard', 'settings']) $(id).hidden = view !== id;
  $('bottom-nav').hidden = !state.profile && !storageBroken;
  document.querySelectorAll('[data-nav]').forEach(a => {
    if ((view === 'settings' && a.dataset.nav === 'settings') || (view === 'dashboard' && a.dataset.nav === (location.hash.slice(1) || 'home'))) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
function openForm() {
  const p = state.profile;
  if (p) for (const key of ['age', 'assets', 'spending', 'rate', 'lifespan', 'healthspan']) $('profile-form').elements.namedItem(key).value = p[key] / (['assets', 'spending'].includes(key) ? 10000 : 1);
  renderPeopleEditor(state.people?.length ? state.people : createDefaultPeople(p?.age || 36));
  show('setup'); $('setup-title').tabIndex = -1; $('setup-title').focus(); window.scrollTo(0, 0);
}
function renderPeopleEditor(people) {
  const host = $('people-editor');
  if (!host) return;
  host.replaceChildren();
  (Array.isArray(people) ? people : createDefaultPeople()).forEach(person => {
    const row = document.createElement('div'); row.className = 'person-row'; row.dataset.id = person.id || crypto.randomUUID();
    row.innerHTML = '<label>相手の名前<input name="person-name" maxlength="50" placeholder="親、親友、恩師…" required></label><label>相手の年齢<span class="input-unit"><input name="person-age" type="number" inputmode="numeric" min="0" max="130" step="1" required><span>歳</span></span></label><label>会う頻度<span class="input-unit"><input name="person-frequency" type="number" inputmode="decimal" min="0.01" max="1000" step="any" required><span>回</span></span></label><label>期間<select name="person-period"><option value="year">年に</option><option value="month">月に</option></select></label><button type="button" class="remove-person" aria-label="この人を削除">削除</button>';
    row.querySelector('[name="person-name"]').value = person.name || '';
    row.querySelector('[name="person-age"]').value = Number.isFinite(person.age) ? person.age : 36;
    row.querySelector('[name="person-frequency"]').value = Number.isFinite(person.frequency) ? person.frequency : 1;
    row.querySelector('[name="person-period"]').value = person.period === 'month' ? 'month' : 'year';
    row.querySelector('.remove-person').addEventListener('click', () => row.remove());
    host.append(row);
  });
}
function readPeopleEditor() {
  const people = [];
  for (const row of document.querySelectorAll('[data-person-row], #people-editor .person-row')) {
    const name = row.querySelector('[name="person-name"]').value.trim();
    const age = Number(row.querySelector('[name="person-age"]').value);
    const frequency = Number(row.querySelector('[name="person-frequency"]').value);
    const period = row.querySelector('[name="person-period"]').value;
    if (!name || name.length > 50 || !Number.isFinite(age) || age < 0 || age > 130 || !Number.isFinite(frequency) || frequency <= 0 || frequency > 1000 || !['month', 'year'].includes(period)) return { error: '大切な人の名前・年齢・会う頻度を確認してください。' };
    people.push({ id: row.dataset.id || crypto.randomUUID(), name, age, frequency, period });
  }
  return { people };
}
function metrics() {
  const p = state.profile, elapsed = elapsedDays(p.anchor);
  const days = calculateHealthyDays(p.age, p.healthspan, elapsed);
  const lifespanDays = calculateRemainingDays(p.age, p.lifespan, elapsed);
  return { p, elapsed, days, lifespanDays, projection: calculateProjection(p, elapsed) };
}
function lifeClockMetrics() {
  const { p, elapsed } = metrics();
  const mode = state.lifeMode === 'health' ? 'health' : 'average';
  const horizon = mode === 'health' ? p.healthspan : p.lifespan;
  const days = calculateRemainingDays(p.age, horizon, elapsed);
  const targetAt = Date.parse(p.anchor) + (horizon - p.age) * DAYS_PER_YEAR * DAY_MS;
  return { mode, horizon, days, targetAt, age: p.age + elapsed / DAYS_PER_YEAR, totalDays: Math.max(1, horizon * DAYS_PER_YEAR) };
}
function renderLifeClock() {
  if (!state.profile) return;
  const { p } = metrics();
  const m = lifeClockMetrics();
  const remainingMs = Math.max(0, m.targetAt - Date.now());
  const yearsDecimal = remainingMs / (DAYS_PER_YEAR * DAY_MS);
  // Break the countdown from the same fractional-year value used in the ring.
  // This keeps an exact 52-year horizon from rendering as 51 years and 365 days.
  const years = Math.floor(yearsDecimal + 1e-7);
  const afterYearsMs = Math.max(0, Math.floor(remainingMs - years * DAYS_PER_YEAR * DAY_MS));
  const days = Math.floor(afterYearsMs / DAY_MS);
  const hours = Math.floor(afterYearsMs % DAY_MS / 3600000);
  const minutes = Math.floor(afterYearsMs % 3600000 / 60000);
  const seconds = Math.floor(afterYearsMs % 60000 / 1000);
  write('life-card-subtitle', `${p.age}歳 ・ ${m.mode === 'average' ? '平均寿命の目安' : '健康寿命の目安'} ${m.horizon}歳`);
  write('life-remaining-years', yearsDecimal.toFixed(2));
  write('life-remaining-days', `${fmt(m.days)}日`);
  write('life-countdown-years', fmt(years)); write('life-countdown-days', fmt(days)); write('life-countdown-hours', String(hours).padStart(2, '0')); write('life-countdown-minutes', String(minutes).padStart(2, '0')); write('life-countdown-seconds', String(seconds).padStart(2, '0'));
  write('life-card-note', m.mode === 'average' ? `平均寿命の目安までの残り時間。健康に動ける時間は「健康寿命」で切り替えて確認できます。` : `元気にやりたいことを楽しむ期間の目安。設定はあとから自由に見直せます。`);
  const circumference = 2 * Math.PI * 99;
  const progress = Math.min(1, Math.max(0, m.days / m.totalDays));
  const ring = $('life-ring-progress'); ring.style.strokeDasharray = String(circumference); ring.style.strokeDashoffset = String(circumference * (1 - progress));
  ring.setAttribute('aria-label', `${m.mode === 'average' ? '平均寿命' : '健康寿命'}まで残り${fmt(m.days)}日`);
  $('life-mode-average').setAttribute('aria-selected', String(m.mode === 'average')); $('life-mode-health').setAttribute('aria-selected', String(m.mode === 'health'));
  $('life-mode-average').classList.toggle('is-active', m.mode === 'average'); $('life-mode-health').classList.toggle('is-active', m.mode === 'health');
}
function svgNode(tag, attrs, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text !== undefined) node.textContent = text;
  return node;
}
function drawChart() {
  if (!state.profile || $('dashboard').hidden) return;
  const { p, projection: m } = metrics(), width = Math.max(240, $('chart').clientWidth), height = 255;
  const left = width < 450 ? 64 : 80, right = 20, top = 20, bottom = 38;
  const x = age => left + (age - m.ageNow) / Math.max(.01, p.lifespan - m.ageNow) * (width - left - right);
  const peak = Math.max(p.assets, ...m.points.map(pt => pt.assets), 10000) * 1.1;
  const y = assets => height - bottom - assets / peak * (height - top - bottom);
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-labelledby': 'chart-title chart-desc' });
  svg.append(svgNode('title', { id: 'chart-title' }, '現在から平均寿命の目安までの金融資産推移'));
  svg.append(svgNode('desc', { id: 'chart-desc' }, $('chart-summary').textContent));
  for (let i = 0; i <= 3; i++) {
    const value = peak * i / 3;
    svg.append(svgNode('line', { x1: left, y1: y(value), x2: width - right, y2: y(value), stroke: '#e4e4dc' }));
    const label = value >= 1e8 ? `${(value / 1e8).toFixed(1)}億円` : fmt(value / 10000);
    svg.append(svgNode('text', { x: left - 8, y: y(value) + 5, 'text-anchor': 'end', fill: '#66665b', 'font-size': 12 }, label));
  }
  const line = m.points.map((point, i) => `${i ? 'L' : 'M'}${x(point.age).toFixed(2)},${y(point.assets).toFixed(2)}`).join(' ');
  svg.append(svgNode('path', { d: `${line} L${x(m.points.at(-1).age)},${y(0)} L${left},${y(0)} Z`, fill: '#fff3b3' }));
  svg.append(svgNode('path', { d: line, fill: 'none', stroke: '#ba2e23', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
  const addHorizonMarker = (age, kind, title, subtitle) => {
    const markerX = Math.min(width - right - 4, Math.max(left + 4, x(age))), color = kind === 'health' ? '#a86600' : '#ba2e23';
    svg.append(svgNode('rect', { x: markerX - 8, y: top, width: 16, height: y(0) - top, fill: color, opacity: .12 }));
    svg.append(svgNode('line', { x1: markerX, x2: markerX, y1: top, y2: y(0), stroke: color, 'stroke-dasharray': kind === 'health' ? '10 6' : '1 0', 'stroke-width': 4 }));
    if (kind === 'health') svg.append(svgNode('circle', { cx: markerX, cy: top + 6, r: 6, fill: color }));
    else svg.append(svgNode('rect', { x: markerX - 6, y: top, width: 12, height: 12, rx: 2, fill: color }));
    const nearRight = markerX > width - 105, labelX = nearRight ? markerX - 11 : markerX + 11, anchor = nearRight ? 'end' : 'start';
    svg.append(svgNode('text', { x: labelX, y: top + 14, 'text-anchor': anchor, fill: color, 'font-size': 12, 'font-weight': 800 }, title));
    svg.append(svgNode('text', { x: labelX, y: top + 29, 'text-anchor': anchor, fill: color, 'font-size': 11 }, subtitle));
  };
  if (p.healthspan >= m.ageNow) addHorizonMarker(p.healthspan, 'health', '健康寿命', `${p.healthspan}歳`);
  svg.append(svgNode('circle', { cx: left, cy: y(p.assets), r: 5, fill: '#242420' }));
  addHorizonMarker(Math.max(m.ageNow, p.lifespan), 'lifespan', '平均寿命', `${p.lifespan}歳`);
  if (m.zeroAge <= p.lifespan) svg.append(svgNode('rect', { x: x(m.zeroAge) - 5, y: y(0) - 5, width: 10, height: 10, fill: '#ba2e23' }));
  [m.ageNow, (m.ageNow + Math.max(m.ageNow, p.lifespan)) / 2, Math.max(m.ageNow, p.lifespan)].forEach((age, i) => {
    svg.append(svgNode('text', { x: x(age), y: height - 10, 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle', fill: '#66665b', 'font-size': 13 }, `${i === 0 ? '現在 ' : ''}${age.toFixed(0)}歳`));
  });
  $('chart').replaceChildren(svg);
}
function renderEvents(days) {
  $('events-grid').replaceChildren();
  [...defaults, ...state.events].forEach(e => {
    const card = document.createElement('article'); card.className = 'event-card';
    const title = document.createElement('h3'); title.textContent = e.name;
    const count = document.createElement('p'); count.append('あと ');
    const number = document.createElement('strong'); number.textContent = fmt(calculateRemainingEvents(days, e.frequency, e.period));
    count.append(number, e.unit || '回'); card.append(title, count);
    if (e.id) {
      const detail = document.createElement('small'); detail.textContent = `${e.period === 'month' ? '月' : '年'}${e.frequency}回`; card.append(detail);
      const remove = document.createElement('button'); remove.className = 'remove-event'; remove.textContent = '×'; remove.setAttribute('aria-label', `${e.name}を削除`);
      remove.addEventListener('click', () => { if (confirm(`「${e.name}」を削除しますか？`) && persist({ ...state, events: state.events.filter(v => v.id !== e.id) })) { renderEvents(days); notice('イベントを削除しました。'); } });
      card.append(remove);
    }
    $('events-grid').append(card);
  });
}
function renderYearTime() {
  const time = calculateYearRemaining();
  const now = new Date(), end = new Date(now.getFullYear(), 11, 31);
  write('year-time-date', `${end.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}まで`);
  write('year-remaining-days', fmt(time.days));
  write('year-remaining-hours', fmt(Math.floor(time.remainingMs / 3600000)));
  write('year-remaining-minutes', String(Math.floor(time.remainingMs % 3600000 / 60000)).padStart(2, '0'));
}
function updateTimeCategory(id, delta) {
  const categories = state.timeCategories.map(category => category.id === id ? { ...category, hours: Math.min(24, Math.max(0, Math.round((category.hours + delta) * 10) / 10)) } : category);
  if (persist({ ...state, timeCategories: categories })) renderFreeTime();
}
function renderFreeTime() {
  if (!state.profile) return;
  const { lifespanDays } = metrics(), remainingYears = lifespanDays / DAYS_PER_YEAR;
  const model = calculateTrueFreeTime(remainingYears, state.timeCategories);
  write('true-free-years', model.freeYears.toFixed(1));
  write('true-free-detail', `1日あたり ${model.freeHours.toFixed(1)}時間 × 残り ${remainingYears.toFixed(1)}年`);
  write('free-time-tip', `⚡ スマホ・テレビを1日1時間減らすと、自由時間が約${model.oneHourGainYears.toFixed(1)}年増えます`);
  const host = $('time-category-list'); host.replaceChildren();
  state.timeCategories.forEach(category => {
    const row = document.createElement('article'); row.className = 'time-category-row';
    const copy = document.createElement('div'); copy.className = 'time-category-copy';
    const name = document.createElement('strong'); name.textContent = `${category.icon || ''} ${category.name}`.trim();
    const detail = document.createElement('small'); detail.textContent = `残り人生で約${(remainingYears * category.hours / 24).toFixed(1)}年`;
    copy.append(name, detail);
    const controls = document.createElement('div'); controls.className = 'time-category-controls';
    const minus = document.createElement('button'); minus.type = 'button'; minus.className = 'round-control'; minus.textContent = '−'; minus.setAttribute('aria-label', `${category.name}を0.5時間減らす`); minus.disabled = category.hours <= 0; minus.addEventListener('click', () => updateTimeCategory(category.id, -.5));
    const hours = document.createElement('strong'); hours.textContent = `${category.hours.toFixed(1)}h`;
    const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'round-control'; plus.textContent = '+'; plus.setAttribute('aria-label', `${category.name}を0.5時間増やす`); plus.disabled = category.hours >= 24; plus.addEventListener('click', () => updateTimeCategory(category.id, .5));
    controls.append(minus, hours, plus); row.append(copy, controls); host.append(row);
  });
}
function renderPeople() {
  if (!state.profile) return;
  const { p, days, elapsed } = metrics();
  const host = $('people-grid'); host.replaceChildren();
  const people = calculateRemainingPersonMeetings(p, state.people, days, elapsed);
  if (!people.length) { const empty = document.createElement('p'); empty.className = 'empty-log'; empty.textContent = '設定画面から、会いたい人を追加できます。'; host.append(empty); return; }
  people.forEach(person => {
    const card = document.createElement('article'); card.className = 'person-card';
    const title = document.createElement('h3'); title.textContent = person.name;
    const number = document.createElement('strong'); number.textContent = fmt(person.count);
    const count = document.createElement('p'); count.className = 'person-count'; count.append('あと ', number, '回');
    const detail = document.createElement('small'); detail.textContent = `${person.age}歳 ・ ${person.period === 'month' ? '月' : '年'}${person.frequency}回で計算`;
    card.append(title, count, detail); host.append(card);
  });
}
function renderBucketList() {
  const host = $('bucket-list'); if (!host) return;
  host.replaceChildren();
  const items = [...state.bucketList].sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate));
  if (!items.length) { const empty = document.createElement('p'); empty.className = 'empty-log'; empty.textContent = 'まだ登録されていません。期限を決めて、最初のひとつを追加しましょう。'; host.append(empty); return; }
  items.forEach(item => {
    const card = document.createElement('article'); card.className = `bucket-item${item.done ? ' is-done' : ''}`;
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = item.done; check.id = `bucket-check-${item.id}`; check.setAttribute('aria-label', `${item.title}を完了にする`); check.addEventListener('change', () => { persist({ ...state, bucketList: state.bucketList.map(v => v.id === item.id ? { ...v, done: check.checked } : v) }); renderBucketList(); });
    const copy = document.createElement('div'); copy.className = 'bucket-item-copy';
    const title = document.createElement('label'); title.htmlFor = check.id; title.textContent = item.title;
    const due = document.createElement('small'); const days = calculateBucketDaysUntil(item.dueDate); const dateText = new Date(`${item.dueDate}T00:00:00`).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); due.textContent = `${dateText} ・ ${Number.isFinite(days) ? days >= 0 ? `あと${fmt(days)}日` : `期限から${fmt(Math.abs(days))}日` : '期限を確認してください'}`;
    copy.append(title, due);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-bucket'; remove.textContent = '削除'; remove.setAttribute('aria-label', `${item.title}を削除`); remove.addEventListener('click', () => { if (confirm(`「${item.title}」を削除しますか？`) && persist({ ...state, bucketList: state.bucketList.filter(v => v.id !== item.id) })) renderBucketList(); });
    card.append(check, copy, remove); host.append(card);
  });
}
function renderLogs() {
  write('memory-count', fmt(state.logs.length)); $('logs-list').replaceChildren();
  if (!state.logs.length) { const empty = document.createElement('p'); empty.className = 'empty-log'; empty.textContent = 'まだ記録はありません。今日の小さなひとコマから。'; $('logs-list').append(empty); }
  [...state.logs].reverse().slice(0, logLimit).forEach(log => {
    const entry = document.createElement('article'); entry.className = 'log-entry';
    const date = document.createElement('time'); date.dateTime = log.date; date.textContent = new Date(log.date).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const text = document.createElement('p'); text.textContent = log.text; entry.append(date, text); $('logs-list').append(entry);
  });
  $('more-logs').hidden = state.logs.length <= logLimit;
}
function renderDashboard() {
  const { p, days, lifespanDays, projection: m } = metrics();
  const dailyLivingBudget = calculateDailyLivingBudget(p.assets, p.rate, lifespanDays);
  const currentDailyLivingCost = calculateCurrentDailyLivingCost(p.spending);
  const requiredLifetimeAssets = calculateRequiredLifetimeAssets(p.spending, p.rate, lifespanDays);
  const wakuwakuSurplus = calculateWakuwakuSurplus(p.assets, requiredLifetimeAssets);
  const dailyWakuwakuBudget = calculateDailyWakuwakuBudget(wakuwakuSurplus, days);
  write('today-date', new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }));
  renderLifeClock();
  write('daily-living-budget', fmt(Math.round(dailyLivingBudget)));
  write('current-daily-living-cost', fmt(Math.round(currentDailyLivingCost)));
  const difference = Math.round(dailyLivingBudget - currentDailyLivingCost);
  write('living-budget-difference', `${difference > 0 ? '+' : ''}${fmt(difference)}`);
  const comparisonThreshold = Math.max(100, dailyLivingBudget * 0.02);
  write('living-budget-message', difference > comparisonThreshold ? '今の生活ペースなら、想定寿命まで資産が持つ見込みです。' : difference < -comparisonThreshold ? '現在の生活ペースでは、想定寿命より前に資産が尽きる可能性があります。' : '現在の生活費と、生活予算はほぼ同じ水準です。');
  write('daily-wakuwaku-budget', fmt(Math.round(dailyWakuwakuBudget)));
  write('wakuwaku-surplus', `約${fmt(Math.round(wakuwakuSurplus / 10000))}万円`);
  $('wakuwaku-intro').hidden = Boolean(state.wakuwakuIntroSeen);
  $('budget-wakuwaku').classList.toggle('is-zero', wakuwakuSurplus <= 0);
  write('wakuwaku-budget-note', wakuwakuSurplus > 0 ? '将来の生活費を確保したうえで、元気な今に使えるお金です。' : '現在の条件では、まず将来の生活費を確保することを優先する計算です。');
  $('wakuwaku-budget-followup').hidden = wakuwakuSurplus > 0;
  write('asset-lifetime', Number.isFinite(m.zeroAge) ? `${m.zeroAge.toFixed(1)}歳` : '尽きない計算');
  write('lifetime-message', !Number.isFinite(m.lifetime) ? 'この固定利回りでは運用益が生活費を補う計算です。将来の保証ではありません。' : Math.abs(m.zeroAge - p.lifespan) <= 2 ? '人生と資産のペースは、近い状態です。' : m.zeroAge > p.lifespan ? '平均寿命の目安より先まで、資産が持つ予測です。これから楽しみたいことも考えてみましょう。' : '平均寿命の目安より先に、資産が尽きる可能性があります。生活費や収入の計画を見直すきっかけに。');
  write('final-assets-title', `${p.lifespan}歳時点の推定資産`);
  write('final-assets', `${fmt(m.finalAssets / 10000)}万円`);
  write('final-assets-note', m.zeroAge < p.lifespan ? `${p.lifespan}歳までに資産が尽きる可能性があります。` : '残すお金と、今楽しむお金。そのバランスを考えよう。');
  write('chart-legend-health', `健康寿命 ${p.healthspan}歳 ・ワクワク期間の目安`);
  write('chart-legend-lifespan', `平均寿命 ${p.lifespan}歳 ・生活資金の期限`);
  write('chart-summary', `● 現在 ${Math.floor(m.ageNow)}歳 ／ 黄色帯＋橙色マーカー：健康寿命 ${p.healthspan}歳（ワクワク予算の期間目安） ／ 赤帯＋赤マーカー：平均寿命 ${p.lifespan}歳（生活資金を確保する期限） ／ ■ 資産ゼロ：${Number.isFinite(m.zeroAge) ? `${m.zeroAge.toFixed(1)}歳${m.zeroAge > p.lifespan ? '（グラフ範囲外）' : ''}` : 'この条件では尽きない計算'}`);
  write('snapshot-note', `資産は${new Date(p.updatedAt || p.anchor).toLocaleDateString('ja-JP')}に入力した額を現在の残高として使用。実際の増減は自動反映されません。残り日数は日付とともに更新します。生活予算・ワクワク予算は、資産・生活費・利回り・想定寿命をもとにした簡易シミュレーションです。`);
  write('summer-count', fmt(calculateRemainingEvents(days, 1)));
  renderYearTime(); renderFreeTime(); renderEvents(days); renderPeople(); renderBucketList(); renderLogs(); requestAnimationFrame(drawChart);
}
$('start').addEventListener('click', () => { emit('life_clock_start'); openForm(); });
for (const id of ['edit-profile', 'settings-edit']) $(id).addEventListener('click', openForm);
$('edit-people').addEventListener('click', openForm);
$('add-person').addEventListener('click', () => {
  const people = [...document.querySelectorAll('#people-editor .person-row')].map(row => ({
    id: row.dataset.id, name: row.querySelector('[name="person-name"]').value, age: Number(row.querySelector('[name="person-age"]').value), frequency: Number(row.querySelector('[name="person-frequency"]').value), period: row.querySelector('[name="person-period"]').value,
  }));
  people.push({ id: crypto.randomUUID(), name: '', age: state.profile?.age || 36, frequency: 1, period: 'year' });
  renderPeopleEditor(people);
  $('people-editor').lastElementChild?.querySelector('[name="person-name"]')?.focus();
});
$('dismiss-wakuwaku-intro').addEventListener('click', () => {
  if (persist({ ...state, wakuwakuIntroSeen: true })) $('wakuwaku-intro').hidden = true;
});
$('cancel-setup').addEventListener('click', () => { show(state.profile ? 'dashboard' : 'welcome'); if (state.profile) drawChart(); });
for (const [id, mode] of [['life-mode-average', 'average'], ['life-mode-health', 'health']]) $(id).addEventListener('click', () => {
  if (!state.profile || state.lifeMode === mode) return;
  if (persist({ ...state, lifeMode: mode })) renderLifeClock();
});
$('profile-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget), profile = {};
  for (const key of ['age', 'assets', 'spending', 'rate', 'lifespan', 'healthspan']) {
    const raw = data.get(key); profile[key] = raw === '' ? NaN : Number(raw) * (['assets', 'spending'].includes(key) ? 10000 : 1);
  }
  const errors = validateProfile(profile);
  for (const key of ['age', 'assets', 'spending', 'rate', 'lifespan', 'healthspan']) {
    write(`error-${key}`, errors[key] || ''); event.currentTarget.elements.namedItem(key).setAttribute('aria-invalid', String(Boolean(errors[key])));
  }
  if (Object.keys(errors).length) { event.currentTarget.elements.namedItem(Object.keys(errors)[0]).focus(); return; }
  const peopleResult = readPeopleEditor();
  if (peopleResult.error) { notice(peopleResult.error); $('people-editor').querySelector('[name="person-name"]')?.focus(); return; }
  const now = new Date().toISOString();
  profile.anchor = state.profile?.age === profile.age ? state.profile.anchor : now;
  profile.updatedAt = now;
  if (!persist({ ...state, profile, people: peopleResult.people, lastVisit: now })) return;
  emit('life_clock_calculated'); show('dashboard'); renderDashboard(); window.scrollTo(0, 0); $('dashboard-title').tabIndex = -1; $('dashboard-title').focus();
  notice('人生残高を保存しました。今日を、何に使おう。');
});
$('event-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget), name = String(data.get('name')).trim(), frequency = Number(data.get('frequency')), period = String(data.get('period'));
  if (!name || name.length > 50 || !Number.isFinite(frequency) || frequency <= 0 || frequency > 1000 || !['month', 'year'].includes(period)) { notice('体験の名前と、0より大きく1,000以下の回数を入力してください。'); return; }
  if (persist({ ...state, events: [...state.events, { id: crypto.randomUUID(), name, frequency, period }] })) { event.currentTarget.reset(); renderEvents(metrics().days); emit('life_event_added'); notice('楽しみにしたい体験を追加しました。'); }
});
$('log-form').addEventListener('submit', event => {
  event.preventDefault(); const text = String(new FormData(event.currentTarget).get('text')).trim();
  if (!text || text.length > 500) { notice('今日のひとコマを1〜500文字で入力してください。'); return; }
  if (persist({ ...state, logs: [...state.logs, { id: crypto.randomUUID(), date: new Date().toISOString(), text }] })) {
    event.currentTarget.reset(); renderLogs(); emit('life_log_added'); notice('思い出資産 +1。今日のひとコマを保存しました。');
    $('memory-count').classList.remove('memory-pop'); requestAnimationFrame(() => $('memory-count').classList.add('memory-pop'));
  }
});
$('more-logs').addEventListener('click', () => { logLimit += 10; renderLogs(); });
$('bucket-date').min = new Date().toISOString().slice(0, 10);
$('bucket-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget), title = String(data.get('title')).trim(), dueDate = String(data.get('dueDate'));
  if (!title || title.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(`${dueDate}T23:59:59`))) { notice('やりたいことと、正しい期限を入力してください。'); return; }
  if (persist({ ...state, bucketList: [...state.bucketList, { id: crypto.randomUUID(), title, dueDate, done: false, createdAt: new Date().toISOString() }] })) { event.currentTarget.reset(); $('bucket-date').min = new Date().toISOString().slice(0, 10); renderBucketList(); notice('バケットリストに追加しました。'); }
});
function navigate() {
  const target = location.hash.slice(1);
  if (target === 'settings') show('settings');
  else if (state.profile) { show('dashboard'); drawChart(); }
}
window.addEventListener('hashchange', navigate);
document.querySelectorAll('[data-nav], #back-home').forEach(link => link.addEventListener('click', () => {
  const target = link.getAttribute('href').slice(1); show(target === 'settings' ? 'settings' : state.profile ? 'dashboard' : 'welcome');
  if (state.profile && target !== 'settings') requestAnimationFrame(drawChart);
}));
$('reset').addEventListener('click', () => {
  if (!confirm('FIRE人生時計のプロフィール、独自イベント、人生ログをすべて削除します。この操作は元に戻せません。削除しますか？')) return;
  try { (storage || createStorage(window.localStorage)).reset(); storage = createStorage(window.localStorage); storageBroken = false; state = emptyState(); logLimit = 10; $('profile-form').reset(); $('event-form').reset(); $('bucket-form').reset(); $('share-fallback').value = ''; $('share-fallback').hidden = true; $('return-message').hidden = true; renderPeopleEditor(state.people); history.replaceState(null, '', location.pathname); show('welcome'); notice('保存データをすべて削除しました。'); window.scrollTo(0, 0); }
  catch { notice('削除できませんでした。ブラウザのサイトデータ設定から削除してください。', true); }
});
$('share').addEventListener('click', async () => {
  const text = `FIRE人生時計\n残りの夏：${calculateRemainingEvents(metrics().days, 1)}回\n次に迎える夏も、そのうちの1回。\n${location.origin}/life-clock/`;
  emit('share_clicked');
  try {
    if (navigator.share) await navigator.share({ title: 'FIRE人生時計', text });
    else { await navigator.clipboard.writeText(text); notice('共有用の文章をコピーしました。'); }
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('share-fallback').hidden = false; $('share-fallback').value = text; $('share-fallback').focus(); $('share-fallback').select(); notice('この文章をコピーして共有できます。');
  }
});
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installHelp() {
  return isIOS ? 'iPhone・iPadのSafariで「共有」→「ホーム画面に追加」を選んでください。' : 'ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。表示がない場合は対応ブラウザで開いてください。';
}
write('install-help', installHelp()); $('install-card').hidden = Boolean(standalone());
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; write('install', 'ホーム画面に追加 ＋'); });
window.addEventListener('appinstalled', () => { $('install-card').hidden = true; installPrompt = null; notice('ホーム画面に追加しました。次の思い出も、ここに。'); });
$('install').addEventListener('click', async () => {
  emit('pwa_install_clicked');
  if (!installPrompt) { notice(installHelp()); return; }
  try { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; write('install', '追加方法を見る ＋'); }
  catch { notice(installHelp()); }
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/life-clock/sw.js', { scope: '/life-clock/' }).catch(() => notice('オフライン用の準備ができませんでした。オンラインで再度開いてください。', true));
if (state.profile) {
  const daysAway = state.lastVisit ? elapsedDays(state.lastVisit) : 0;
  if (daysAway > 0) { write('return-message', `前回から${fmt(daysAway)}日。人生を${fmt(daysAway)}日使いました。この${fmt(daysAway)}日で、何か思い出は増えましたか？ 下の人生ログに残してみよう。`); $('return-message').hidden = false; emit('return_visit'); }
  persist({ ...state, lastVisit: new Date().toISOString() }); show('dashboard'); renderDashboard(); navigate();
} else show(storageBroken ? 'settings' : 'welcome');
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawChart, 150); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.profile) renderDashboard(); });
setInterval(() => { if (state.profile && document.visibilityState === 'visible') { renderLifeClock(); renderYearTime(); renderBucketList(); } }, 1000);
window.addEventListener('storage', event => {
  if (event.key !== 'wakuwaku.life-clock.v1') return;
  try { state = storage.load(); if (state.profile) { show('dashboard'); renderDashboard(); } else show('welcome'); notice('別のタブで変更されたデータを反映しました。'); }
  catch { notice('別のタブの変更を読み込めませんでした。再読み込みしてください。', true); }
});

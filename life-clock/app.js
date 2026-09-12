import { DAYS_PER_YEAR, DAY_MS, elapsedDays, validateProfile, calculateRemainingDays, calculateHealthyDays, calculateDailyLifeBudget, calculateProjection, calculateRemainingEvents } from './calculations.js';
import { createStorage, emptyState } from './storage.js';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const fmt = n => nf.format(n);
const write = (id, text) => { $(id).textContent = text; };
const defaults = [
  { name: '🌸 桜を見る', frequency: 1, period: 'year', unit: '回' },
  { name: '🌊 夏を迎える', frequency: 1, period: 'year', unit: '回' },
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
  show('setup'); $('setup-title').tabIndex = -1; $('setup-title').focus(); window.scrollTo(0, 0);
}
function metrics() {
  const p = state.profile, elapsed = elapsedDays(p.anchor);
  const days = calculateHealthyDays(p.age, p.healthspan, elapsed);
  return { p, elapsed, days, projection: calculateProjection(p, elapsed) };
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
  if (p.healthspan >= m.ageNow) svg.append(svgNode('line', { x1: x(p.healthspan), x2: x(p.healthspan), y1: top, y2: y(0), stroke: '#756413', 'stroke-dasharray': '5 4', 'stroke-width': 2 }));
  svg.append(svgNode('circle', { cx: left, cy: y(p.assets), r: 5, fill: '#242420' }));
  svg.append(svgNode('line', { x1: x(Math.max(m.ageNow, p.lifespan)), x2: x(Math.max(m.ageNow, p.lifespan)), y1: top, y2: y(0), stroke: '#55554c', 'stroke-dasharray': '2 4' }));
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
  const { p, days, projection: m } = metrics();
  write('today-date', new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }));
  renderLifeClock();
  write('daily-budget', days ? fmt(calculateDailyLifeBudget(p.assets, p.rate, days)) : '—');
  write('asset-lifetime', Number.isFinite(m.zeroAge) ? `${m.zeroAge.toFixed(1)}歳` : '尽きない計算');
  write('lifetime-message', !Number.isFinite(m.lifetime) ? 'この固定利回りでは運用益が生活費を補う計算です。将来の保証ではありません。' : Math.abs(m.zeroAge - p.lifespan) <= 2 ? '人生と資産のペースは、近い状態です。' : m.zeroAge > p.lifespan ? '平均寿命の目安より先まで、資産が持つ予測です。これから楽しみたいことも考えてみましょう。' : '平均寿命の目安より先に、資産が尽きる可能性があります。生活費や収入の計画を見直すきっかけに。');
  write('final-assets-title', `${p.lifespan}歳時点の推定資産`);
  write('final-assets', `${fmt(m.finalAssets / 10000)}万円`);
  write('final-assets-note', m.zeroAge < p.lifespan ? `${p.lifespan}歳までに資産が尽きる可能性があります。` : '残すお金と、今楽しむお金。そのバランスを考えよう。');
  write('chart-summary', `● 現在 ${Math.floor(m.ageNow)}歳 ／ 破線：健康寿命 ${p.healthspan}歳 ／ 点線：平均寿命の目安 ${p.lifespan}歳 ／ ■ 資産ゼロ：${Number.isFinite(m.zeroAge) ? `${m.zeroAge.toFixed(1)}歳${m.zeroAge > p.lifespan ? '（グラフ範囲外）' : ''}` : 'この条件では尽きない計算'}`);
  write('snapshot-note', `資産は${new Date(p.updatedAt || p.anchor).toLocaleDateString('ja-JP')}に入力した額を現在の残高として使用。実際の増減は自動反映されません。残り日数は日付とともに更新します。`);
  write('summer-count', fmt(calculateRemainingEvents(days, 1)));
  renderEvents(days); renderLogs(); requestAnimationFrame(drawChart);
}
$('start').addEventListener('click', () => { emit('life_clock_start'); openForm(); });
for (const id of ['edit-profile', 'settings-edit']) $(id).addEventListener('click', openForm);
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
  const now = new Date().toISOString();
  profile.anchor = state.profile?.age === profile.age ? state.profile.anchor : now;
  profile.updatedAt = now;
  if (!persist({ ...state, profile, lastVisit: now })) return;
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
  try { (storage || createStorage(window.localStorage)).reset(); storage = createStorage(window.localStorage); storageBroken = false; state = emptyState(); logLimit = 10; $('profile-form').reset(); $('event-form').reset(); $('log-form').reset(); $('share-fallback').value = ''; $('share-fallback').hidden = true; $('return-message').hidden = true; history.replaceState(null, '', location.pathname); show('welcome'); notice('保存データをすべて削除しました。'); window.scrollTo(0, 0); }
  catch { notice('削除できませんでした。ブラウザのサイトデータ設定から削除してください。', true); }
});
$('share').addEventListener('click', async () => {
  const text = `FIRE人生時計\n残りの夏：${calculateRemainingEvents(metrics().days, 1)}回\n次に迎える夏も、そのうちの1回。\nhttps://wakuwaku-fire-git.pages.dev/life-clock/`;
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
setInterval(() => { if (state.profile && document.visibilityState === 'visible') renderLifeClock(); }, 1000);
window.addEventListener('storage', event => {
  if (event.key !== 'wakuwaku.life-clock.v1') return;
  try { state = storage.load(); if (state.profile) { show('dashboard'); renderDashboard(); } else show('welcome'); notice('別のタブで変更されたデータを反映しました。'); }
  catch { notice('別のタブの変更を読み込めませんでした。再読み込みしてください。', true); }
});


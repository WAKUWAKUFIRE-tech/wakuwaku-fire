import { validateProfile } from './calculations.js';
export const STORAGE_KEY = 'wakuwaku.life-clock.v1';
export const emptyState = () => ({ version: 1, profile: null, events: [], logs: [], lastVisit: null, lifeMode: 'average' });
export function validateState(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.events) || !Array.isArray(data.logs)) throw new Error('保存データの形式を読み取れません。');
  if (data.lifeMode === undefined) data.lifeMode = 'average';
  if (!['average', 'health'].includes(data.lifeMode)) throw new Error('保存表示設定を読み取れません。');
  if (data.profile && (Object.keys(validateProfile(data.profile)).length || !Number.isFinite(Date.parse(data.profile.anchor)))) throw new Error('保存プロフィールを読み取れません。');
  if (data.events.some(e => typeof e.id !== 'string' || typeof e.name !== 'string' || e.name.length > 50 || !Number.isFinite(e.frequency) || e.frequency <= 0 || e.frequency > 1000 || !['month', 'year'].includes(e.period))) throw new Error('保存イベントを読み取れません。');
  if (data.logs.some(l => typeof l.id !== 'string' || typeof l.text !== 'string' || l.text.length > 500 || !Number.isFinite(Date.parse(l.date)))) throw new Error('保存ログを読み取れません。');
  return data;
}
// Replace this adapter for opt-in cloud sync; calculations and UI remain independent.
export function createStorage(storage) {
  return {
    load() { const raw = storage.getItem(STORAGE_KEY); return raw ? validateState(JSON.parse(raw)) : emptyState(); },
    save(state) { validateState(state); storage.setItem(STORAGE_KEY, JSON.stringify(state)); },
    reset() { storage.removeItem(STORAGE_KEY); },
  };
}


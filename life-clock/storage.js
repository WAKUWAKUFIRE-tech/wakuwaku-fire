import { validateProfile } from './calculations.js';
export const STORAGE_KEY = 'wakuwaku.life-clock.v1';
export const createDefaultPeople = (age = 36) => [
  { id: 'person-parent', name: '親', age: 65, frequency: 2, period: 'year' },
  { id: 'person-friend', name: '親友', age: age, frequency: 3, period: 'year' },
];
export const createDefaultTimeCategories = () => [
  { id: 'sleep', icon: '😴', name: '睡眠', hours: 8.5 },
  { id: 'work', icon: '💼', name: '仕事・学業', hours: 5 },
  { id: 'home', icon: '🏠', name: '家事・育児', hours: 1.5 },
  { id: 'commute', icon: '🚃', name: '通勤・移動', hours: 0.8 },
  { id: 'screen', icon: '📱', name: 'スマホ・テレビ', hours: 3 },
  { id: 'meal', icon: '🍚', name: '食事・身支度', hours: 2.5 },
];
export const emptyState = () => ({ version: 1, profile: null, events: [], logs: [], lastVisit: null, lifeMode: 'average', wakuwakuIntroSeen: false, people: createDefaultPeople(), timeCategories: createDefaultTimeCategories(), bucketList: [] });
export function validateState(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.events) || !Array.isArray(data.logs)) throw new Error('保存データの形式を読み取れません。');
  if (data.lifeMode === undefined) data.lifeMode = 'average';
  if (!['average', 'health'].includes(data.lifeMode)) throw new Error('保存表示設定を読み取れません。');
  if (data.wakuwakuIntroSeen === undefined) data.wakuwakuIntroSeen = false;
  if (typeof data.wakuwakuIntroSeen !== 'boolean') throw new Error('保存表示設定を読み取れません。');
  if (data.people === undefined) data.people = createDefaultPeople(data.profile?.age ?? 36);
  if (!Array.isArray(data.people) || data.people.some(person => typeof person.id !== 'string' || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 50 || !Number.isFinite(person.age) || person.age < 0 || person.age > 130 || !Number.isFinite(person.frequency) || person.frequency <= 0 || person.frequency > 1000 || !['month', 'year'].includes(person.period))) throw new Error('保存している大切な人の設定を読み取れません。');
  if (data.timeCategories === undefined) data.timeCategories = createDefaultTimeCategories();
  if (!Array.isArray(data.timeCategories) || data.timeCategories.some(category => typeof category.id !== 'string' || typeof category.name !== 'string' || !Number.isFinite(category.hours) || category.hours < 0 || category.hours > 24)) throw new Error('保存している時間の設定を読み取れません。');
  if (data.bucketList === undefined) data.bucketList = [];
  if (!Array.isArray(data.bucketList) || data.bucketList.some(item => typeof item.id !== 'string' || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120 || typeof item.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) || typeof item.done !== 'boolean')) throw new Error('保存しているバケットリストを読み取れません。');
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

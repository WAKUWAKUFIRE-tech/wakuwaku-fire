import { validateProfile } from './calculations.js';
export const STORAGE_KEY = 'wakuwaku.life-clock.v1';
export const createDefaultPeople = (age = 36) => [
  { id: 'person-mother', name: '母親', age: 65, lifespan: 87, frequency: 2, period: 'year' },
  { id: 'person-father', name: '父親', age: 65, lifespan: 81, frequency: 2, period: 'year' },
  { id: 'person-friend', name: '親友', age, lifespan: 88, frequency: 3, period: 'year' },
];
export const createDefaultTimeCategories = () => [
  { id: 'sleep', icon: '🛏️', name: '睡眠', hours: 8.5 },
  { id: 'work', icon: '👔', name: '望まぬ仕事', hours: 5 },
  { id: 'home', icon: '🏠', name: '家事・育児', hours: 1.5 },
  { id: 'commute', icon: '🚗', name: '移動', hours: 0.8 },
  { id: 'meal', icon: '🍴', name: '暮らしの時間', hours: 2.5 },
  { id: 'screen', icon: '📱', name: 'スマホ・動画', hours: 3 },
  { id: 'exercise', icon: '🏃', name: '運動・健康', hours: 0.5 },
];
export const emptyState = () => ({ version: 1, profile: null, events: [], eventFrequencyOverrides: {}, logs: [], lastVisit: null, lifeMode: 'average', wakuwakuIntroSeen: false, peopleDefaultsVersion: 3, people: createDefaultPeople(), timeCategories: createDefaultTimeCategories(), bucketList: [] });
export function validateState(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.events) || !Array.isArray(data.logs)) throw new Error('保存データの形式を読み取れません。');
  if (data.lifeMode === undefined) data.lifeMode = 'average';
  if (!['average', 'health'].includes(data.lifeMode)) throw new Error('保存表示設定を読み取れません。');
  if (data.wakuwakuIntroSeen === undefined) data.wakuwakuIntroSeen = false;
  if (typeof data.wakuwakuIntroSeen !== 'boolean') throw new Error('保存表示設定を読み取れません。');
  if (data.eventFrequencyOverrides === undefined) data.eventFrequencyOverrides = {};
  if (!data.eventFrequencyOverrides || typeof data.eventFrequencyOverrides !== 'object' || Array.isArray(data.eventFrequencyOverrides) || Object.values(data.eventFrequencyOverrides).some(value => !Number.isFinite(value) || value <= 0 || value > 1000)) throw new Error('保存している体験の回数設定を読み取れません。');
  if (data.peopleDefaultsVersion === undefined) data.peopleDefaultsVersion = 1;
  if (!Number.isInteger(data.peopleDefaultsVersion) || data.peopleDefaultsVersion < 1 || data.peopleDefaultsVersion > 3) throw new Error('保存している大切な人の設定バージョンを読み取れません。');
  if (data.people === undefined) data.people = createDefaultPeople(data.profile?.age ?? 36);
  if (!Array.isArray(data.people)) throw new Error('保存している大切な人の設定を読み取れません。');
  const legacyDefaultPeople = data.people.length === 2 && data.people.every(person => ['person-parent', 'person-friend'].includes(person.id) || ['親', '親友'].includes(person.name));
  if (legacyDefaultPeople) data.people = createDefaultPeople(data.profile?.age ?? 36);
  else if (data.peopleDefaultsVersion < 3 && !data.people.some(person => person.id === 'person-friend' || person.name === '親友')) data.people = [...data.people, createDefaultPeople(data.profile?.age ?? 36).find(person => person.id === 'person-friend')];
  data.peopleDefaultsVersion = 3;
  data.people = data.people.map(person => {
    const frequency = person.period === 'month' ? person.frequency * 12 : person.frequency;
    const fallbackLifespan = Number.isFinite(data.profile?.lifespan) ? data.profile.lifespan : Math.min(130, Math.max(person.age + 1, 88));
    return { ...person, frequency, period: 'year', lifespan: Number.isFinite(person.lifespan) ? person.lifespan : fallbackLifespan };
  });
  if (data.people.some(person => typeof person.id !== 'string' || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 50 || !Number.isFinite(person.age) || person.age < 0 || person.age > 130 || !Number.isFinite(person.lifespan) || person.lifespan <= person.age || person.lifespan > 130 || !Number.isFinite(person.frequency) || person.frequency <= 0 || person.frequency > 1000)) throw new Error('保存している大切な人の設定を読み取れません。');
  if (data.timeCategories === undefined) data.timeCategories = createDefaultTimeCategories();
  if (!Array.isArray(data.timeCategories)) throw new Error('保存している時間の設定を読み取れません。');
  const categoryDefaults = createDefaultTimeCategories(), savedCategories = new Map(data.timeCategories.map(category => [category.id, category]));
  data.timeCategories = categoryDefaults.map(category => ({ ...category, hours: Number.isFinite(savedCategories.get(category.id)?.hours) ? savedCategories.get(category.id).hours : category.hours }));
  if (data.timeCategories.some(category => !Number.isFinite(category.hours) || category.hours < 0 || category.hours > 24)) throw new Error('保存している時間の設定を読み取れません。');
  if (data.bucketList === undefined) data.bucketList = [];
  if (!Array.isArray(data.bucketList) || data.bucketList.some(item => typeof item.id !== 'string' || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120 || typeof item.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) || typeof item.done !== 'boolean')) throw new Error('保存しているバケットリストを読み取れません。');
  if (data.profile && (Object.keys(validateProfile(data.profile)).length || !Number.isFinite(Date.parse(data.profile.anchor)))) throw new Error('保存プロフィールを読み取れません。');
  data.events = data.events.map(event => ({ ...event, frequency: event.period === 'month' ? event.frequency * 12 : event.frequency, period: 'year' }));
  if (data.events.some(e => typeof e.id !== 'string' || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 50 || !Number.isFinite(e.frequency) || e.frequency <= 0 || e.frequency > 1000)) throw new Error('保存イベントを読み取れません。');
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

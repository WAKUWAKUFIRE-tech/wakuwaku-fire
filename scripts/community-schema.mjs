export const CATEGORIES = ['topics','calls','insights','chat','upcoming'];
export const sensitive = /https?:|www\.|@|<[^>]*>|\b\d{15,20}\b|\d[\d,.]*\s*(?:万|億|円|ドル|%|％)|(?:妻|夫|子供|子ども|息子|娘|勤務先|住所|病院|病気|診断|投資ポジション|保有銘柄|本名)|(?:現在|メンバー|参加者)\s*\d+\s*(?:人|名)|\d+\s*(?:人|名)(?:突破|参加|が活動)/iu;
function assert(ok,message){if(!ok) throw new Error(message);}
export function exactKeys(o, keys) {assert(o && typeof o==='object' && !Array.isArray(o),'Object required');assert(Object.keys(o).every(k=>keys.includes(k)), 'Unknown public field');}
function date(s){return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;}
export function validateWeek(w){
 exactKeys(w,['startDate','endDate','items']);assert(date(w.startDate)&&date(w.endDate),'Invalid week dates');assert(Date.parse(w.endDate)-Date.parse(w.startDate)===6*86400000,'Week must be seven days');
 assert(Array.isArray(w.items)&&w.items.length<=5,'Maximum five topics');
 for(const i of w.items){exactKeys(i,['title','body','category']);assert(CATEGORIES.includes(i.category),'Invalid category');assert(typeof i.title==='string'&&i.title.trim().length>=2&&i.title.length<=36,'Invalid title');assert(typeof i.body==='string'&&i.body.length<=180&&i.body.endsWith('。'),'Short punctuated body required');const sentences=i.body.split('。').filter(Boolean);assert(sentences.length>=1&&sentences.length<=3&&sentences.every(s=>s.length<=65),'One to three short sentences required');assert(!sensitive.test(i.title+i.body),'Possible personal information / unsupported public text');}
}
export function validatePublicData(data){
 exactKeys(data,['schemaVersion','updatedAt','weeks']);assert(data.schemaVersion===1,'Invalid schema');assert(data.updatedAt===null || typeof data.updatedAt==='string'&&!isNaN(Date.parse(data.updatedAt)),'Invalid update time');assert(Array.isArray(data.weeks),'weeks required');let previous='9999';const seen=new Set();for(const w of data.weeks){validateWeek(w);assert(!seen.has(w.endDate)&&w.endDate<previous,'Weeks must be unique, newest first');seen.add(w.endDate);previous=w.endDate;}return data;
}
export function safeUrl(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function validateSettings(voices,event){
 exactKeys(voices,['voices']);assert(Array.isArray(voices.voices),'voices required');for(const v of voices.voices){exactKeys(v,['label','body','published','consent']);assert(typeof v.label==='string'&&v.label.length<=40&&typeof v.body==='string'&&v.body.length<=300,'Invalid voice');assert(typeof v.published==='boolean'&&typeof v.consent==='boolean','Consent flags required');assert(!v.published || v.consent,'Cannot publish unconsented voice');assert(!/[<>]/.test(v.label+v.body),'Plain text only');}
 exactKeys(event,['enabled','title','startsAt','endsAt','description','participation','url','cta']);assert(typeof event.enabled==='boolean','Event enabled flag required');if(event.enabled){for(const k of ['title','description','participation','cta'])assert(typeof event[k]==='string'&&event[k].trim()&&event[k].length<=400,'Event text required');assert(safeUrl(event.url),'Event requires safe HTTPS URL');assert(/T.*(?:Z|\+09:00)$/.test(event.startsAt)&&/T.*(?:Z|\+09:00)$/.test(event.endsAt)&&new Date(event.endsAt)>new Date(event.startsAt),'Event requires valid timezone and end time');}return true;
}


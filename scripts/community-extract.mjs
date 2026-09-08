// Reuse the existing collector's date / topic logic; never connect to Discord here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export const archiveRoot=process.env.DISCORD_ARCHIVE_ROOT||path.join(os.homedir(),'Documents','ChatGPT','DISCORD');
export const privateRoot=process.env.COMMUNITY_PRIVATE_DIR||path.join(os.tmpdir(),'wakuwaku-community-weekly');
export const dbPath=path.join(archiveRoot,'data','discord_archive.db');
export function extract(now=new Date()) {
 const {getWeeklyPeriod,matchedTopics}=require(path.join(archiveRoot,'tools/discord-archive/src/weekly-report.js'));
 const {DEFAULT_GUILD_ID}=require(path.join(archiveRoot,'tools/discord-archive/src/config.js'));
 // Latest complete seven JST calendar days, using existing timezone implementation.
 const period=getWeeklyPeriod(new Date(now.getTime()-86400000));
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON');
  const sync=db.prepare('SELECT MAX(last_sync_at) AS syncedAt FROM sync_state WHERE server_id=? AND sync_status=?').get(DEFAULT_GUILD_ID,'completed');
  const latest=db.prepare('SELECT MAX(timestamp) AS latest FROM messages WHERE server_id=?').get(DEFAULT_GUILD_ID);
  const names=db.prepare('SELECT DISTINCT author_display_name AS name FROM messages WHERE server_id=? AND author_display_name IS NOT NULL').all(DEFAULT_GUILD_ID).map(x=>x.name).filter(s=>s.length>=2);
  const rows=db.prepare(`SELECT m.message_id,m.content,m.timestamp,c.channel_name FROM messages m JOIN channels c ON c.channel_id=m.channel_id WHERE m.server_id=? AND m.timestamp>=? AND m.timestamp<? AND m.referenced_message_id IS NULL AND m.thread_id IS NULL AND c.channel_type=0 ORDER BY m.timestamp DESC`).all(DEFAULT_GUILD_ID,period.startIso,period.endExclusiveIso);
  const candidates=[];
  for(const row of rows){
   if(/自己紹介|資産|ポートフォリオ|家族|健康|病|運営|管理|bot|厳選|過去|タイムカプセル|議事録|週報|読書|情報収集|ニュース/i.test(row.channel_name))continue;
   let text=row.content.normalize('NFKC').trim();
   // Exclude entire sensitive / directed conversations instead of masking only a number.
   if(text.length<20||text.length>1800||/<@|https?:|www\.|@|\d[\d,.]*\s*(?:万|億|円|ドル|%|％)|\d{7,}|妻|夫|子供|子ども|息子|娘|父|母|家族|会社名|勤務先|職場|同僚|勤務|病|症|医|資産|保有|購入|売却|ポジション|住所|住んで|さん|様|君|ちゃん|転載|引用|投稿|過去の|タイムカプセル|週報|本名|電話|メール|内緒|秘密に|公開しない|オフレコ|DM/i.test(text))continue;
   if(names.some(n=>text.includes(n)))continue;
   const hits=matchedTopics(text);if(!hits.length)continue;
   candidates.push({key:sha(row.message_id).slice(0,16),date:row.timestamp.slice(0,10),text,topics:hits.map(h=>h.definition?.key||h.key)});
  }
  const selected=candidates.slice(0,80);
  const result={schemaVersion:1,period,extractedAt:now.toISOString(),lastSyncedAt:sync?.syncedAt||null,latestMessageAt:latest.latest,candidates:selected};
  const serialized=JSON.stringify(result,null,2);fs.mkdirSync(privateRoot,{recursive:true});const output=path.join(privateRoot,`candidates-${period.endDate}.json`);fs.writeFileSync(output,serialized);
  return {output,digest:sha(serialized),period,candidateCount:selected.length,lastSyncedAt:result.lastSyncedAt,latestMessageAt:result.latestMessageAt};
 }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(extract(),null,2));

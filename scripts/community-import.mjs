import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {validatePublicData,validateWeek,exactKeys} from './community-schema.mjs';
import {build,ROOT} from './community-render.mjs';
import {dbPath,privateRoot} from './community-extract.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const compact=s=>s.normalize('NFKC').replace(/[\s。、！？!?,「」『』]/g,'');
export function validateDraft(draft,candidates,{names=[],rawTexts=[],now=new Date()}={}) {
 exactKeys(draft,['week','review','evidence']);validateWeek(draft.week);
 if(draft.week.startDate!==candidates.period.startDate||draft.week.endDate!==candidates.period.endDate)throw Error('Period differs from source');
 if(draft.review?.aiRewritten!==true || draft.review?.privacyReviewed!==true || draft.review?.noUnverifiedClaims!==true)throw Error('AI rewrite and privacy review required');
 if(!candidates.lastSyncedAt || now-new Date(candidates.lastSyncedAt)>24*3600000 || new Date(candidates.lastSyncedAt)<new Date(candidates.period.endExclusiveIso))throw Error('Source sync must cover the entire period and be fresh');
 if(new Date(candidates.extractedAt)>now || now-new Date(candidates.extractedAt)>24*3600000)throw Error('Candidate extraction expired');
 if(!Array.isArray(draft.evidence)||draft.evidence.length!==draft.week.items.length)throw Error('Every topic requires private evidence');
 const keys=new Set(candidates.candidates.map(c=>c.key));
 for(let i=0;i<draft.week.items.length;i++){
  if(!Array.isArray(draft.evidence[i])||!draft.evidence[i].length||draft.evidence[i].some(k=>!keys.has(k)))throw Error('Unknown or missing evidence');
  const item=draft.week.items[i],text=item.title+item.body,normal=compact(text);
  if(names.some(n=>n.length>=2&&text.includes(n)))throw Error('Possible source user name');
  for(const raw of rawTexts){const r=compact(raw);for(let j=0;j<=normal.length-16;j++)if(r.includes(normal.slice(j,j+16)))throw Error('Long verbatim overlap with private source');}
 }
 return draft.week;
}
export function importDraft(draftFile,candidateFile,{now=new Date()}={}) {
 const source=fs.readFileSync(candidateFile,'utf8');const candidates=JSON.parse(source);const draft=JSON.parse(fs.readFileSync(draftFile,'utf8'));
 if(draft.review?.sourceDigest!==sha(source))throw Error('Candidate digest mismatch');
 const db=new DatabaseSync(dbPath,{readOnly:true});let week;
 try{
  const names=db.prepare('SELECT DISTINCT author_display_name AS name FROM messages WHERE author_display_name IS NOT NULL').all().map(x=>x.name);
  const rawTexts=db.prepare('SELECT content FROM messages WHERE timestamp>=? AND timestamp<?').all(candidates.period.startIso,candidates.period.endExclusiveIso).map(x=>x.content);
  week=validateDraft(draft,candidates,{names,rawTexts,now});
 }finally{db.close();}
 const target=path.join(ROOT,'data/community-weekly.json');const old=JSON.parse(fs.readFileSync(target,'utf8'));validatePublicData(old);
 const existing=old.weeks.find(w=>w.endDate===week.endDate);
 if(existing){if(JSON.stringify(existing)===JSON.stringify(week)){console.log('Already published; unchanged.');return;}throw Error('Existing week differs; do not overwrite a published archive automatically');}
 const next={schemaVersion:1,updatedAt:now.toISOString(),weeks:[week,...old.weeks].sort((a,b)=>b.endDate.localeCompare(a.endDate))};validatePublicData(next);
 // Only the three-field public week goes into the site; evidence and all raw text stay in TEMP.
 fs.mkdirSync(privateRoot,{recursive:true});fs.writeFileSync(path.join(privateRoot,`review-${week.endDate}.json`),JSON.stringify(draft,null,2));
 const temp=`${target}.tmp`;fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n');fs.renameSync(temp,target);
 build();console.log(`Published JSON for ${week.startDate} to ${week.endDate}; ${week.items.length} topics.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2]||!process.argv[3])throw Error('Usage: node scripts/community-import.mjs PRIVATE_DRAFT PRIVATE_CANDIDATES');
 importDraft(process.argv[2],process.argv[3]);
}

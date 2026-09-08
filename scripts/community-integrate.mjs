import fs from 'node:fs';
import path from 'node:path';
import {ROOT,escape} from './community-render.mjs';
const targets = {
 'articles/fire-hima/index.html':'FIRE後の暇について、リアルに話している場所があります。',
 'articles/fire-after-boredom/index.html':'自由な時間をどう楽しむか、仲間と話してみませんか。',
 'articles/side-fire-toha/index.html':'サイドFIREを考えている人同士で話してみる。',
 'articles/sidefire-6000/index.html':'サイドFIREを考えている人同士で話してみる。',
 'articles/life-after-fire/index.html':'会社を辞めた後のリアルな生活を聞いてみる。',
 'articles/fire-community/index.html':'FIREのその先を、気軽に話せる秘密基地へ。',
 'articles/fire-community-place/index.html':'同じような価値観の仲間と話してみる。',
 'fire-strengths/index.html':'同じような価値観のFIRE民と話してみる。'
};
for(const [file,text] of Object.entries(targets)){
 const p=path.join(ROOT,file);if(!fs.existsSync(p))continue;let s=fs.readFileSync(p,'utf8');
 const snippet=`<aside class="community-context" data-community-context><a href="/community/" data-analytics-event="community_context_click" data-analytics-category="community" data-analytics-label="${escape(file)}">${text} →</a></aside>`;
 if(s.includes('data-community-context'))continue;
 // Replace existing advertising cards on relevant articles; never add another big ad.
 const card=/<a class="link-card" href="https:\/\/community\.camp-fire\.jp\/projects\/view\/778625"[^>]*>[\s\S]*?<\/a>/g;
 if(card.test(s)){s=s.replace(card,'');s=s.replace('</article>',`${snippet}\n</article>`);}else if(file.startsWith('fire-strengths/'))s=s.replace('<section class="fs-result-footer-actions">',`${snippet}\n<section class="fs-result-footer-actions">`);else s=s.replace('</main>',`${snippet}\n</main>`);
 if(!s.includes('/community/community.css'))s=s.replace('</head>','<link rel="stylesheet" href="/community/community.css">\n</head>');
 fs.writeFileSync(p,s);
}
// Existing gtag/dataLayer integration, with one event dispatch, and community category support.
const sp=path.join(ROOT,'script.js');let script=fs.readFileSync(sp,'utf8');
script=script.replaceAll('event_category: "business"','event_category: document.body?.dataset.analyticsCategory || "business"');
script=script.replace(/\}\s*\n\s*if \(Array\.isArray\(window\.dataLayer\)\) \{\s*\n\s*window\.dataLayer\.push\(\{ event: (pageEvent|eventName)/g,'} else if (Array.isArray(window.dataLayer)) {\n    window.dataLayer.push({ event: $1');
script=script.replaceAll('event_category: document.body?.dataset.analyticsCategory || "business", event_label: eventLabel','event_category: link.dataset.analyticsCategory || document.body?.dataset.analyticsCategory || "business", event_label: eventLabel');
fs.writeFileSync(sp,script);
const pkgFile=path.join(ROOT,'package.json');const pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8'));Object.assign(pkg.scripts,{'community:build':'node scripts/community-render.mjs','community:extract':'node scripts/community-extract.mjs','community:import':'node scripts/community-import.mjs','test:community':'node --test tests/community.test.mjs'});fs.writeFileSync(pkgFile,JSON.stringify(pkg,null,2)+'\n');


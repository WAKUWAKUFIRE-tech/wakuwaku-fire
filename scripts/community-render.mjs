import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicData, validateSettings } from './community-schema.mjs';
import { currentReport, readPublicReports, reportMarkdownToHtml, reportSummary } from './community-report.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://wakuwaku-fire-git.pages.dev';
const CAMPFIRE = 'https://community.camp-fire.jp/projects/view/778625';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = name => JSON.parse(fs.readFileSync(path.join(ROOT,'data',name),'utf8'));
const link = (url, text, event, label = '') => `<a class="community-text-link" href="${escape(url)}" data-analytics-event="${event}" data-analytics-label="${escape(label)}" data-analytics-category="community">${escape(text)}</a>`;
const category = {topics:'今週の話題',calls:'通話イベント',insights:'メンバーの気づき',chat:'雑談',upcoming:'次回予定'};
const period = w => `${w.startDate.replaceAll('-','/')} 〜 ${w.endDate.replaceAll('-','/')}`;
export function recentWeek(data, now = new Date()) {
  return data.weeks.find(w => new Date(`${w.endDate}T23:59:59+09:00`) >= new Date(now.getTime()-7*86400000) && new Date(`${w.startDate}T00:00:00+09:00`) <= now);
}
function page(title, description, route, body, analytics) {
  const url = `${SITE}${route}`;
  const structured = {'@context':'https://schema.org','@type':'WebPage',name:title,description,url,inLanguage:'ja',isPartOf:{'@type':'WebSite',name:'ワクワクFIRE',url:`${SITE}/`}};
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<meta name="description" content="${escape(description)}"><meta name="theme-color" content="#bb3426"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="ワクワクFIRE"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/community/basecamp.webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${SITE}/community/basecamp.webp">
<link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/community/community.css"><script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script><script src="/script.js" defer></script><script src="/community/community.js" defer></script></head>
<body class="community-page" data-analytics-page="${analytics}" data-analytics-category="community"><a class="skip-link" href="#main-content">本文へ移動</a>
<header class="community-header"><div class="community-shell"><a class="brand" href="/" title="ワクワクFIRE トップへ"><span class="brand__mark" aria-hidden="true">W</span><span class="brand__text">ワクワク<span>FIRE</span></span></a><a class="back-home" href="/">ホームへ戻る</a></div></header>
<main id="main-content">${body}</main><footer class="community-footer"><div class="community-shell"><p>ワクワクFIRE · 自由な人生を、もっと面白く。</p><p><a href="/about/">運営者</a>　<a href="/privacy/">プライバシー</a>　<a href="/contact/">お問い合わせ</a></p></div></footer></body></html>\n`;
}
const faq = [
 ['FIREしていなくても参加できますか？','もちろんです。FIREを目指している途中の方も、サイドFIREに興味がある方も参加できます。'],
 ['投資初心者でも大丈夫ですか？','大丈夫です。今の資産額や投資経験は問いません。自分のペースでお金との付き合い方を考えていきましょう。'],
 ['ROM専でも大丈夫ですか？','読むだけ・聞くだけの参加も基本的にOKです。慣れてきたら、できる範囲でひと言やリアクションから参加してみてください。'],
 ['人見知りでも大丈夫ですか？','チャット中心でも参加できます。通話の顔出しや無理な発言は求めません。'],
 ['どんなアプリを使いますか？','Discordのチャットと通話を使います。CAMPFIREで参加後、案内メールからDiscordへの参加手順を確認できます。'],
 ['営業や勧誘はありますか？','コミュニティ内での営業・勧誘は禁止です。お互いの価値観を尊重し、安心して話せる場所を大切にしています。'],
 ['退会できますか？','CAMPFIREのルールに沿って、ご自身でいつでも退会手続きができます。請求・更新・返金の条件は、参加前にCAMPFIREの最新の案内をご確認ください。'],
 ['どんな話をしていますか？','FIRE、投資、働き方から、趣味、旅行、人生の楽しみ方まで。FIREに関係のない日々の雑談も歓迎です。']
];
const audience = [['🧭','FIREを目指している','同じ目標を持つ人と、リアルな話をしたい。'],['☕','FIREしたけど少し暇','自由になった後の生活も、一緒に楽しみたい。'],['🌱','投資の話を気軽にしたい','普段の友人には話しづらいお金の話もしたい。'],['🤝','同じ価値観の仲間が欲しい','会社・年齢・肩書とは違うつながりを作りたい。'],['🎒','人生をもっと楽しみたい','お金だけでなく、趣味・旅行・挑戦も共有したい。']];
const rooms = [['💬','雑談','FIREに関係ない話も、普通にOK。何気ない日常から会話が始まります。'],['🌱','投資・お金','投資や資産形成を気軽に話せる場所。考え方や経験を持ち寄ります。'],['☕','FIRE生活','仕事を辞めた後のリアルな生活。暇や時間の使い方も、一緒に考えます。'],['🎲','趣味・遊び','自由な時間をどう楽しむか。ゲーム、旅行、読書などの好きなことも。'],['🎙️','通話イベント','週1回ペースでオンラインの通話会。最初は聞くだけでも大丈夫です。'],['🪑','オフ会','画面の向こうから、実際に会える仲間へ。集まって話す時間も大切に。']];
const cards = items => `<div class="community-grid">${items.map(([icon,title,body])=>`<article class="community-card"><span class="community-card-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${body}</p></article>`).join('')}</div>`;
export function weeklyPanel(data, {compact=false, now=new Date(), report=null}={}) {
 const current=currentReport(report?[report]:[],now);
 if(current){
  const summary=reportSummary(current.markdown);
  const content=`<p class="community-note">${period(current)}</p>${summary.length?`<ul>${summary.slice(0,compact?3:5).map(item=>`<li>${escape(item)}</li>`).join('')}</ul>`:'<p>今週のお便りは準備中です。</p>'}`;
  return `<div data-weekly-current data-weekly-report data-week-ends="${current.endDate}T23:59:59+09:00">${content}</div>`;
 }
 const w=recentWeek(data,now);
 const content=w ? `<p class="community-note">${period(w)}</p><ul>${w.items.slice(0,compact?3:5).map(i=>compact?`<li>${escape(i.title)}</li>`:`<li><h3>${escape(i.title)}</h3><p>${escape(i.body)}</p></li>`).join('')}</ul>` : '<p>今週のお便りは準備中です。</p>';
 return `<div data-weekly-current${w?` data-week-ends="${w.endDate}T23:59:59+09:00"`:''}>${content}</div>`;
}
function reportArticle(report) {
 return `<article id="week-${report.endDate}" class="community-report"><div class="community-report-body">${reportMarkdownToHtml(report.markdown)}</div></article>`;
}
function archiveMarkup(reports,weeks) {
 if(reports.length){
  return `<nav class="community-archive-links" aria-label="週ごとのお便り">${reports.map(report=>`<a class="community-text-link" href="#week-${report.endDate}">${period(report)}</a>`).join('')}</nav>${reports.map(reportArticle).join('')}`;
 }
 return weeks.length?`<nav class="community-archive-links" aria-label="週ごとのお便り">${weeks.map(w=>`<a class="community-text-link" href="#week-${w.endDate}">${period(w)}</a>`).join('')}</nav>${weeks.map(w=>`<article id="week-${w.endDate}"><h2>${period(w)}</h2>${w.items.length?w.items.map(i=>`<section class="community-topic"><span class="community-label">${category[i.category]}</span><h3>${escape(i.title)}</h3><p>${escape(i.body)}</p></section>`).join(''):'<p>この期間に公開できる話題はありませんでした。</p>'}</article>`).join('')}`:'<div class="community-weekly-panel"><p>最初のお便りは準備中です。</p><p>コミュニティの過ごし方は、下の紹介ページからご覧いただけます。</p></div>';
}
export function renderCommunity({data,voices,event,now=new Date()}={}) {
 const useReportArchive=data===undefined&&voices===undefined&&event===undefined;
 data=data??read('community-weekly.json'); voices=voices??read('community-voices.json'); event=event??read('community-open-day.json');
 const reports=useReportArchive?readPublicReports():[];
 const latestReport=currentReport(reports,now);
 validatePublicData(data); validateSettings(voices,event);
 const eventActive=event.enabled && new Date(event.endsAt)>now;
 const body=`<div class="community-shell"><section class="community-hero"><div><p class="community-eyebrow">WAKUWAKU FIRE COMMUNITY</p><h1>FIREはゴールじゃない。<br><span>自由になった人生を、<br>もっと面白く。</span></h1><p class="community-lead">FIREを目指す人も、FIREした人も。<br>お金・働き方・遊び・人生について<br>気軽に話せる、大人の秘密基地。</p><a class="community-button" href="#inside">秘密基地をのぞいてみる ↓</a><p class="community-note">チャットでも、通話を聞くだけでも。自分のペースで。</p></div><figure class="community-art"><img src="/community/basecamp.webp" alt="焚き火を囲み、くつろぎながら語り合う仲間たちのイラスト" width="720" height="720" fetchpriority="high"><figcaption>お金の話から、明日の遊びの話まで。</figcaption></figure></section><div class="community-strip"><span>✦ FIRE前も、FIRE後も</span><span>✦ 顔出しなしでもOK</span><span>✦ 営業・勧誘なし</span></div></div>
<section class="community-section" id="inside"><div class="community-shell"><p class="community-eyebrow">FIND YOUR PLACE</p><h2>こんな気持ち、ありませんか？</h2><p class="community-section-intro">身近な人には少し話しにくいことも、ここでは気軽に。今いる場所や肩書を離れて、自分のこれからを話せる場所です。</p>${cards(audience)}</div></section>
<section class="community-section community-section--warm"><div class="community-shell"><p class="community-eyebrow">A LETTER FROM THE BASECAMP</p><h2>今週のワクワクFIREコミュニティ</h2><p class="community-section-intro">今週、ワクワクFIREコミュニティではこんな話がありました。</p><div class="community-weekly-panel">${weeklyPanel(data,{now,report:latestReport})}${link('/community/weekly/','今週のワクワクFIREコミュニティをもっと見る →','community_to_weekly_click','lp')}</div></div></section>
<section class="community-section community-section--promo"><div class="community-shell community-promo" aria-labelledby="community-promo-title"><div class="community-promo__visual"><img src="/FIREコミュニティ.png" alt="ワクワクFIREコミュニティで仲間と語り合うイメージ" width="1024" height="1024" loading="lazy"></div><div class="community-promo__body"><p class="community-eyebrow">WAKUWAKU FIRE COMMUNITY</p><h2 id="community-promo-title">お金も自由もワクワクも、全部話せる。</h2><p>資産形成の相談から、FIRE後の毎日や趣味の話まで。気軽に話せる仲間が集まっています。</p><a class="community-button" href="${CAMPFIRE}" data-analytics-event="community_campfire_click" data-analytics-label="lp_image_promo" data-analytics-category="community">コミュニティに参加する ↗</a></div></div></section>
<section class="community-section"><div class="community-shell"><p class="community-eyebrow">LIFE INSIDE</p><h2>まじめな話も。<br>どうでもいい話も。</h2><p class="community-section-intro">FIREは、人生の選択肢を増やすきっかけ。その先で何を楽しむかも、同じくらい大事にしています。</p>${cards(rooms)}</div></section>
<section class="community-section"><div class="community-shell community-host"><img src="/community/maru.webp" alt="主催者・ワクワクFIREのまるのイラスト" width="240" height="285" loading="lazy"><div><p class="community-eyebrow">YOUR HOST</p><h2>主催：ワクワクFIREのまる</h2><p>30歳でFIRE。自由な時間を持て余したり、投資で失敗したり。会社を辞めたら、悩みが全部なくなったわけではありませんでした。</p><p>だからこそ、うまくいった話だけでなく、迷いや失敗も含めて話せる場所を作っています。</p><p class="community-quote">FIREそのものよりも、<br>その後の人生をどう楽しむか。</p><a class="community-text-link" href="/about/">まるについて →</a>　<a class="community-text-link" href="https://www.youtube.com/@MARU.SIDEFIRE">YouTubeを見る ↗</a></div></div></section>
${voices.voices.filter(v=>v.published && v.consent).length?`<section class="community-section"><div class="community-shell"><h2>メンバーの声</h2><div class="community-grid">${voices.voices.filter(v=>v.published&&v.consent).map(v=>`<figure class="community-card"><blockquote><p>${escape(v.body)}</p></blockquote><figcaption>${escape(v.label)}</figcaption></figure>`).join('')}</div></div></section>`:''}
<section class="community-section"><div class="community-shell"><div class="community-open-day"><div><p class="community-eyebrow">OPEN BASECAMP DAY</p><h2>まずは、一度話してみる。</h2><p>コミュニティの外からも参加できる、無料の「秘密基地開放DAY」を企画しています。</p></div><div data-open-day ${eventActive?`data-event-ends="${escape(event.endsAt)}"`:''}>${eventActive?`<h3>${escape(event.title)}</h3><dl><dt>日時</dt><dd>${escape(new Date(event.startsAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}))}（日本時間）</dd><dt>内容</dt><dd>${escape(event.description)}</dd><dt>参加方法</dt><dd>${escape(event.participation)}</dd></dl><a class="community-button community-button--light" href="${escape(event.url)}" data-analytics-event="community_open_day_click" data-analytics-category="community">${escape(event.cta)}</a>`:'<p><strong>次回の秘密基地開放DAYは準備中です。</strong></p><p class="community-note">開催日が決まったら、このページでお知らせします。</p>'}</div></div></div></section>
<section class="community-section"><div class="community-shell community-faq"><p class="community-eyebrow">BEFORE YOU JOIN</p><h2>気になること、あれこれ。</h2>${faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>
<div class="community-shell"><section class="community-invite"><p class="community-eyebrow" style="color:#ffe19c">SEE YOU AT THE BASECAMP</p><h2>人生の自由について話せる仲間を。</h2><p>FIREを目指す途中でも、FIREした後でも。<br>お金のことも、遊びのことも、<br>これからどう生きたいかも。<br>同じようなことを考えている人と話せる場所です。</p><a class="community-button" href="${CAMPFIRE}" data-analytics-event="community_campfire_click" data-analytics-label="lp_final" data-analytics-category="community">ワクワクFIREコミュニティに参加する ↗</a><p class="community-note">CAMPFIREで料金・プラン・参加条件を確認できます。<br>お申し込み後、案内メールからDiscordへ。</p></section></div>`;
 const lp=page('FIREコミュニティ｜自由な人生を楽しむ大人の秘密基地｜ワクワクFIRE','FIREを目指す人も、FIREした人も。投資・働き方・趣味・FIRE後の生活を気軽に話せる大人の秘密基地。今週の話題や通話・オフ会の雰囲気をご紹介。','/community/',body,'community');
 const weeks=data.weeks;
 const weekly=page('今週のワクワクFIREコミュニティ｜ワクワクFIRE週報','ワクワクFIREコミュニティで作成した週報を、Discord投稿へのリンクなしでそのままお届けします。FIRE後の暮らしや雑談を週ごとに紹介。','/community/weekly/',`<div class="community-shell"><header class="community-week-head"><p class="community-eyebrow">BASECAMP LETTERS</p><h1>今週のワクワクFIREコミュニティ</h1><p class="community-lead">ワクワクFIREコミュニティから、ちょっとお便り。<br>どんなことを話しているのか、のぞいてみてください。</p></header><section class="community-weekly-host" aria-labelledby="community-weekly-host-title"><img src="/community/fire-bot.png" alt="ワクワクFIRE BOTと仲間のイラスト" width="720" height="720" loading="lazy"><div><p class="community-eyebrow">WAKUWAKU FIRE BOT LETTERS</p><h2 id="community-weekly-host-title">僕たちFIRE BOTコンビがお送りするよ！</h2><p>今週のワクワクFIREコミュニティで生まれた話題を、毎週ぎゅっとまとめてお届けします。</p></div></section><div class="community-week-archive">${archiveMarkup(reports,weeks)}</div><section class="community-invite"><h2>この空気、ちょっといいかも。</h2><p>FIREのことも、その先の人生のことも。<br>どんな場所なのか、もう少し見てみませんか。</p><a class="community-button" href="/community/" data-analytics-event="community_weekly_to_lp_click" data-analytics-category="community">コミュニティを見てみる →</a></section></div>`,'community_weekly');
 return {lp,weekly,teaser:`<!-- community-teaser:start --><a class="community-teaser" href="/community/weekly/" aria-labelledby="community-teaser-title" data-analytics-event="community_home_to_weekly_click" data-analytics-label="homepage" data-analytics-category="community"><div><h2 id="community-teaser-title">🔥 今週のワクワクFIREコミュニティ</h2><p>ワクワクFIREコミュニティから、ちょっとお便り。</p><span class="community-text-link">今週のワクワクFIREコミュニティを見る →</span></div>${weeklyPanel(data,{compact:true,now,report:latestReport})}</a><!-- community-teaser:end -->`};
}
export function build() {
 const {lp,weekly,teaser}=renderCommunity();
 fs.mkdirSync(path.join(ROOT,'community/weekly'),{recursive:true});
 fs.writeFileSync(path.join(ROOT,'community/index.html'),lp);fs.writeFileSync(path.join(ROOT,'community/weekly/index.html'),weekly);
 const homeFile=path.join(ROOT,'index.html');let home=fs.readFileSync(homeFile,'utf8');
 if(home.includes('<!-- community-teaser:start -->')) home=home.replace(/<!-- community-teaser:start -->[\s\S]*?<!-- community-teaser:end -->/,teaser);
 else home=home.replace(/(?=\s*<section class="section column-preview")/,`\n${teaser}\n`);
 if(!home.includes('/community/community.css')) home=home.replace('</head>','<link rel="stylesheet" href="/community/community.css"><script src="/community/community.js" defer></script>\n</head>');
 home=home.replace(/(<a[^>]*data-category="community"[^>]*href=")[^"]+("[^>]*>)/g,(_,a,b)=>`${a}/community/${b.replace(/ target="_blank"| rel="noopener noreferrer"/g,'')}`);
 home=home.replace(/(<a[^>]*data-category="community"[^>]*href="\/community\/"[^>]*)>/g,(_,attrs)=>attrs.includes('data-analytics-event=')?`${attrs}>`:`${attrs} data-analytics-event="community_home_to_lp_click" data-analytics-label="homepage-card" data-analytics-category="community">`);
 fs.writeFileSync(homeFile,home);
 const sitemap=path.join(ROOT,'sitemap.xml');let xml=fs.readFileSync(sitemap,'utf8');for(const route of ['/community/','/community/weekly/'])if(!xml.includes(`${SITE}${route}</loc>`))xml=xml.replace('</urlset>',`  <url><loc>${SITE}${route}</loc><changefreq>weekly</changefreq></url>\n</urlset>`);fs.writeFileSync(sitemap,xml);
 console.log('Community pages and homepage teaser generated.');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) build();


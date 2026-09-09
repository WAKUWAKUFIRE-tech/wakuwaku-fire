import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryForArticle } from './article_categories.mjs';
import { generateSitemap } from './generate_sitemap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, key) => decode(html.match(new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`))?.[1] || '');
export function isPublished(date, now = new Date()) { return Number.isFinite(Date.parse(date)) && Date.parse(date) <= now.getTime(); }
export function relatedArticles(current, articles) {
  const side = a => /サイドFIRE|side-?fire/i.test(a.title + a.slug);
  return articles.filter(a => a.slug !== current.slug)
    .map(a => ({ a, score: (a.category === current.category ? 4 : 0) + (side(a) && side(current) ? 10 : 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score || Date.parse(b.a.date) - Date.parse(a.a.date))
    .slice(0, 3).map(x => x.a);
}
export function renderFeed(articles, site, now = new Date()) {
  const items = articles.filter(a => isPublished(a.date, now)).sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>ワクワクFIRE</title><link>${escape(site)}/</link><description>FIREするまでと、FIREした後の人生を楽しむ読み物</description><language>ja</language><atom:link href="${escape(site)}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(a => `<item><title>${escape(a.title)}</title><link>${escape(a.url)}</link><guid isPermaLink="true">${escape(a.url)}</guid><pubDate>${new Date(a.date).toUTCString()}</pubDate><description>${escape(a.description)}</description><category>${escape(a.category)}</category><media:thumbnail url="${escape(a.image)}"/><media:content url="${escape(a.image)}" medium="image"/></item>`).join('\n')}
</channel></rss>\n`;
}
function growthBlock(a) {
  return `<!-- EXTERNAL-GROWTH:START -->
<section class="article-growth" aria-label="共有とサイト案内">
  <aside class="growth-support" data-ranking-support hidden aria-label="ランキング応援"></aside>
  <nav class="growth-share" aria-label="この記事を共有">
    <a class="growth-button" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&amp;url=${encodeURIComponent(a.url)}" target="_blank" rel="noopener noreferrer">Xで共有</a>
    <a class="growth-button" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(a.url)}" target="_blank" rel="noopener noreferrer">LINEで共有</a>
    <button class="growth-button" type="button" data-copy-article>リンクコピー</button>
  </nav>
  <p class="growth-status" data-copy-status role="status" aria-live="polite"></p><input class="growth-copy" data-copy-fallback hidden readonly aria-label="共有する記事URL" />
  <aside class="growth-intro"><a href="/#about"><strong>ワクワクFIREとは？</strong></a><p>FIREするまでだけでなく、FIREした後の人生まで楽しむための診断・シミュレーター・ゲーム・読み物を集めたサイト。</p><a href="/#contents">自分に合う診断・ツールを探す →</a> · <a href="/feed.xml">RSSで新着記事を読む</a></aside>
</section>
<!-- EXTERNAL-GROWTH:END -->`;
}
function renderRelated(a, articles) {
  const related = relatedArticles(a, articles);
  if (!related.length) return '';
  return `<section class="related-articles" aria-labelledby="related-title"><div class="section-heading"><p class="eyebrow eyebrow--yellow">READ NEXT</p><h2 id="related-title">次に読む</h2></div><div class="article-preview-grid article-preview-grid--compact">${related.map(b => `<a class="article-preview-card" href="${escape(b.url)}"><div class="article-preview-card__media"><img src="${escape(b.image)}" alt="" width="1280" height="1280" loading="lazy" decoding="async" /></div><div class="article-preview-card__body"><p class="article-preview-card__category">${escape(b.category)}</p><h3>${escape(b.title)}</h3><p>${escape(b.description)}</p><span class="article-preview-card__more">続きを読む ↗</span></div></a>`).join('')}</div></section>`;
}
export async function buildExternalGrowth({root = ROOT, now = new Date()} = {}) {
  const config = JSON.parse(await fs.readFile(path.join(root, 'automation/config.json'), 'utf8'));
  const site = (process.env.SITE_URL || config.site_url).replace(/\/$/, '');
  const read = f => fs.readFile(path.join(root,f), 'utf8');
  const write = (f,v) => fs.writeFile(path.join(root,f),v,'utf8');
  const articles = [];
  for (const dir of await fs.readdir(path.join(root,'articles'), {withFileTypes:true})) {
    if (!dir.isDirectory()) continue;
    const file = `articles/${dir.name}/index.html`;
    const html = await read(file);
    const date = meta(html, 'article:published_time');
    if (!isPublished(date,now) || /noindex/i.test(meta(html,'robots'))) continue;
    const title = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '').replace(/<[^>]*>/g,''));
    const image = meta(html,'og:image');
    if (!title || !image) throw new Error(`記事メタデータ不足: ${file}`);
    articles.push({slug:dir.name,file,html,title,date,image:new URL(image,site).href,url:`${site}/articles/${dir.name}/`,description:meta(html,'description'),category:categoryForArticle({category:meta(html,'article:section'),article_title_plan:title,main_keyword:title},{}).name});
  }
  for (const a of articles) {
    let html = a.html.replace(/\s*<!-- EXTERNAL-GROWTH:START -->[\s\S]*?<!-- EXTERNAL-GROWTH:END -->/g,'');
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escape(a.url)}" />`);
    const fields = {'og:title':a.title,'og:description':a.description,'og:image':a.image,'og:url':a.url,'og:type':'article','og:site_name':'ワクワクFIRE','twitter:card':'summary_large_image','twitter:title':a.title,'twitter:description':a.description,'twitter:image':a.image};
    for (const [key,value] of Object.entries(fields)) {
      const tag = `<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${escape(value)}" />`;
      const pattern = new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="[^"]*"\\s*/?>`);
      html = pattern.test(html) ? html.replace(pattern,tag) : html.replace('</head>',`${tag}\n</head>`);
    }
    html = html.replace('</article>',`</article>\n${growthBlock(a)}`);
    html = html.replace(/<section class="related-articles"[\s\S]*?<\/section>/,renderRelated(a,articles));
    if (!html.includes('src="/external-growth.js"')) html = html.replace('</body>','<script type="module" src="/external-growth.js"></script>\n</body>');
    if (!html.includes('href="/external-growth.css"')) html = html.replace('</head>','<link rel="stylesheet" href="/external-growth.css" />\n</head>');
    await write(a.file,html);
  }
  await write('feed.xml',renderFeed(articles,site,now));
  // Explicit public roots prevent build copies, administration and tests from leaking into discovery.
  const publicRoots = ['about','articles','business','community','contact','privacy','diagnoses','fire-calendar','fire-animal-test','fire-migration-japan','fire-migration-world','fire-strengths','fire-world-tour','fire-cards','otoku','my-fire-life','fire-level-rewards'];
  const files = ['index.html'];
  async function walk(dir) {
    for (const e of await fs.readdir(path.join(root,dir),{withFileTypes:true}).catch(()=>[])) {
      const file = `${dir}/${e.name}`;
      if (e.isDirectory()) await walk(file); else if (e.name.endsWith('.html')) files.push(file);
    }
  }
  for (const dir of publicRoots) await walk(dir);
  const urls = new Set();
  for (const file of files) {
    let html = await read(file);
    if (!html.includes('application/rss+xml')) {
      html = html.replace('</head>','<link rel="alternate" type="application/rss+xml" title="ワクワクFIRE" href="/feed.xml" />\n</head>');
      await write(file,html);
    }
    if (/noindex/i.test(meta(html,'robots')) || /(?:^|\/)(?:404|admin|test|preview)[/.]/i.test(file)) continue;
    if (file.startsWith('articles/') && file !== 'articles/index.html' && !articles.some(a=>a.file===file)) continue;
    const canonical = decode(html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] || '');
    const expected = new URL('/'+file.replace(/index\.html$/,''),site).href;
    if (canonical === expected) urls.add(canonical);
  }
  const sitemap = await generateSitemap({root,siteUrl:site,publishedArticles:articles.map(a=>({...a,canonical:a.url,publishedIso:a.date}))});
  return {articles:articles.length,sitemap:sitemap.count};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(await buildExternalGrowth());

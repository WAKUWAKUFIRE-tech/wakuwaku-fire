import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { isPublished, renderFeed, relatedArticles } from '../scripts/external_growth.mjs';
import { activeRankings } from '../config/external-ranking.js';
test('RSSは未来・不正日付を除外し、日本時間の公開境界とXMLを扱う',()=>{
  const now = new Date('2026-09-09T00:00:00Z');
  assert.equal(isPublished('2026-09-09T09:00:00+09:00',now),true);
  assert.equal(isPublished('2026-09-09T09:00:01+09:00',now),false);
  assert.equal(isPublished('invalid',now),false);
  const a = {title:'A & <B>',url:'https://example.com/a/',description:'概要',image:'https://example.com/a.png',category:'生活',date:'2026-09-08T00:00:00Z'};
  const xml = renderFeed([a,{...a,title:'future',date:'2026-09-10'}],'https://example.com',now);
  assert.match(xml,/A &amp; &lt;B&gt;/);
  assert.doesNotMatch(xml,/future/);
  assert.equal((xml.match(/<item>/g)||[]).length,1);
});
test('ランキングは空URL・OFF・偽ドメイン・危険URLを表示しない',()=>{
  assert.deepEqual(activeRankings(),[]);
  for (const url of ['', 'javascript:alert(1)','https://blogmura.com.evil.test/','https://user:pass@blogmura.com/']) assert.deepEqual(activeRankings({blogmura:{enabled:true,url}}),[]);
  assert.deepEqual(activeRankings({blogmura:{enabled:false,url:'https://blogmura.com/'}}),[]);
  assert.equal(activeRankings({blogmura:{enabled:true,url:'https://blogmura.com/'}}).length,1);
  assert.deepEqual(activeRankings({unsupported:{enabled:true,url:'https://blogmura.com/'}}),[]);
});
test('次に読むは同テーマ最大3件、サイドFIREを優先する',()=>{
  const a = {slug:'side-fire',title:'サイドFIRE',category:'仕事',date:'2026-09-01'};
  const b = {...a,slug:'sidefire-day'};
  const other = {...a,slug:'unrelated',title:'移住',category:'住まい'};
  const result = relatedArticles(a,[a,other,b,...Array.from({length:4},(_,i)=>({...a,slug:`work-${i}`,title:'仕事'}))]);
  assert.equal(result.length,3); assert.equal(result[0].slug,b.slug);
  assert.ok(!result.some(x=>x.slug===a.slug||x.slug===other.slug));
});
test('生成済み全記事のRSS・共有・canonical・OGP・関連記事に重複がない',async()=>{
  const feed = await fs.readFile('feed.xml','utf8');
  for (const dir of await fs.readdir('articles',{withFileTypes:true})) {
    if (!dir.isDirectory()) continue;
    const html = await fs.readFile(`articles/${dir.name}/index.html`,'utf8');
    assert.equal((html.match(/EXTERNAL-GROWTH:START/g)||[]).length,1);
    assert.equal((html.match(/application\/rss\+xml/g)||[]).length,1);
    assert.match(html,/twitter:card" content="summary_large_image/);
    assert.match(html,/data-ranking-support hidden/);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    assert.equal(canonical,`https://wakuwaku-fire-git.pages.dev/articles/${dir.name}/`);
    for (const key of ['og:title','og:description','og:image','og:url','og:type','og:site_name','twitter:title','twitter:description','twitter:image']) assert.match(html,new RegExp(`${key}" content="[^"]+"`));
    const image = html.match(/property="og:image" content="([^"]+)"/)[1];
    await fs.access('.'+decodeURIComponent(new URL(image).pathname));
    assert.ok(feed.includes(`/articles/${dir.name}/`));
    const related = html.match(/<section class="related-articles"[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok((related.match(/class="article-preview-card"/g)||[]).length<=3);
    for(const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(block[1]);
  }
});

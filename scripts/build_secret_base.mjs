import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content", "community", "benefits");
const PUBLIC_DIR = path.join(ROOT, "community", "secret-base");
const FUNCTION_DIR = path.join(ROOT, "functions", "community", "secret-base");
const DIST_ROOT = path.join(ROOT, "dist");
const DIST_PUBLIC_DIR = path.join(DIST_ROOT, "community", "secret-base");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("特典Markdownにfrontmatterがありません");
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: match[2].trim() };
}

function metadataRecord(meta, body, sourceFile) {
  const required = ["id", "title", "icon", "summary", "publicSummary", "order"];
  for (const key of required) {
    if (!meta[key]) throw new Error(`${sourceFile}: ${key} がありません`);
  }
  return {
    id: meta.id,
    title: meta.title,
    icon: meta.icon,
    summary: meta.summary,
    publicSummary: meta.publicSummary,
    order: Number(meta.order),
    layout: meta.layout || "",
    source: meta.source || "",
    body
  };
}

function buildPublicPage(benefits) {
  const cards = benefits.map((benefit) => `
          <article class="secret-base-public-card">
            <div class="secret-base-public-card__top"><span class="secret-base-public-card__icon" aria-hidden="true">${escapeHtml(benefit.icon)}</span><span class="secret-base-lock-label">🔒 メンバー限定</span></div>
            <h2>${escapeHtml(benefit.title)}</h2>
            <p>${escapeHtml(benefit.publicSummary)}</p>
            <button class="secret-base-public-card__action" type="button" data-open-secret-base>特典を見る <span aria-hidden="true">→</span></button>
          </article>`).join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="ワクワクFIREコミュニティのメンバー限定エリア。限定資料やコミュニティで蓄積してきたコンテンツをまとめた、大人の秘密基地です。" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#07172d" />
    <link rel="canonical" href="https://wakuwaku-fire-git.pages.dev/community/secret-base/" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="stylesheet" href="/style.css" />
    <link rel="stylesheet" href="/community/secret-base/secret-base.css" />
    <title>🔒 大人の秘密基地｜ワクワクFIREコミュニティ メンバー限定エリア</title>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9422971410274449" crossorigin="anonymous"></script>
  </head>
  <body class="secret-base-page secret-base-public">
    <a class="skip-link" href="#main-content">本文へ移動</a>
    <header class="secret-base-header">
      <div class="secret-base-shell secret-base-header__inner">
        <a class="secret-base-brand" href="/" aria-label="ワクワクFIRE トップへ戻る"><span class="secret-base-brand__mark">W</span><span>ワクワク<span>FIRE</span></span></a>
        <a class="secret-base-back-link" href="/">ホームへ戻る ↗</a>
      </div>
    </header>
    <main id="main-content">
      <section class="secret-base-hero">
        <div class="secret-base-shell secret-base-hero__inner">
          <div class="secret-base-hero__copy">
            <p class="secret-base-eyebrow">WAKUWAKU FIRE / MEMBERS ONLY</p>
            <h1>🔒 大人の秘密基地</h1>
            <p class="secret-base-hero__subtitle">ワクワクFIREコミュニティ<br class="secret-base-mobile-only" /> メンバー限定エリア</p>
            <p class="secret-base-hero__lead">ここは、ワクワクFIREコミュニティのメンバーだけが入れる秘密基地。<br />限定資料やコミュニティで蓄積してきたコンテンツなど、一般公開していないものをまとめています。</p>
            <p class="secret-base-hero__note">大人になっても、秘密基地はちょっとワクワクする。<br />メンバーの方は、鍵を開けて中へどうぞ。</p>
            <button class="secret-base-button secret-base-button--gold" type="button" data-open-secret-base>🔐 秘密基地の鍵を開ける</button>
          </div>
          <figure class="secret-base-hero__visual">
            <div class="secret-base-hero__visual-frame"><img src="/コミュニティメンバー限定エリア.png" width="2433" height="1367" alt="コミュニティメンバー限定エリアをイメージした秘密基地のサムネイル" /></div>
            <figcaption><span>🔒</span> メンバー限定の入口</figcaption>
          </figure>
        </div>
      </section>

      <section class="secret-base-section" aria-labelledby="secret-base-benefits-title">
        <div class="secret-base-shell">
          <div class="secret-base-section-heading"><p class="secret-base-eyebrow">WHAT IS INSIDE</p><h2 id="secret-base-benefits-title">秘密基地の中にあるもの</h2><p>特典の名前と概要だけ、入口から少しご紹介します。詳しい資料やリンクは、メンバー限定です。</p></div>
          <div class="secret-base-public-grid">${cards}
          </div>
        </div>
      </section>

      <section class="secret-base-cta-section">
        <div class="secret-base-shell secret-base-cta-card">
          <p class="secret-base-eyebrow">UNLOCK THE BASECAMP</p>
          <h2>🔐 秘密基地の鍵を開ける</h2>
          <p>コミュニティメンバーに共有されているパスワードを入力すると、限定エリアへ進めます。</p>
          <button class="secret-base-button secret-base-button--dark" type="button" data-open-secret-base>鍵を入力する <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </main>
    <footer class="secret-base-footer"><div class="secret-base-shell"><a href="/">ワクワクFIRE</a><span>大人の秘密基地</span></div></footer>

    <dialog class="secret-base-dialog" id="secret-base-dialog" aria-labelledby="secret-base-dialog-title">
      <div class="secret-base-dialog__inner">
        <button class="secret-base-dialog__close" type="button" data-close-secret-base aria-label="閉じる">×</button>
        <p class="secret-base-eyebrow">THE SECRET KEY</p>
        <h2 id="secret-base-dialog-title">🔐 秘密基地の鍵</h2>
        <p>コミュニティメンバーに共有されているパスワードを入力してください。</p>
        <form data-secret-base-form>
          <label for="secret-base-password">パスワード</label>
          <input id="secret-base-password" name="password" type="password" autocomplete="current-password" required />
          <button class="secret-base-button secret-base-button--gold" type="submit">秘密基地を開ける <span aria-hidden="true">→</span></button>
          <p class="secret-base-form-status" data-secret-base-status role="status" aria-live="polite"></p>
        </form>
      </div>
    </dialog>
    <script src="/community/secret-base/secret-base.js" defer></script>
  </body>
</html>
`;
}

const files = (await fs.readdir(CONTENT_DIR)).filter((file) => file.endsWith(".md") && file !== "README.md").sort();
if (!files.length) throw new Error("特典Markdownがありません");
const benefits = [];
for (const file of files) {
  const source = await fs.readFile(path.join(CONTENT_DIR, file), "utf8");
  benefits.push(metadataRecord(...Object.values(parseFrontmatter(source)), file));
}
benefits.sort((left, right) => left.order - right.order);

await fs.mkdir(PUBLIC_DIR, { recursive: true });
await fs.mkdir(FUNCTION_DIR, { recursive: true });
await fs.writeFile(path.join(PUBLIC_DIR, "index.html"), buildPublicPage(benefits), "utf8");
await fs.writeFile(
  path.join(FUNCTION_DIR, "data.generated.js"),
  `// Generated by scripts/build_secret_base.mjs. Edit content/community/benefits/*.md instead.\nexport const SECRET_BASE_BENEFITS = ${JSON.stringify(benefits, null, 2)};\n`,
  "utf8"
);
try {
  await fs.access(DIST_ROOT);
  await fs.mkdir(DIST_PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(DIST_PUBLIC_DIR, "index.html"), buildPublicPage(benefits), "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(`秘密基地を生成しました: ${benefits.length}件`);

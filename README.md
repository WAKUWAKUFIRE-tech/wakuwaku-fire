# ワクワクFIRE

FIREを楽しく知るための、HTML・CSS・JavaScriptだけで作った静的サイトです。外部フレームワークやビルド作業は使っていません。

## ファイル構成

- `index.html`：トップページ、SEO、OGP、診断・ゲーム・本・コラムへの入口
- `style.css`：サイト全体のデザイン、スマホ対応、記事ページの読みやすさ
- `script.js`：スマホメニュー、カテゴリー絞り込み、日替わり本、メッセージ表示
- `data/books.js`：今日のおすすめFIRE本、50冊分の情報とAmazonリンク
- `data/ranking-client.js`：3つの診断で使う匿名IDの作成、結果送信、ランキング表示
- `functions/api/diagnosis-result.js`：診断結果をD1へ保存するAPI
- `functions/api/diagnosis-ranking.js`：診断ごとのランキングを返すAPI
- `functions/_result-master.js`：サーバー側で検証する診断結果IDの一覧
- `migrations/0001_create_diagnosis_results.sql`：匿名診断結果テーブルを作るSQL
- `articles/index.html`：FIREコラム一覧
- `articles/各スラッグ/index.html`：FIREコラムの個別ページ（現在13本）
- `about/index.html`：運営者情報
- `privacy/index.html`：公開中のプライバシーポリシー
- `contact/index.html`：指定メールアドレスへ送るお問い合わせフォーム
- `404.html`：存在しないURLを開いたときの案内ページ
- `sitemap.xml`：検索エンジン向けのページ一覧
- `robots.txt`：検索エンジンへの案内
- `risk-runner/`：ゲーム「RISK RUNNER」

画像ファイルは、ファイル名を変えずにサイトのルートへ置いています。トップのFIREコラムカードには `FIREコラム.png`、noteカードには `note.png`、各記事には `ブログ13記事` フォルダ内の対応する画像を使用しています。

トップページは、サイトの主役である診断・ゲーム・移住・本などの「楽しいコンテンツ」を先に表示し、その中にnote・コミュニティへの入口も配置しています。その下に最新3記事のFIREコラム、運営者情報を配置しています。

## ローカルで確認する方法

`index.html` をブラウザで開けば表示できます。リンクや階層ページを確認するときは、フォルダ全体をそのまま開いてください。

## FIREコラムを追加する方法

1. `articles/` の中に、英数字のスラッグ名でフォルダを作ります。
2. その中に `index.html` を置きます。既存の記事ページをコピーして、タイトル・説明・日付・本文・前後記事リンクを編集します。
3. トップページのコンテンツ一覧にある `FIREコラム` カードと `articles/index.html` の一覧へ追加します。
4. `sitemap.xml` に、個別記事のURLを1件追加します。
5. `title`、`description`、`canonical`、OGP、JSON-LDのURLが新しい記事に合っているか確認します。

記事本文は、見出し（h2・h3）と段落を使い、読者がスマホで読みやすい長さにしてください。制度や投資の内容は、必ず最新の公的情報も確認します。

## 今日のおすすめFIRE本を更新する方法

本の情報とAmazonリンクは、すべて `data/books.js` という1ファイルにまとめています。

1. `data/books.js` を開きます。
2. Amazonアソシエイトで作成したURLを、対応する本の `affiliateUrl: ""` に入力します。
3. GitHubへ保存すると、リンクが入っている本の中から日本時間の日付で1冊が表示されます。

Amazonの商品URLや書影を自動生成する処理は入れていません。架空のURLを作らず、リンクはご自身で確認して入力してください。

## Cloudflare Pagesで公開する設定

GitHub連携方式なら、GitHubへ変更を保存するたびにCloudflare Pagesが自動で公開します。

- フレームワーク：`なし`（None）
- ビルドコマンド：空欄
- 出力先：このフォルダ（`index.html` がある場所）

公開URLを変更した場合は、すべてのHTMLの `canonical`、OGPのURL、JSON-LD、`sitemap.xml`、このREADMEのURLを実際の公開URLに合わせてください。

## みんなの診断結果ランキング（Cloudflare D1）

動物FIRE診断、国内FIRE移住診断、海外FIRE移住診断の結果画面に、匿名のランキングを表示できます。質問の回答途中は送信せず、最後に確定した結果IDだけを送信します。同じブラウザ・同じ診断の再診断は、1票を新しい結果へ更新します。

この機能はCloudflare Pages FunctionsとD1を使います。現在公開中の `wakuwaku-fire-git` のProduction環境では、D1データベース `wakuwaku-fire-results` を `DB` という名前で接続済みです。公開直後はデータが0件ですが、診断結果が送信されるとランキングに反映されます。D1が設定されていない別環境でも、診断そのものは利用でき、ランキング部分だけが表示されません。

### Cloudflare側で新しい環境を設定する場合

1. Cloudflareの「Workers & Pages」からD1データベースを新しく作成します。名前は例として `wakuwaku-fire-results` にします。
2. Pagesプロジェクト `wakuwaku-fire-git` の **Settings → Bindings → Add → D1 database bindings** を開きます。
3. 変数名を **`DB`** にし、1で作ったD1データベースを選んで保存します。
4. Pagesプロジェクトを再デプロイします。バインディングは再デプロイ後にFunctionsから使えるようになります。

Cloudflareの公式案内：<https://developers.cloudflare.com/pages/functions/bindings/>

### D1テーブルを作るコマンド

このプロジェクトのフォルダで、Wranglerにログインした状態で実行します。現在の公開環境では管理画面から適用済みです。別の環境で作る場合は、`wakuwaku-fire-results` を作成したD1名に置き換えてください。

```text
npx wrangler d1 create wakuwaku-fire-results
npx wrangler d1 execute wakuwaku-fire-results --remote --file=./migrations/0001_create_diagnosis_results.sql
```

すでに同じ名前のD1を作成済みなら、`create` はもう一度実行せず、テーブル作成の2行目だけを実行してください。実行後、次の確認もできます。

```text
npx wrangler d1 execute wakuwaku-fire-results --remote --command="SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;"
```

Wranglerの公式案内：<https://developers.cloudflare.com/d1/wrangler-commands/>

### APIと保存内容

- `POST /api/diagnosis-result`：`diagnosis_type`、`result_id`、`anonymous_id` のみ受け付けます
- `GET /api/diagnosis-ranking?type=animal|japan|world`：診断ごとの順位・人数・割合を返します
- D1のテーブル名は `diagnosis_results` です
- 保存する列は `anonymous_id`、`diagnosis_type`、`result_id`、`created_at`、`updated_at` です
- `anonymous_id + diagnosis_type` に一意制約があり、再診断はUPSERTで更新します
- 名前、メールアドレス、IPアドレス、回答途中の内容、年齢、資産額は保存しません

ローカルでPages Functionsを確認する場合は、WranglerのPages開発サーバーにD1を渡します。D1のローカルデータは本番とは別です。

```text
npx wrangler pages dev . --d1 DB=YOUR_D1_DATABASE_ID
```

公式のローカル開発案内：<https://developers.cloudflare.com/d1/best-practices/local-development/>

## Google Search Consoleの設定

1. Search Consoleでサイトを登録します。
2. HTMLのmetaタグによる確認を選びます。
3. Googleから表示された `google-site-verification` のmetaタグを、各HTMLの `<head>` 内へ追加します。
4. GitHubへ保存し、Cloudflare Pagesの公開後に確認ボタンを押します。
5. Search Consoleで `sitemap.xml` のURL（例：`https://公開URL/sitemap.xml`）を送信します。

所有権確認用のコードは、架空のものを入れていません。Googleから発行されたコードを使ってください。

## Google AdSenseの設定

現在のHTMLには、Googleから発行されたAdSense審査用コード（`ca-pub-9422971410274449`）を各ページの `<head>` に1回ずつ設置しています。広告の表示・設定はGoogleの審査やAdSense側の設定に従います。

Publisher IDを変更する場合は、架空のIDを作らず、Googleから発行されたコードだけに置き換えてください。同じページの `<head>` にAdSenseスクリプトを重複して追加しないでください。

審査に通ったあと広告ユニットを追加する場合も、本文やボタンを押しのけない位置に置き、広告であることが分かる表示と、Googleの最新ポリシーを確認してください。

## お問い合わせフォームの送信先

`contact/index.html` のフォームは、`mailto:` で `marumaru.nanatatsu@gmail.com` を送信先に設定しています。訪問者が送信ボタンを押すと、端末に設定されたメールアプリが開きます。

将来、メールアプリを使わないフォーム送信に変更する場合は、Cloudflare Pages Functionsやフォームサービスを別途設定し、送信先とプライバシーポリシーの記載を確認してください。

## Amazonアソシエイトについて

サイトにはAmazonアソシエイトのリンクが含まれています。プライバシーポリシーに参加者であることと紹介料に関する表示を掲載しています。規約や表示要件が変更された場合は、最新の内容に合わせて更新してください。

## AdSense申請前に私が手動でやること

- [ ] `about/index.html` とトップページの運営者情報が、公開してよい内容・現在の状況と一致しているか確認する
- [ ] お問い合わせフォームからメールアプリが開き、指定アドレスへ送れることをスマホとPCで確認する
- [ ] `privacy/index.html` のアクセス解析、広告、Cookie、保存期間の記載を実際の運用に合わせる
- [ ] Amazonアソシエイトの最新規約と表示文を確認する
- [ ] Google Analyticsを使う場合は、測定IDを自分のアカウントのものに設定する
- [ ] AdSenseコードが自分のPublisher IDと一致し、各ページで1回だけ読み込まれているか確認する
- [x] D1を作成し、Pagesのバインディング名を `DB` にして、匿名ランキングのテーブルを作成する
- [ ] 3つの診断を最後まで試し、D1設定後に結果画面へランキングが表示されるか確認する
- [ ] Search Consoleの所有権確認metaタグを追加し、サイトマップを送信する
- [ ] 公開URL、canonical、OGP、sitemap、robots.txtのURLが一致しているか確認する
- [ ] 主要ページをスマホで開き、画像、記事、診断、ゲーム、外部リンクが動くか確認する
- [ ] 自分のサイトの内容と広告・アフィリエイト表示が、Googleと各サービスの最新ポリシーに合っているか最終確認する

このチェックリストの法的・規約上の判断は、運営者ご自身で行ってください。

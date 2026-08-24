# ワクワクFIRE

FIREを楽しく知るための、HTML・CSS・JavaScriptだけで作ったサイトです。

## ファイル構成

- `index.html`：ワクワクFIREのホームページ、SEO、OGP
- `style.css`：ホームページのデザインとスマホ対応
- `script.js`：メニュー、カテゴリー絞り込み、メッセージの動き
- `data/books.js`：今日のおすすめFIRE本に表示する50冊のデータとAmazonリンク欄
- `risk-runner/`：ワクワクFIRE内のゲームコンテンツ「RISK RUNNER」
- `焚火.png`：トップのメインビジュアル
- `青空駆ける.png`：FIREのある暮らし紹介用画像
- `秘密基地でゲーム.png`：遊びの紹介用画像

## コンテンツを追加するとき

ページごとにフォルダを作り、その中に `index.html` を置くと整理しやすくなります。

```text
diagnosis/
  animal-fire/
    index.html
life/
  domestic/
    index.html
```

ページができたら、ホームページの対応カードにリンクを追加し、「準備中」の表示を外します。

## 今日のおすすめFIRE本を更新するとき

本の情報は `data/books.js` という1つのファイルにまとめています。

1. `data/books.js` を開く
2. 紹介したい本の `affiliateUrl: ""` の空欄に、Amazonアソシエイトで作成したURLを入力する
3. GitHubへ保存すると、URLを入力した本だけがコーナーに表示される

表示する本は、日本時間の日付をもとに毎日自動で切り替わります。リンクが1冊も入っていない間は、コーナー全体が表示されません。サイト側でAmazonの商品情報やURLを自動取得する処理は入れていません。

## Cloudflare Pagesで公開する設定

このサイトはビルド作業が不要です。

- フレームワーク：`なし`（None）
- ビルドコマンド：空欄
- 出力先：このフォルダ（プロジェクトのルート）

公開後は、`index.html` の `canonical`・`og:url`・`og:image` にある公開URLが、実際の公開URLと一致しているか確認してください。

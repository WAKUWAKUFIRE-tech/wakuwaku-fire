# ワクワクFIRE

FIREを楽しく知るための、HTML・CSS・JavaScriptだけで作ったサイトです。

## ファイル構成

- `index.html`：ワクワクFIREのホームページ、SEO、OGP
- `style.css`：ホームページのデザインとスマホ対応
- `script.js`：メニュー、カテゴリー絞り込み、メッセージの動き
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

## Cloudflare Pagesで公開する設定

このサイトはビルド作業が不要です。

- フレームワーク：`なし`（None）
- ビルドコマンド：空欄
- 出力先：このフォルダ（プロジェクトのルート）

公開後は、`index.html` の `canonical`・`og:url`・`og:image` にある `https://wakuwaku-fire.pages.dev/` を実際の公開URLに変更してください。

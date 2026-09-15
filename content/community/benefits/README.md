# 大人の秘密基地・特典コンテンツ

このフォルダのMarkdownが、秘密基地の特典内容の正本です。

更新手順：

1. 各特典のMarkdown本文と `assets.json` の画像対応を編集する
2. プロジェクトのルートで `npm run secret-base:build` を実行する
3. 画像を追加・差し替えた場合は `npm run secret-base:download-assets` を実行する
4. `community/secret-base/index.html` と `functions/community/secret-base/data.generated.js` の更新を確認する

`dist/` が存在する環境では、公開ページと画像も自動的に同期されます。

認証には、Cloudflare Pagesの環境変数（Secret）`SECRET_BASE_PASSWORD`を設定してください。値はフロントエンドやGit管理下のファイルには保存していません。未設定時は限定ページを開けない状態になります。

note下書きからの移植元：

- 特典①：`https://editor.note.com/notes/n13afdb729257/edit/`
- 特典②：`https://editor.note.com/notes/n6e366a69d91a/edit/`
- 特典③：`https://editor.note.com/notes/n40fd33a49130/edit/`

特典①・②・③の本文と見出しは、元の下書きの意味を保ったままWeb向けにセクション化しています。noteの編集画面に埋め込まれた画像は、`assets.json` のURLからローカル画像へ移します。特典②の投稿本文は画像資料として作成されているため、画像をそのまま掲載しています。

現時点で下書きから取得できた特典は3件です。CAMPFIRE等に別の特典がある場合は、内容を創作せず、対応するMarkdownを追加してください。

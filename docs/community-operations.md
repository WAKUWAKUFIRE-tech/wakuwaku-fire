# コミュニティLP・週報の運用

## 公開ページ

- `/community/`：コミュニティの紹介、対象者、今週の話題、活動紹介、主催者、開放DAY、FAQ、参加ボタン。
- `/community/weekly/`：既存のDiscord週報を週ごとに掲載するアーカイブ。最新週報の本文・見出し・箇条書きをそのまま表示する。
- トップページには最新週報の「今週の要約」だけを小型カードで表示する。
- 既存記事のコミュニティ導線、CAMPFIREバックアップ、SEO、計測は従来どおり維持する。

## 正本と週1回の公開

Discord側の正本は、既存プロジェクト `C:\Users\syuns\Documents\ChatGPT\DISCORD` の `reports/weekly/YYYY/YYYY-MM-DD.md` です。保存場所を変える場合は `DISCORD_ARCHIVE_ROOT` で指定します。

1. Discordプロジェクトで `npm run discord:weekly` を実行し、既存の差分同期と週報生成を行う。新しい収集処理やDiscordへの投稿は追加しない。
2. このサイトのプロジェクトで `npm run community:import-report` を実行する。引数を省略すると既存週報フォルダの最新Markdownを使う。
3. 取り込み時に除去するのはDiscord投稿リンクの行だけ。週報の文章、順番、見出し、箇条書きは変更しない。リンクを除いたMarkdownは `data/community-reports/YYYY-MM-DD.md` に保存する。
4. `npm run community:build`、`npm run test:community`、`npm run validate:site` を実行する。
5. 新しい週の公開ファイルだけをコミットして既存mainへ通常pushする。Cloudflare PagesのGit連携で公開される。

同じ週報を再実行した場合は、内容が同じなら変更なしで終了する。公開済みの同じ日付を別内容で上書きしない。週報が見つからない、生成・検証に失敗した場合は既存の公開アーカイブを保つ。

Codexの自動更新は毎週火曜09:00（日本時間）に実行し、最新の既存週報がまだ取り込まれていれば公開する。Discord側の週報生成が先に完了していない週は、架空の内容を補わず変更なしで終了する。週報のサイト更新からDiscordへ投稿することはない。

## リンクと公開データ

- `/community/weekly/` とトップの週報表示にはDiscord投稿URLを掲載しない。
- `community-report.mjs` はDiscordのMarkdownリンクと裸URLを除去し、HTMLとして安全にエスケープしてから静的ページへ埋め込む。
- SQLite、Discordの原文、候補、レビュー用ファイル、認証情報はGitにも公開サイトにも置かない。
- `data/community-weekly.json` は旧来の匿名トピック表示との後方互換用。正本週報が存在する場合、公開週報ページとトップ要約は `data/community-reports` を優先する。

## イベント・メンバーの声

- `data/community-open-day.json`：`enabled` を true にして、title、startsAt、endsAt（ISO8601、タイムゾーン必須）、description、participation、HTTPSのurl、ctaを設定する。終了したイベントは非表示に戻る。
- `data/community-voices.json`：label、body、published、consentを設定する。実在する声と掲載許諾を確認したものだけを登録し、未登録ならセクション自体を表示しない。

## 計測

既存 `script.js` の gtag / dataLayer 連携を再利用する。両方存在する場合も二重送信しない。新規外部サービス・解析タグは追加していない。

| イベント | 対象 |
|---|---|
| community_page_view | LP PV |
| community_weekly_page_view | weekly PV |
| community_campfire_click | 最終参加CTA |
| community_home_to_weekly_click | トップ→weekly |
| community_weekly_to_lp_click | weekly→LP |
| community_context_click | 対象記事・診断→LP |
| community_to_weekly_click | LP→weekly |
| community_open_day_click | 開放DAY CTA |

## バックアップと確認

`docs/backups/campfire-community-2026-09-08*` に、LP変更前のCAMPFIREページと関連記録を保存している。CAMPFIRE本体には書き込んでいない。Pages Functionsの `functions/docs/[[path]].js` はバックアップ文書へのアクセスを404（noindex）にする。

変更後は、LP・weekly・トップ・JSON・画像が200で取得できること、`/docs/backups/...` が404であること、公開JSONとローカルJSONが一致することを確認する。外部ソース検証はネットワークが利用できる環境で実行し、利用できない場合はローカル検証の結果と制約を記録する。


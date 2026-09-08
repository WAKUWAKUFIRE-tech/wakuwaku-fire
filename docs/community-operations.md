# コミュニティLP・週報の運用

## 公開ページ

- `/community/`：コンセプト、対象者、今週の話題、活動紹介、主催者、開放DAY、FAQ、参加ボタン。
- `/community/weekly/`：日付を明示した週別アーカイブ。最初の週は2026-09-01〜09-07。
- トップはおすすめ書籍の後、FIREコラムの前に小型カード。既存コミュニティカードもLPに接続。
- 暇、サイドFIRE、退職後の暮らし、コミュニティ関連記事7ページは既存のCAMPFIRE大型カード2個を文脈に合う小さなリンク1個へ置換。FIREストレングスは診断結果の後に追加。
- シミュレーター本体は別ドメインで、このリポジトリにコードがないため未変更。

## 正本と再利用

Discordの正本は既存プロジェクトの `data/discord_archive.db`。既定のプロジェクトはユーザーホーム配下の `Documents/ChatGPT/DISCORD`。変更時は `DISCORD_ARCHIVE_ROOT` で指定する。

1. 既存 `tools/discord-archive/src/cli.js sync` による差分同期。収集・接続処理を新しく作らない。Discordへのメッセージ送信はしない。
2. `npm run community:extract`：既存 `weekly-report.js` の `getWeeklyPeriod`・`matchedTopics` を再利用。前日までの直近7暦日（JST）をSQLiteから読み取り専用で抽出。
3. 候補をOSのTEMP配下 `wakuwaku-community-weekly` に保存。原文・候補・レビュー情報はGitにもWebにも置かない。取得結果に候補ファイルのパスとSHA256が出る。
4. Codexが候補を読み、公開して問題ない話題だけを日本語でAI再作文。単一の投稿を「皆で盛り上がった」と拡大しない。自分や職場での飲み会をコミュニティ主催イベントと誤認しない。個人的な場所・家族・資産・健康・勤務先・銘柄は一切含めない。確証がなければ除外。最大5件、1件1〜3文、一文65文字以内を上限とし40〜60文字程度を目安にする。イベント開催・予定は本文に明確な根拠がなければ掲載しない。
5. 非公開ドラフトを作成し `npm run community:import -- PRIVATE_DRAFT PRIVATE_CANDIDATES`。AI再作文・プライバシーレビュー・根拠・候補SHA256・同期鮮度・期間・氏名・長い原文一致・出力形式を検証し、公開用フィールドだけを取り出す。
6. `data/community-weekly.json` とLP・weekly・トップの静的HTMLを生成。公開済み週を自動で上書きしない。同一週・同一内容の再実行は変更なし。
7. `npm run test:community`、`npm run validate:site`。差分をレビューし、今回の公開ファイルだけをGitにコミットして既存mainへ通常push。Cloudflare Pages Git連携により公開。
8. 公開JSONとローカルJSONが一致すること、LP・weekly・画像・トップ導線が200であること、`/docs/backups/...` が404であることを確認して成功扱い。

候補が無い週は `items: []` で記録できる。開催回数・活動人数・レビューを作って埋めない。同期失敗・古いSQLite・QA失敗の場合は公開を止め、既存の公開アーカイブを保つ。最新週の枠は期限を過ぎると準備中になる。

## ドラフト形式（TEMPにのみ置く）

```json
{
  "week": {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "items": []},
  "review": {"aiRewritten": true, "privacyReviewed": true, "noUnverifiedClaims": true, "sourceDigest": "候補ファイルのSHA256"},
  "evidence": []
}
```

itemsは `{ "category": "topics|calls|insights|chat|upcoming", "title": "短い見出し", "body": "再作文した文。" }`。evidenceは各itemsと同じ順の候補key配列。reviewはAIが実際に確認した場合のみtrueにする。機械的な検査だけでプライバシー確認が完了したと判断しない。

## 自動更新

Codexのこのタスクの定期実行を毎週火曜09:00（日本時間）に設定。前週火曜〜月曜を対象にする。ローカルSQLiteにアクセスするため、このPCとCodexが利用でき、ログイン・通信・利用枠があることが前提。新しい有料APIキーは不要。未実行の週を架空の内容で補完しない。

定期実行は、最新mainを専用作業コピーに取り込み、上記1〜8を実行する。通常の手作業は不要。データが変わらない再実行は通知不要。新しい週の公開完了、失敗、利用者の操作が必要な場合だけ通知する。

## イベント・メンバーの声

- `data/community-open-day.json`：enabledをtrueにして、title、startsAt、endsAt（ISO8601、タイムゾーン必須）、description、participation、HTTPSのurl、ctaを設定。終了したイベントは非表示に戻る。
- `data/community-voices.json`：voices配列にlabel（公開用匿名表記）、body、published、consentを追加。実在する声と掲載許諾を確認したものだけを登録。未登録ならセクション自体を表示しない。
- 変更後は `npm run community:build` で再生成し、テスト・公開。情報をこのCodexタスクに伝えれば編集から公開まで対応できる。

## 計測

既存script.jsのgtag / dataLayer連携を再利用。両方存在する場合も二重送信しない。新規外部サービス・解析タグは追加していない。

| イベント | 対象 |
|---|---|
| community_page_view | LP PV |
| community_weekly_page_view | weekly PV |
| community_campfire_click | 最終参加CTA |
| community_home_to_weekly_click | トップ→weekly |
| community_weekly_to_lp_click | weekly→LP |
| community_context_click | 対象記事・診断→LP（ラベルで区別） |
| community_to_weekly_click | LP→weekly |
| community_open_day_click | 開放DAY CTA |

確認できたサイトコードにはgtag本体・dataLayerの初期化はないため、計測イベントは既存解析タグが提供される環境でのみ送信される。Cloudflare標準の閲覧数分析とは別で、カスタムイベントの収集先は未接続。この制約を公開完了報告でも明示する。

## バックアップ

`docs/backups/campfire-community-2026-09-08*` の7ファイルを変更前に専用コミットで保存。元HTML、本文HTML、Markdown、公開APIのプロジェクト情報、料金プラン、URL一覧、画像URL一覧。復元時は本文HTMLとAPI記録を正本に照合する。CAMPFIRE本体には一切書き込んでいない。外部画像配信の存続は保証しない。

Pages Functionsの `functions/docs/[[path]].js` がdocsへのWebアクセスを404にする。非公開Discordデータはこのフォルダにも置かない。

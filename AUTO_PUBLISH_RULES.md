# ワクワクFIRE SEO自動公開ルール

このファイルは、事前に確認・保存した記事ストックを、毎日2枠（07:00・18:00 JST）に1本ずつ公開する運用の実装ルールです。記事の品質判断は、`content_sources/CONTENT_WRITING_RULES.md` と `content_sources/knowledge_base/` を優先します。

## 実行方式

- GitHub Actionsを毎日 `22:00 UTC` と `09:00 UTC` に起動します。日本時間では翌朝07:00と同日18:00（Asia/Tokyo）です。
- 記事本文とサムネイルは、ChatGPT/Codexで事前に作成して `automation/article_stock/<slug>/` に保存します。承認前は `status: prepared_review`、承認後は `status: stocked` とします。
- 1回の実行で、`status: stocked` かつ `priority_order` が最小の1件だけを選びます。公開時には新しい文章・画像を生成しません。
- `published_slot` にJSTの公開枠（`YYYY-MM-DDT07:00:00+09:00` または `YYYY-MM-DDT18:00:00+09:00`）を記録し、同じ枠の再実行だけを停止します。同じ日の別枠は公開できます。
- Actionsのconcurrency制御とローカルの排他ロックでも、同時実行を防ぎます。
- GitHubへ反映すると、既存のCloudflare Pages Git連携がある場合にデプロイされます。
- デプロイ後、公開URLのHTTP応答とcanonical・OGPを確認してから成功扱いにします。
- `_redirects` でknowledge base、note原文、キュー、ログ、運用スクリプトを公開URLから404にします。

## 事前作成ストック

記事を作るときは、次のソースを読んだうえで、1本ずつ内容を確認します。

1. `CONTENT_WRITING_RULES.md`
2. `personal_quotes_and_credo.md`
3. `seo_experience_map.md`
4. `numbers_and_facts.md`
5. `contradictions_and_updates.md`
6. キュー項目の `knowledge_base_topics`
7. キーワードに関連する公開note原文

有料・非公開部分は使いません。完成した記事は次の3ファイルとして保存します。

- `article.json`：タイトル、説明、出典、内部リンクなど
- `body.html`：公開本文
- `thumbnail.png`：1:1のサムネイル

自動公開処理は、この保存済みストックを検証して公開するだけです。根拠不足、構造不備、危険なHTML、最新制度の出典不足がある記事は `prepared_review` のまま止めます。

## サムネイル

- 基準画像は `まる画像集__1_-removebg-preview.png` です。
- ChatGPT/Codexの画像生成機能で基準画像と参考デザインを参照し、黒髪・黒縁メガネ・白系FIRE Tシャツ・アニメ調の一貫性を保ちながら、絵と日本語の見出しを一体で生成します。公開時に画像生成APIは呼びません。
- 画像は1280×1280（1:1）のPNGに整えます。生成文字の誤字・読みにくさが出た場合だけ、確認後に正確な文字合成へ切り替えます。
- 本名、住所、電話番号、メールアドレスなどの個人情報は、本文・サムネイル・メタ情報・公開ログのいずれにも入れません。
- 生成画像が取得できない、サイズが不正、または画像処理依存関係がない場合は記事を公開しません。

## 必要なGitHub設定

OpenAI APIキーや有料APIの設定は不要です。任意のRepository Variableとして `SITE_URL`（既定値 `https://wakuwaku-fire-git.pages.dev`）だけを設定できます。

Cloudflare Pages側では、このリポジトリのmainブランチを公開対象にし、静的サイトなのでビルドコマンドは空欄、出力先はリポジトリルートにします。GitHub Actionsがmainへpushできるよう、Actionsのworkflow permissionsでContentsをRead and writeにしてください。

## 手動実行

GitHub Actionsのworkflow_dispatchから実行できます。ローカルでは次の確認ができます。

```text
npm run validate:site
npm run auto-publish:status
npm run auto-publish:dry-run
npm run auto-publish:approve -- --id seo-001
npm run auto-publish:manual
```

`auto-publish:approve` は、ユーザー確認済みの `prepared_review` を `stocked` に移す操作です。公開処理では記事生成・画像生成・外部AI呼び出しを行いません。

## 失敗時

- 承認済みストックがない場合は、キューを変更せず終了します。
- 個別記事の根拠不足は `needs_review`、技術エラーや公開確認失敗は `failed` として理由を残します。
- 失敗記事があっても、次回は次の `stocked` 記事を選びます。
- Git競合時は強制上書きせず、Actionsを失敗させて手動確認に回します。

## 現時点の制約

記事の事前作成はこのCodex上で行い、公開処理は保存済みファイルだけを使います。そのため、毎日の公開にOpenAI APIキーは必要ありません。GitHubへのpush、Cloudflareデプロイ、公開URL確認は、GitHub連携・Pages設定が揃ってから成立します。

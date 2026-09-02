$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$NoteDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $NoteDir)
$ArticlesDir = Join-Path $NoteDir 'articles'
$ManifestPath = Join-Path $NoteDir 'manifest.tsv'
$IndexPath = Join-Path $NoteDir 'index.md'
$LogPath = Join-Path $NoteDir 'collection_log.md'
$FailedPath = Join-Path $NoteDir 'failed_or_skipped.md'
$CatalogPath = Join-Path $NoteDir 'catalog.json'
$StartTime = [DateTimeOffset]::Now

New-Item -ItemType Directory -Force -Path $ArticlesDir | Out-Null

function Write-Utf8File {
    param([string]$Path, [string]$Content)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Yaml-Quote {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { return "''" }
    return "'" + ($Value -replace "'", "''" -replace "`r?`n", ' ') + "'"
}

function Get-Attribute {
    param([string]$Tag, [string]$Name)
    $pattern = '(?i)\b' + [regex]::Escape($Name) + '\s*=\s*["'']([^"'']+)["'']'
    $m = [regex]::Match($Tag, $pattern)
    if ($m.Success) { return [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) }
    return ''
}

function Convert-Inline {
    param([AllowNull()][string]$Html)
    if ([string]::IsNullOrEmpty($Html)) { return '' }
    $s = $Html
    $s = [regex]::Replace($s, '(?is)<br\s*/?>', "`n")
    $s = [regex]::Replace($s, '(?is)</?(strong|b)\b[^>]*>', '**')
    $s = [regex]::Replace($s, '(?is)</?(em|i)\b[^>]*>', '*')
    $s = [regex]::Replace($s, '(?is)<code\b[^>]*>(.*?)</code>', { param($m) '`' + ([regex]::Replace($m.Groups[1].Value, '(?is)<[^>]+>', '')) + '`' })
    $s = [regex]::Replace($s, '(?is)<[^>]+>', '')
    $s = [System.Net.WebUtility]::HtmlDecode($s)
    return ($s -replace "`r", '').Trim()
}

function Get-BodyHtml {
    param([string]$Html)
    $open = [regex]::Match($Html, '(?is)<div\b[^>]*data-name\s*=\s*["'']body["''][^>]*>')
    if (-not $open.Success) { return $null }
    $contentStart = $open.Index + $open.Length
    $rest = $Html.Substring($contentStart)
    $depth = 1
    foreach ($tag in [regex]::Matches($rest, '(?is)</?div\b[^>]*>')) {
        if ($tag.Value -match '(?is)^</div') {
            $depth--
        } elseif ($tag.Value -notmatch '(?is)/\s*>$') {
            $depth++
        }
        if ($depth -eq 0) { return $rest.Substring(0, $tag.Index) }
    }
    return $null
}

function Convert-HtmlToMarkdown {
    param([string]$Html)
    $s = $Html
    $s = [regex]::Replace($s, '(?is)<!--.*?-->', '')

    # Figures are handled before generic tags so images, embeds, and captions remain useful.
    $s = [regex]::Replace($s, '(?is)<figure\b[^>]*>.*?</figure>', {
        param($m)
        $f = $m.Value
        $img = [regex]::Match($f, '(?is)<img\b[^>]*>')
        if ($img.Success) {
            $src = Get-Attribute $img.Value 'data-src'
            if ([string]::IsNullOrEmpty($src)) { $src = Get-Attribute $img.Value 'src' }
            $alt = Get-Attribute $img.Value 'alt'
            if ($src -and $src -notmatch '^data:') { return "![" + $alt + "](" + $src + ")`n`n" }
        }
        $link = [regex]::Match($f, '(?is)<a\b[^>]*href\s*=\s*["'']([^"'']+)["''][^>]*>')
        $title = [regex]::Match($f, '(?is)external-article-widget-title[^>]*>(.*?)</')
        $desc = [regex]::Match($f, '(?is)external-article-widget-description[^>]*>(.*?)</')
        if ($link.Success -and $title.Success) {
            $t = Convert-Inline $title.Groups[1].Value
            $d = if ($desc.Success) { Convert-Inline $desc.Groups[1].Value } else { '' }
            $out = "[" + $t + "](" + $link.Groups[1].Value + ")"
            if ($d) { $out += "`n`n" + $d }
            return $out + "`n`n"
        }
        $iframe = [regex]::Match($f, '(?is)<iframe\b[^>]*>')
        if ($iframe.Success) {
            $src = Get-Attribute $iframe.Value 'src'
            if ($src) { return "[埋め込みコンテンツ]($src)`n`n" }
        }
        $text = Convert-Inline $f
        if ($text) { return $text + "`n`n" }
        return ''
    })

    $s = [regex]::Replace($s, '(?is)<h([1-6])\b[^>]*>(.*?)</h\1\s*>', {
        param($m)
        $level = [int]$m.Groups[1].Value
        return (('#' * $level) + ' ' + (Convert-Inline $m.Groups[2].Value) + "`n`n")
    })
    $s = [regex]::Replace($s, '(?is)<blockquote\b[^>]*>(.*?)</blockquote\s*>', {
        param($m)
        $t = Convert-Inline $m.Groups[1].Value
        return (($t -split "`n" | ForEach-Object { '> ' + $_.TrimEnd() }) -join "`n") + "`n`n"
    })
    $s = [regex]::Replace($s, '(?is)<pre\b[^>]*>(.*?)</pre\s*>', {
        param($m)
        $t = Convert-Inline $m.Groups[1].Value
        return ('```text' + "`n" + $t + "`n" + '```' + "`n`n")
    })
    $s = [regex]::Replace($s, '(?is)<img\b[^>]*>', {
        param($m)
        $src = Get-Attribute $m.Value 'data-src'
        if ([string]::IsNullOrEmpty($src)) { $src = Get-Attribute $m.Value 'src' }
        $alt = Get-Attribute $m.Value 'alt'
        if ($src -and $src -notmatch '^data:') { return "![" + $alt + "](" + $src + ")`n`n" }
        return ''
    })
    $s = [regex]::Replace($s, '(?is)<iframe\b[^>]*>.*?</iframe\s*>', {
        param($m)
        $src = Get-Attribute ([regex]::Match($m.Value, '(?is)<iframe\b[^>]*>').Value) 'src'
        if ($src) { return "[埋め込みコンテンツ]($src)`n`n" }
        return ''
    })
    $s = [regex]::Replace($s, '(?is)<a\b[^>]*href\s*=\s*["'']([^"'']+)["''][^>]*>(.*?)</a\s*>', {
        param($m)
        $label = Convert-Inline $m.Groups[2].Value
        if ($label) { return '[' + $label + '](' + $m.Groups[1].Value + ')' }
        return $m.Groups[1].Value
    })
    $s = [regex]::Replace($s, '(?is)<li\b[^>]*>(.*?)</li\s*>', {
        param($m) '- ' + (Convert-Inline $m.Groups[1].Value) + "`n"
    })
    $s = [regex]::Replace($s, '(?is)<hr\b[^>]*>', "`n`n---`n`n")
    $s = [regex]::Replace($s, '(?is)<br\s*/?>', "`n")
    $s = [regex]::Replace($s, '(?is)<p\b[^>]*>', '')
    $s = [regex]::Replace($s, '(?is)</p\s*>', "`n`n")
    $s = [regex]::Replace($s, '(?is)</?(ul|ol|div|section|table|thead|tbody|tr|td|th)\b[^>]*>', "`n")
    $s = [regex]::Replace($s, '(?is)<[^>]+>', '')
    $s = [System.Net.WebUtility]::HtmlDecode($s)
    $s = $s -replace "`r", '' -replace [char]0xA0, ' '
    $s = [regex]::Replace($s, '[ \t]+\n', "`n")
    $s = [regex]::Replace($s, '\n[ \t]+', "`n")
    $s = [regex]::Replace($s, '\n{3,}', "`n`n")
    return $s.Trim()
}

function Get-BlogPosting {
    param([string]$Html)
    foreach ($script in [regex]::Matches($Html, '(?is)<script\b[^>]*type\s*=\s*["'']application/ld\+json["''][^>]*>(.*?)</script\s*>')) {
        try {
            $obj = $script.Groups[1].Value | ConvertFrom-Json
            $candidates = @()
            if ($obj.'@graph') { $candidates += @($obj.'@graph') }
            if ($obj.'@type') { $candidates += $obj }
            $hit = $candidates | Where-Object { $_.'@type' -eq 'BlogPosting' } | Select-Object -First 1
            if ($hit) { return $hit }
        } catch { }
    }
    return $null
}

function Get-Topics {
    param([string]$Title, [string]$Text)
    $all = ($Title + "`n" + $Text)
    $defs = [ordered]@{
        'FIRE' = 'FIRE|セミリタイア|早期退職'
        'Side FIRE' = 'サイドFIRE|Side FIRE'
        '投資・資産' = '投資|資産|億円|万円|株価|資産運用|インデックス'
        '仮想通貨・デイトレ' = '仮想通貨|暗号資産|デイトレ|トレーダー'
        '仕事・副業' = '仕事|会社|働く|副業|YouTube|YouTuber|配達|専業主夫'
        '生活・幸福' = '幸福|幸せ|人生|暇|日常|ワクワク|趣味|自由'
        '家族' = '家族|親|オカン|オトン|子供|子ども|妻|夫'
        'コミュニティ' = 'コミュニティ|仲間|サードプレイス'
        'お金の使い方' = 'お金を使|支出|節約|消費|貯め'
        'FIRE漫画' = '4コマ漫画|４コマ漫画'
    }
    $out = @()
    foreach ($key in $defs.Keys) {
        if ($all -match $defs[$key]) { $out += $key }
        if ($out.Count -ge 5) { break }
    }
    if ($out.Count -eq 0) { $out = @('その他') }
    return $out
}

function Get-PrimaryTopic {
    param([string]$Title)
    if ($Title -match '4コマ|４コマ|漫画') { return '4コマ・漫画' }
    if ($Title -match '仮想通貨|暗号資産|デイトレ|トレード|ロスカット|億り') { return '投資・資産' }
    if ($Title -match 'コミュニティ|仲間|サードプレイス') { return 'コミュニティ・仲間' }
    if ($Title -match '子供|子ども|家族|オカン|オトン|専業主夫|主夫|妻|親') { return '家族・子育て' }
    if ($Title -match '仕事|会社|働く|副業|YouTube|YouTuber|配達|配信|収益|キャリア') { return '仕事・発信' }
    if ($Title -match 'FIRE後|日常|毎日|暇|後悔|不安|恐怖|幸せ|幸福|人生|時間|ワクワク') { return 'FIRE後・人生' }
    if ($Title -match 'お金|資産|投資|株|節約|支出|消費') { return 'お金・投資' }
    return 'FIRE・生き方'
}

function Get-SafeFileStem {
    param([string]$Date, [string]$Title, [string]$Key)
    $stem = ($Date + '_' + $Title) -replace '[<>:"/\\|?*\x00-\x1F]', '_'
    $stem = $stem -replace '\s+', ' '
    $stem = $stem.Trim().TrimEnd('.')
    if ($stem.Length -gt 110) { $stem = $stem.Substring(0, 110).TrimEnd() }
    $path = Join-Path $ArticlesDir ($stem + '.md')
    if (-not (Test-Path -LiteralPath $path)) { return $stem }
    return ($stem.Substring(0, [Math]::Min(95, $stem.Length)).TrimEnd('_') + '_' + $Key)
}

if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "Manifest not found: $ManifestPath" }
$manifestRows = @(Get-Content -LiteralPath $ManifestPath -Encoding UTF8 | Where-Object { $_.Trim() })
$manifest = @()
foreach ($line in $manifestRows) {
    $parts = $line -split "`t", 2
    if ($parts.Count -eq 2) { $manifest += [pscustomobject]@{ Url = $parts[0].Trim(); ListedTitle = $parts[1].Trim() } }
}
$groups = @($manifest | Group-Object Url | Where-Object Count -gt 1)
$duplicateCount = 0
if ($groups.Count -gt 0) { $duplicateCount = [int](($groups | Measure-Object -Property Count -Sum).Sum) }

$existingByUrl = @{}
foreach ($file in @(Get-ChildItem -LiteralPath $ArticlesDir -Filter '*.md' -File -ErrorAction SilentlyContinue)) {
    try {
        $head = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        $m = [regex]::Match($head, "(?m)^source_url:\s*'([^']+)'")
        if ($m.Success) { $existingByUrl[$m.Groups[1].Value] = $file.Name }
    } catch { }
}

$records = @()
$failures = @()
$partial = @()
$seenUrls = @{}
$i = 0
foreach ($item in $manifest) {
    $i++
    $url = $item.Url.Split('?')[0]
    if ($seenUrls.ContainsKey($url)) { continue }
    $seenUrls[$url] = $true
    Write-Progress -Activity 'ワクワクFIRE note記事を収集中' -Status "$i / $($manifest.Count)" -PercentComplete ([int](($i / [double]$manifest.Count) * 100))
    $html = $null
    $lastError = ''
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{ 'User-Agent' = 'Mozilla/5.0'; 'Accept-Language' = 'ja-JP,ja;q=0.9' } -MaximumRedirection 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { $html = $response.Content; break }
            $lastError = "HTTP $($response.StatusCode)"
        } catch {
            $lastError = $_.Exception.Message
            if ($attempt -lt 3) { Start-Sleep -Milliseconds 700 }
        }
    }
    if ([string]::IsNullOrEmpty($html)) {
        $failures += [pscustomobject]@{ Title = $item.ListedTitle; Url = $url; Reason = "ページ取得失敗: $lastError" }
        continue
    }
    $bodyHtml = Get-BodyHtml $html
    if ($null -eq $bodyHtml) {
        $failures += [pscustomobject]@{ Title = $item.ListedTitle; Url = $url; Reason = '本文領域（data-name=body）を確認できなかったため保存不可' }
        continue
    }
    $posting = Get-BlogPosting $html
    $title = if ($posting -and $posting.headline) { [string]$posting.headline } else { Convert-Inline ([regex]::Match($html, '(?is)<h1\b[^>]*>(.*?)</h1>').Groups[1].Value) }
    if ([string]::IsNullOrEmpty($title)) { $title = $item.ListedTitle }
    $publishedIso = if ($posting -and $posting.datePublished) { [string]$posting.datePublished } else { [string]([regex]::Match($html, '(?is)<time\b[^>]*datetime\s*=\s*["'']([^"'']+)["'']').Groups[1].Value) }
    $updatedIso = if ($posting -and $posting.dateModified) { [string]$posting.dateModified } else { '' }
    try { $publishedDate = ([DateTimeOffset]::Parse($publishedIso)).ToString('yyyy-MM-dd') } catch { $publishedDate = '0000-00-00' }
    $updatedDate = ''
    if ($updatedIso) { try { $updatedDate = ([DateTimeOffset]::Parse($updatedIso)).ToString('yyyy-MM-dd') } catch { $updatedDate = $updatedIso } }
    $author = if ($posting -and $posting.author -and $posting.author.name) { [string]$posting.author.name } else { 'まる | ワクワクFIRE' }
    $tags = @()
    foreach ($m in [regex]::Matches($html, '(?is)href\s*=\s*["'']https://note\.com/hashtag/[^"'']+["''][^>]*>(.*?)</a\s*>')) {
        $tag = (Convert-Inline $m.Groups[1].Value).Trim()
        if ($tag -and $tags -notcontains $tag) { $tags += $tag }
    }
    if ($tags.Count -eq 0 -and $posting -and $posting.keywords) { $tags = @(([string]$posting.keywords -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) }
    if ($tags.Count -gt 8) { $tags = @($tags | Select-Object -First 8) }
    $markdown = Convert-HtmlToMarkdown $bodyHtml
    $plain = Convert-Inline $bodyHtml
    $hasNumbers = [regex]::IsMatch($plain, '\d|[一二三四五六七八九十百千万億]+円|万円|歳|年目')
    $hasPersonal = [regex]::IsMatch(($title + "`n" + $plain), '僕|私|自分|実体験|経験|FIREした|会社を辞め|おっさん|子持ち')
    $topics = @(Get-Topics $title $plain)
    $primaryTopic = Get-PrimaryTopic $title
    $priceMatch = [regex]::Match($html, '(?is)o-noteContentHeader__status.{0,1800}?¥\s*([0-9,]+)')
    $paywall = [regex]::IsMatch($html, '(?is)o-paywallContentItem|購入手続きへ')
    $price = if ($priceMatch.Success) { [int](($priceMatch.Groups[1].Value -replace ',', '')) } else { 0 }
    $access = if ($paywall -or $price -gt 0) { 'paid_partial' } else { 'public_free' }
    $keyMatch = [regex]::Match($url, '/n/([^/?#]+)')
    $key = if ($keyMatch.Success) { $keyMatch.Groups[1].Value } else { $i.ToString('000') }
    $fileName = if ($existingByUrl.ContainsKey($url)) { $existingByUrl[$url] } else { (Get-SafeFileStem $publishedDate $title $key) + '.md' }
    $filePath = Join-Path $ArticlesDir $fileName
    $tagLines = if ($tags.Count) { ($tags | ForEach-Object { '  - ' + (Yaml-Quote $_) }) -join "`n" } else { '  []' }
    $topicLines = ($topics | ForEach-Object { '  - ' + (Yaml-Quote $_) }) -join "`n"
    $front = @"
---
title: $(Yaml-Quote $title)
published_at: $(Yaml-Quote $publishedDate)
updated_at: $(Yaml-Quote $updatedDate)
source: 'note'
source_url: $(Yaml-Quote $url)
author: $(Yaml-Quote $author)
content_type: 'note_article'
access_status: $(Yaml-Quote $access)
price_yen: $price
has_paywall: $($paywall.ToString().ToLowerInvariant())
primary_topic: $(Yaml-Quote $primaryTopic)
tags:
$tagLines
topics:
$topicLines
has_personal_experience: $($hasPersonal.ToString().ToLowerInvariant())
has_specific_numbers: $($hasNumbers.ToString().ToLowerInvariant())
collected_at: $(Yaml-Quote $StartTime.ToString('o'))
---

"@
    Write-Utf8File $filePath ($front + $markdown + "`n")
    if ($paywall -or $price -gt 0) { $partial += [pscustomobject]@{ Title = $title; Url = $url; Reason = "有料記事のため無料公開部分のみ保存（価格表示: ¥$price）。有料本文は取得していません。" } }
    $records += [pscustomobject]@{ Title = $title; Url = $url; Published = $publishedDate; Updated = $updatedDate; File = $fileName; PrimaryTopic = $primaryTopic; Topics = $topics; HasPersonal = $hasPersonal; HasNumbers = $hasNumbers; Access = $access; Price = $price; HasPaywall = $paywall; Tags = $tags }
    Start-Sleep -Milliseconds 120
}
Write-Progress -Activity 'ワクワクFIRE note記事を収集中' -Completed

$records = @($records | Sort-Object Published, Title)
$complete = $records.Count
$partialCount = $partial.Count
$finishTime = [DateTimeOffset]::Now
$oldLegacyPath = Join-Path $RootDir 'wakuwaku_fire_all_notes.txt'
$legacyUrls = @()
if (Test-Path -LiteralPath $oldLegacyPath) {
    $legacyText = [System.IO.File]::ReadAllText($oldLegacyPath)
    $legacyUrls = @([regex]::Matches($legacyText, 'https://note\.com/wakuwaku_fire/n/[a-z0-9]+') | ForEach-Object Value | Sort-Object -Unique)
}
$currentUrlSet = @{}
foreach ($r in $records) { $currentUrlSet[$r.Url] = $true }
$legacyOnly = @($legacyUrls | Where-Object { -not $currentUrlSet.ContainsKey($_) })

$oldest = $records | Select-Object -First 1
$newest = $records | Select-Object -Last 1
$index = @()
$index += '# ワクワクFIRE note記事アーカイブ'
$index += ''
$index += "最終収集日：$($finishTime.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
$index += "総記事数：$($manifest.Count)"
$index += "本文保存：$complete"
$index += "うち有料部分制限：$partialCount"
$index += "取得失敗：$($failures.Count)"
$index += ''
$index += '公開日の古い順。記事本文は `articles/` の1記事1ファイルで保存しています。'
$index += ''
$index += '| 公開日 | タイトル | URL | 主テーマ | 実体験 | 数字あり | 取得状態 |'
$index += '|---|---|---|---|---|---|---|'
foreach ($r in $records) {
    $safeTitle = $r.Title -replace '\|', '｜'
    $topic = $r.PrimaryTopic
    $state = if ($r.Access -eq 'paid_partial') { '無料部分のみ' } else { '保存' }
    $index += "| $($r.Published) | $safeTitle | $($r.Url) | $topic | $(if($r.HasPersonal){'○'}else{'—'}) | $(if($r.HasNumbers){'○'}else{'—'}) | $state |"
}
if ($records.Count -eq 0) { $index += '| — | 本文を保存できた記事はありません | — | — | — | — | — |' }
Write-Utf8File $IndexPath (($index -join "`n") + "`n")

$failLines = @('# 取得失敗・取得範囲の制限', '', "最終収集日：$($finishTime.ToString('yyyy-MM-dd HH:mm:ss zzz'))", '', '## 有料部分のため取得していないもの', '')
if ($partial.Count -eq 0) { $failLines += 'なし' } else {
    foreach ($x in $partial) { $failLines += "- **$($x.Title)**`n  - URL: $($x.Url)`n  - 理由: $($x.Reason)" }
}
$failLines += ''; $failLines += '## ページ取得・本文抽出に失敗したもの'; $failLines += ''
if ($failures.Count -eq 0) { $failLines += 'なし' } else {
    foreach ($x in $failures) { $failLines += "- **$($x.Title)**`n  - URL: $($x.Url)`n  - 理由: $($x.Reason)" }
}
Write-Utf8File $FailedPath (($failLines -join "`n") + "`n")

$catalog = [ordered]@{
    collected_at = $finishTime.ToString('o')
    source_url = 'https://note.com/wakuwaku_fire'
    discovered_count = $manifest.Count
    saved_count = $complete
    partial_count = $partialCount
    failed_count = $failures.Count
    duplicate_count = [int]$duplicateCount
    legacy_only_count = $legacyOnly.Count
    articles = $records
}
Write-Utf8File $CatalogPath (($catalog | ConvertTo-Json -Depth 8) + "`n")

$log = @()
$log += '# note記事収集ログ'
$log += ''
$log += "- 収集開始日時: $($StartTime.ToString('o'))"
$log += "- 収集完了日時: $($finishTime.ToString('o'))"
$log += '- 対象URL: https://note.com/wakuwaku_fire'
$log += "- 発見した記事数: $($manifest.Count)"
$log += "- 保存できた記事数: $complete"
$log += "- 取得失敗件数: $($failures.Count)"
$log += "- 有料部分のみ取得不可: $partialCount"
$log += "- 重複件数: $duplicateCount"
$log += "- 最古の記事: $(if($oldest){$oldest.Published + ' ' + $oldest.Title + ' (' + $oldest.Url + ')'}else{'—'})"
$log += "- 最新の記事: $(if($newest){$newest.Published + ' ' + $newest.Title + ' (' + $newest.Url + ')'}else{'—'})"
$log += "- 既存legacyファイルのみで、現在一覧にないURL: $($legacyOnly.Count)"
$log += ''
$log += '## 収集方法'
$log += ''
$log += '- noteの公開記事一覧を「もっとみる」が終わるまで辿り、一覧に表示された各詳細URLを収集した。'
$log += '- 各詳細ページを読み取り、JSON-LDの公開日・更新日と `data-name="body"` の本文領域を使用した。'
$log += '- 有料記事は無料公開部分だけを保存し、有料本文を取得していない。'
$log += '- 過去の `wakuwaku_fire_all_notes.txt` は削除していない。今回の `content_sources/note/` を正式参照元とする。'
$log += ''
$log += '## 差分更新'
$log += ''
$log += '- `manifest.tsv` は公開一覧から得たURLとタイトルの記録。次回は一覧を再取得し、`source_url` をキーに新規・既存を照合する。'
$log += '- 既存記事は同じ `source_url` のファイル名を維持して更新し、新規記事だけ新しいMarkdownを追加する。'
$log += '- `catalog.json` と `index.md` の件数を更新後に確認する。'
if ($legacyOnly.Count -gt 0) {
    $log += ''
    $log += '## 現在一覧にないlegacy URL'
    foreach ($u in $legacyOnly) { $log += "- $u" }
}
Write-Utf8File $LogPath (($log -join "`n") + "`n")

Write-Output ("Saved $complete / $($manifest.Count); paid partial $partialCount; failed $($failures.Count)")

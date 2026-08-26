
  (function () {
    "use strict";

    var SHARE_URL = "";
    var DEBUG_MODE = false;
    var APP_TITLE = "移住場所 勝手に案内所&#65372;海外編";
    var STORAGE_KEY = "world-iju-guide-progress-v1";
    var AXES = [
      { key: "cost", label: "生活費の安さ" },
      { key: "urban", label: "都会の便利さ" },
      { key: "quiet", label: "静かな暮らし" },
      { key: "sea", label: "海の近さ" },
      { key: "nature", label: "山&#12539;自然" },
      { key: "warm", label: "温暖さ" },
      { key: "cool", label: "涼しさ" },
      { key: "humidity", label: "湿気への耐性" },
      { key: "healthcare", label: "医療" },
      { key: "safety", label: "治安&#12539;安心感" },
      { key: "english", label: "英語環境" },
      { key: "languageBarrier", label: "現地語への適応" },
      { key: "japaneseAccess", label: "日本食&#12539;日本文化" },
      { key: "japanAccess", label: "日本への帰国しやすさ" },
      { key: "carFree", label: "車なし生活" },
      { key: "internationalAccess", label: "国際旅行のしやすさ" },
      { key: "excitement", label: "刺激&#12539;ナイトライフ" },
      { key: "expatCommunity", label: "外国人コミュニティ" },
      { key: "remoteWork", label: "リモートワーク" },
      { key: "visaReality", label: "長期滞在制度との相性" }
    ];

    function opt(text, effects, themes) {
      return { text: cleanDisplayText(text), effects: effects || [], themes: themes || [] };
    }

    function q(text, answers) {
      return { text: cleanDisplayText(text), answers: answers };
    }

    /* effects: [axis, desiredLevel(1-5), weight(1-5)] */
    var questions = [
      q("会社を辞めた&#12290;海外生活で一番叶えたいのは&#65311;", [
        opt("💰 日本より生活費を下げて自由度アップ", [["cost", 5, 5], ["remoteWork", 4, 2]]),
        opt("🌴 毎日を楽しく&#12289;のんびり暮らしたい", [["quiet", 4, 3], ["warm", 4, 3], ["sea", 4, 2]]),
        opt("🌍 一度くらい世界のど真ん中で暮らしたい", [["urban", 5, 5], ["excitement", 5, 4], ["internationalAccess", 5, 3]], [["city", 5, 4]])
      ]),
      q("月の生活費&#12289;海外ならどんな気分&#65311;", [
        opt("💸 できるだけ小さく&#12290;FIRE資産を守りたい", [["cost", 5, 5], ["visaReality", 4, 2]]),
        opt("&#9878;&#65039; 日本と同じくらいならOK", [["cost", 3, 4], ["healthcare", 3, 2]]),
        opt("&#10024; 高くても最高の場所なら払う", [["cost", 1, 5], ["urban", 5, 3], ["excitement", 5, 2]], [["ideal", 5, 4]])
      ]),
      q("海外に住んでも日本へ帰る&#65311;", [
        opt("🇯🇵 年に何回も帰りたい", [["japanAccess", 5, 5], ["japaneseAccess", 4, 2], ["internationalAccess", 4, 2]]),
        opt("&#9992;&#65039; 年1&#12316;2回くらい", [["japanAccess", 3, 4], ["internationalAccess", 3, 2]]),
        opt("🌍 数年帰らなくても平気", [["japanAccess", 1, 5], ["internationalAccess", 5, 3]], [["far", 5, 4]])
      ]),
      q("飛行機10時間超え&#12290;どう&#65311;", [
        opt("😱 無理&#12290;日本の近くがいい", [["japanAccess", 5, 4], ["internationalAccess", 2, 2]]),
        opt("🙂 年数回ならいける", [["japanAccess", 3, 3], ["internationalAccess", 3, 2]]),
        opt("🍷 むしろ遠い海外に住みたい", [["japanAccess", 1, 5], ["internationalAccess", 5, 4]], [["far", 5, 3]])
      ]),
      q("英語について&#12290;", [
        opt("😅 正直かなり不安", [["english", 1, 5], ["languageBarrier", 1, 4], ["japaneseAccess", 4, 1]]),
        opt("🗣 日常会話くらいなら挑戦する", [["english", 3, 4], ["languageBarrier", 3, 3]]),
        opt("🌎 英語生活ウェルカム", [["english", 5, 5], ["languageBarrier", 4, 3], ["expatCommunity", 4, 2]])
      ]),
      q("英語が通じない場面&#12290;", [
        opt("😨 かなり困る", [["english", 5, 5], ["languageBarrier", 1, 5]]),
        opt("📱 翻訳アプリで何とかする", [["english", 3, 3], ["languageBarrier", 3, 3]]),
        opt("🔥 それも海外生活のおもろさ", [["languageBarrier", 5, 5], ["english", 3, 1]])
      ]),
      q("毎日30&#8451;前後&#12290;", [
        opt("🥵 絶対イヤ", [["warm", 1, 5], ["humidity", 1, 4], ["cool", 4, 2]]),
        opt("🌤 暑くてもまあ平気", [["warm", 3, 4], ["humidity", 3, 3]]),
        opt("🌴 むしろ最高", [["warm", 5, 5], ["humidity", 5, 4]], [["island", 5, 2]])
      ]),
      q("冬について&#12290;", [
        opt("&#9728;&#65039; 冬なんて無くていい", [["warm", 5, 4], ["cool", 1, 4]]),
        opt("🍂 四季はちょっと欲しい", [["warm", 3, 3], ["cool", 3, 3]]),
        opt("&#10052;&#65039; 寒い国も全然OK", [["cool", 5, 5], ["warm", 1, 3]], [["north", 5, 3]])
      ]),
      q("高温多湿な東南アジア&#12290;", [
        opt("🫠 湿気で溶ける", [["humidity", 1, 5], ["warm", 1, 2]]),
        opt("😅 慣れればいけそう", [["humidity", 3, 3], ["warm", 3, 2]]),
        opt("🌴 むしろ南国最高", [["humidity", 5, 5], ["warm", 5, 3]], [["asia", 5, 3], ["island", 5, 3]])
      ]),
      q("FIRE後の理想の家の外は&#65311;", [
        opt("🏙 店&#12539;電車&#12539;人&#12290;便利な大都会", [["urban", 5, 5], ["carFree", 5, 4], ["excitement", 4, 2]], [["city", 5, 3]]),
        opt("&#9749; カフェと店がある中規模都市", [["urban", 3, 4], ["quiet", 3, 3], ["carFree", 4, 2]]),
        opt("🌊 海や自然が近い静かな場所", [["quiet", 5, 4], ["sea", 5, 4], ["nature", 5, 4]], [["island", 5, 3]])
      ]),
      q("車について&#12290;", [
        opt("🚇 海外でも車なしで暮らしたい", [["carFree", 5, 5], ["urban", 4, 2]]),
        opt("🚕 タクシー中心ならOK", [["carFree", 3, 4]]),
        opt("🚗 運転するのも全然OK", [["carFree", 1, 5], ["nature", 4, 2]])
      ]),
      q("FIRE後の遊び&#12290;", [
        opt("🍻 食&#12539;買い物&#12539;イベント&#12539;夜遊び", [["excitement", 5, 5], ["urban", 4, 2], ["japaneseAccess", 4, 1]]),
        opt("&#9749; 街歩き&#12539;カフェ&#12539;散歩", [["quiet", 4, 3], ["urban", 3, 2], ["carFree", 4, 2]]),
        opt("🏄 海&#12539;山&#12539;アウトドア", [["sea", 5, 4], ["nature", 5, 4], ["quiet", 4, 2]])
      ]),
      q("日本食が週1回も食べられません&#12290;", [
        opt("🍣 無理無理無理", [["japaneseAccess", 5, 5]]),
        opt("🍜 月何回かあればOK", [["japaneseAccess", 3, 4]]),
        opt("🌮 現地飯だけでも生きられる", [["japaneseAccess", 1, 5], ["languageBarrier", 4, 2]])
      ]),
      q("海外生活中に病院へ行くことになった&#12290;", [
        opt("🏥 医療環境はかなり重要", [["healthcare", 5, 5], ["safety", 4, 2]]),
        opt("🙂 ある程度ちゃんとしていればOK", [["healthcare", 3, 4]]),
        opt("💪 そこまで優先順位は高くない", [["healthcare", 1, 4], ["cost", 4, 1]])
      ]),
      q("治安について&#12290;", [
        opt("🛡 夜一人でも安心できる方がいい", [["safety", 5, 5], ["healthcare", 4, 1]]),
        opt("👀 普通に注意すればいい", [["safety", 3, 4]]),
        opt("🌍 海外なら多少の緊張感は覚悟する", [["safety", 1, 3], ["languageBarrier", 4, 2]])
      ]),
      q("現地で日本人コミュニティ&#12290;", [
        opt("🇯🇵 あるとうれしい", [["japaneseAccess", 4, 4], ["expatCommunity", 3, 2]]),
        opt("🌏 どちらでも", [["japaneseAccess", 3, 2], ["expatCommunity", 3, 2]]),
        opt("🧳 むしろ日本人が少ないところへ行きたい", [["japaneseAccess", 1, 5], ["languageBarrier", 4, 2]], [["far", 4, 2]])
      ]),
      q("FIRE後&#12289;仕事は&#65311;", [
        opt("🦥 なるべく働かん", [["remoteWork", 1, 4], ["quiet", 4, 2]]),
        opt("💻 ネットで少し稼ぐ", [["remoteWork", 4, 5], ["internationalAccess", 4, 1]]),
        opt("🔥 海外でも仕事やビジネスしたい", [["remoteWork", 5, 5], ["excitement", 4, 2], ["internationalAccess", 4, 2]])
      ]),
      q("ビザの手続きが面倒です&#12290;", [
        opt("😵 簡単な国がいい", [["visaReality", 5, 5], ["cost", 4, 1]]),
        opt("📄 多少なら頑張る", [["visaReality", 3, 4]]),
        opt("🏆 理想の国なら面倒でも突破する", [["visaReality", 1, 5]], [["ideal", 5, 3]])
      ]),
      q("長期滞在の条件として資産証明などが必要&#12290;", [
        opt("😑 面倒&#12290;ハードル低い方がいい", [["visaReality", 5, 5], ["cost", 4, 2]]),
        opt("💰 ある程度なら問題なし", [["visaReality", 3, 4]]),
        opt("🏦 資産条件はそれほど気にならない", [["visaReality", 1, 4], ["cost", 1, 2]])
      ]),
      q("ヨーロッパに住む人生&#12290;", [
        opt("🤔 特に憧れない", [["internationalAccess", 3, 1]]),
        opt("🇪🇺 一度はやってみたい", [["internationalAccess", 4, 3], ["languageBarrier", 4, 2]], [["europe", 4, 4]]),
        opt("😍 めちゃくちゃ憧れる", [["internationalAccess", 5, 4], ["languageBarrier", 4, 3]], [["europe", 5, 5]])
      ]),
      q("アジア生活&#12290;", [
        opt("🤔 あまり興味なし", [["internationalAccess", 3, 1]]),
        opt("🙂 便利ならアリ", [["cost", 3, 2], ["japaneseAccess", 3, 2]], [["asia", 3, 3]]),
        opt("🍜 むしろアジアが落ち着く", [["cost", 4, 3], ["japaneseAccess", 4, 2], ["warm", 4, 2]], [["asia", 5, 5]])
      ]),
      q("南の島で毎日海を見ながら生活&#12290;", [
        opt("😴 1ヶ月で飽きそう", [["sea", 1, 4], ["excitement", 4, 2]], [["island", 1, 3]]),
        opt("🌊 かなり良さそう", [["sea", 4, 4], ["quiet", 4, 2]], [["island", 4, 4]]),
        opt("🏝 それが人生のゴール", [["sea", 5, 5], ["nature", 5, 3], ["warm", 5, 2]], [["island", 5, 5]])
      ]),
      q("FIRE後も刺激は欲しい&#65311;", [
        opt("🎉 毎日何か起きてほしい", [["excitement", 5, 5], ["urban", 4, 2]]),
        opt("🙂 たまには刺激が欲しい", [["excitement", 3, 4]]),
        opt("🦥 平和こそ最強", [["excitement", 1, 5], ["quiet", 5, 3]])
      ]),
      q("最後&#12290;明日&#12289;本当に会社を辞めました&#12290;どれに近い&#65311;", [
        opt("🧳 まずは住みやすい海外へ行ってみよう", [["safety", 4, 3], ["visaReality", 4, 3], ["japanAccess", 4, 2]]),
        opt("🌴 人生一回&#12290;好きな場所に住んだる&#65281;", [["sea", 4, 2], ["excitement", 4, 2]], [["ideal", 5, 5]]),
        opt("💰 FIREを長持ちさせられる場所へ行こう", [["cost", 5, 5], ["visaReality", 5, 3], ["remoteWork", 4, 2]])
      ])
    ];

    /*
     * 30候補&#12290;cost / fireCostEfficiency は高いほどFIRE向き&#12290;
     * humidity / languageBarrier は高いほど&#12300;耐えられる&#12539;適応しやすい&#12301;&#12290;
     * visaPracticality は制度を断定せず&#12289;相対的な現実度として扱う&#12290;
     */
    var destinations = [
      { id:"kuala-lumpur", country:"マレーシア", city:"クアラルンプール", flag:"🇲🇾", region:"東南アジア", regionTags:["asia","city"], cost:4, urban:5, quiet:2, sea:1, nature:2, warm:5, cool:1, humidity:2, healthcare:4, safety:4, english:4, languageBarrier:4, japaneseAccess:4, japanAccess:5, carFree:4, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:5, visaPracticality:4, themeScores:{asia:5,europe:1,island:1,far:1,city:5,north:1,ideal:4}, catchCopy:"生活レベルは落としたくない&#12290;でも生活費は落としたい&#12290;", lifestyle:"高層ビルと屋台&#12289;モールとローカル食堂が同じ一日に入ってくる大都市&#12290;海外に住みたいけれど&#12289;便利さは手放したくない人の現実的な逃亡先です&#12290;", goodPoints:["コストを調整しながら都市機能を使える","日本食&#12539;医療&#12539;空港の選択肢が比較的多い","英語と多民族環境で生活を組み立てやすい"], cautions:["暑さと湿気は毎日の前提","エリア選びで車なし生活の快適さが変わる","長期滞在制度は条件変更を含めて要確認"], trivia:["多民族の食文化が日常の選択肢になる","暑い日は巨大モールを生活の一部にできる","KLIAを使ってアジア各地へ飛びやすい"], visaNote:"長期滞在制度としてMM2H等が候補になる場合があります&#12290;年齢&#12539;資産&#12539;所得&#12539;滞在日数等の条件があるため&#12289;最新制度を確認してください&#12290;", fireNote:"都市生活を残しながら生活費を調整しやすく&#12289;FIRE後の&#12302;暇つぶし&#12303;にも困りにくいタイプ&#12290;", bestFor:["コスパ","都会","日本食","アジア拠点"], tags:["コスパ","大都市","多文化"], day:[["09:00","モールのカフェで遅めの朝食&#12290;"],["12:00","暑いので屋内へ避難し&#12289;少しだけ仕事&#12290;"],["18:00","日本食か現地飯かをその日の気分で選ぶ&#12290;"],["22:00","会社を辞めても&#12289;都市はまだ眠らない&#12290;"]] },
      { id:"penang", country:"マレーシア", city:"ペナン", flag:"🇲🇾", region:"東南アジア", regionTags:["asia","island"], cost:4, urban:3, quiet:4, sea:4, nature:3, warm:5, cool:1, humidity:2, healthcare:4, safety:4, english:4, languageBarrier:4, japaneseAccess:3, japanAccess:5, carFree:3, internationalAccess:4, excitement:3, expatCommunity:5, remoteWork:4, fireCostEfficiency:5, visaPracticality:4, themeScores:{asia:5,europe:1,island:4,far:1,city:3,north:1,ideal:4}, catchCopy:"毎日を日曜日にするなら&#12289;これくらいがちょうどいい&#12290;", lifestyle:"食と街歩きが強く&#12289;KLほどせわしなくない&#12290;海の近くで暮らしたいけれど&#12289;完全な田舎に引っ込む勇気はない人にちょうどいい温度感です&#12290;", goodPoints:["生活費とゆったり感のバランス","食の楽しみが日常に入りやすい","リタイア後の生活ペースを作りやすい"], cautions:["大都会の刺激や選択肢はKLより少なめ","場所によっては車や配車に頼る","湿気と暑さはしっかり南国"], trivia:["街歩きと食べ歩きが同じルートで成立する","海を見ながら暮らせるエリアがある","KLより&#12302;予定を詰めない&#12303;暮らしに寄せやすい"], visaNote:"マレーシアの長期滞在制度を検討できる場合がありますが&#12289;条件は個人属性と最新制度で変わります&#12290;", fireNote:"コスト効率と毎日の余白が強み&#12290;FIRE後に&#12302;忙しさだけをやめたい&#12303;人向けです&#12290;", bestFor:["ゆっくり","食","海","コスパ"], tags:["のんびり","島感","食"], day:[["08:30","近所の店で朝ごはん&#12290;メニューを決めるだけで少し旅&#12290;"],["11:00","暑くなる前に散歩と買い物&#12290;"],["16:00","海の風がある場所で読書&#12290;"],["21:00","明日の予定がないことを確認して寝る&#12290;"]] },
      { id:"bangkok", country:"タイ", city:"バンコク", flag:"🇹🇭", region:"東南アジア", regionTags:["asia","city"], cost:4, urban:5, quiet:2, sea:2, nature:2, warm:5, cool:1, humidity:2, healthcare:4, safety:3, english:4, languageBarrier:3, japaneseAccess:5, japanAccess:5, carFree:3, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:4, visaPracticality:4, themeScores:{asia:5,europe:1,island:2,far:1,city:5,north:1,ideal:4}, catchCopy:"FIREしたのに&#12289;暇になる気がまったくしない&#12290;", lifestyle:"食&#12289;買い物&#12289;病院&#12289;カフェ&#12289;夜の遊びまで&#12289;街の密度が高い&#12290;会社は辞めたいけれど&#12289;刺激まで辞めるつもりはない人のための都市型FIREです&#12290;", goodPoints:["日本食と都市サービスの選択肢","空港&#12539;国際移動&#12539;外国人環境が強い","FIRE後の一日を埋めるものが多い"], cautions:["暑さ&#12539;湿気と交通事情は覚悟","静けさを求めるならエリア選びが重要","滞在方法は目的と年齢により確認が必要"], trivia:["朝食から深夜まで食の選択肢が続く","都市の中に大きな公園や静かな路地もある","近距離の海外旅行を組みやすい"], visaNote:"長期滞在&#12539;リモートワーカー向けを含む複数の滞在方法があります&#12290;目的&#12539;年齢&#12539;収入等に合う制度を最新情報で確認してください&#12290;", fireNote:"生活費を抑えながら都会の満足度を取りにいける一方&#12289;遊びすぎるとFIRE効率が溶けます&#12290;", bestFor:["刺激","食","都会","日本への近さ"], tags:["バンコク","都会","夜"], day:[["09:00","朝食を探しに外へ&#12290;選択肢が多すぎて散歩が長くなる&#12290;"],["13:00","カフェで少し作業&#12290;"],["19:00","市場か日本食か&#12289;今日は投票で決める&#12290;"],["23:00","FIRE後なのに&#12289;明日の予定がすでに増えている&#12290;"]] },
      { id:"chiang-mai", country:"タイ", city:"チェンマイ", flag:"🇹🇭", region:"東南アジア", regionTags:["asia","nature"], cost:5, urban:3, quiet:5, sea:1, nature:5, warm:4, cool:2, humidity:3, healthcare:3, safety:4, english:4, languageBarrier:4, japaneseAccess:2, japanAccess:4, carFree:3, internationalAccess:4, excitement:3, expatCommunity:5, remoteWork:5, fireCostEfficiency:5, visaPracticality:4, themeScores:{asia:5,europe:1,island:1,far:2,city:3,north:2,ideal:4}, catchCopy:"資産より先に&#12289;時間が増える街&#12290;", lifestyle:"カフェと山&#12289;ゆっくり流れる時間&#12290;海はないけれど&#12289;自然とノマドの居場所があり&#12289;予定を詰めないFIRE生活を作りやすい街です&#12290;", goodPoints:["コストを下げて時間を買いやすい","カフェ&#12539;山&#12539;静かな生活の組み合わせ","リモートワークや外国人コミュニティ"], cautions:["海を日常にしたい人には不向き","季節による空気や暑さの好みが分かれる","大きな医療や都市の刺激はバンコクより限定的"], trivia:["カフェを仕事場と休憩所の両方にできる","山が近く&#12289;都会から気分を切り替えやすい","&#12302;何もしない日&#12303;を罪悪感なく作りやすい"], visaNote:"タイには複数の長期滞在ルートがあります&#12290;年齢&#12539;資産&#12539;仕事&#12539;滞在目的によって適切な制度が異なるため&#12289;公式情報を確認してください&#12290;", fireNote:"費用を抑えながらリモートワークの余白を作れる&#12289;FIRE効率重視派の強い候補です&#12290;", bestFor:["静けさ","コスト","山","ノマド"], tags:["山","カフェ","ノマド"], day:[["08:00","山の空気を感じながら朝のコーヒー&#12290;"],["11:00","カフェの隅で少しだけ仕事&#12290;"],["15:00","予定を入れていないので&#12289;そのまま散歩&#12290;"],["20:00","海がないことを思い出すが&#12289;今日は別にいい&#12290;"]] },
      { id:"phuket", country:"タイ", city:"プーケット", flag:"🇹🇭", region:"東南アジア", regionTags:["asia","island"], cost:3, urban:2, quiet:3, sea:5, nature:4, warm:5, cool:1, humidity:2, healthcare:3, safety:3, english:4, languageBarrier:4, japaneseAccess:2, japanAccess:4, carFree:2, internationalAccess:4, excitement:4, expatCommunity:5, remoteWork:4, fireCostEfficiency:3, visaPracticality:4, themeScores:{asia:5,europe:1,island:5,far:1,city:2,north:1,ideal:5}, catchCopy:"会社を辞めたんだから&#12289;もう毎日リゾートでもええやん&#12290;", lifestyle:"海&#12289;外国人コミュニティ&#12289;リゾートの開放感&#12290;観光地としての便利さと&#12289;観光地価格の現実を両方引き受けて&#12289;毎日を休暇っぽくしたい人へ&#12290;", goodPoints:["海と南国を生活の近くに置ける","外国人向けサービスが多い","リゾート生活とリモートワークの相性"], cautions:["観光地価格や季節差に注意","車なし生活は場所選びが重要","静けさと観光地の混雑が隣り合う"], trivia:["海を&#12302;週末の予定&#12303;ではなく背景にできる","外国人向けの店やコミュニティに入りやすい","同じ島でもエリアごとに生活感が大きく違う"], visaNote:"タイの長期滞在制度や滞在方法を検討できますが&#12289;制度&#12539;条件は変更されるため最新情報が必要です&#12290;", fireNote:"理想生活は強い一方&#12289;観光地価格と車の必要性がFIRE資産に効きやすい候補です&#12290;", bestFor:["海","南国","リゾート","外国人環境"], tags:["海","リゾート","南国"], day:[["07:30","海沿いを歩いて&#12289;今日の仕事量を決める&#12290;"],["12:00","日差しが強いので屋内でランチ&#12290;"],["16:00","海へ&#12290;&#12302;平日なのに&#65311;&#12303;という感覚を捨てる&#12290;"],["21:00","観光客の波が引いた店でゆっくり食事&#12290;"]] },
      { id:"danang", country:"ベトナム", city:"ダナン", flag:"🇻🇳", region:"東南アジア", regionTags:["asia","island"], cost:5, urban:3, quiet:4, sea:5, nature:3, warm:5, cool:1, humidity:2, healthcare:3, safety:4, english:3, languageBarrier:3, japaneseAccess:3, japanAccess:5, carFree:3, internationalAccess:4, excitement:3, expatCommunity:4, remoteWork:4, fireCostEfficiency:5, visaPracticality:3, themeScores:{asia:5,europe:1,island:4,far:1,city:3,north:1,ideal:4}, catchCopy:"海&#12539;街&#12539;安さ&#12290;欲張ったらここに着いた&#12290;", lifestyle:"海沿いの気配と中規模都市の生活感が同居&#12290;大都会ほど疲れず&#12289;田舎ほど不便でもない&#12289;生活の妥協点を探す人に刺さる候補です&#12290;", goodPoints:["海&#12539;コスト&#12539;街のバランス","日本からの距離を妥協しにくい","現地飯とカフェで日常を組み立てやすい"], cautions:["長期滞在制度は目的に合わせて確認","医療やインフラはエリア差がある","暑さ&#12539;湿気&#12539;交通のクセは現地確認推奨"], trivia:["海沿いの散歩を日課にしやすい","大都市より一日の移動がコンパクト","観光と生活の境目が近い"], visaNote:"ベトナムの長期滞在&#12539;就労&#12539;投資等の制度は目的により異なります&#12290;長く住む前提なら最新の公式情報を確認してください&#12290;", fireNote:"コストと海を同時に取りたい人に強い&#12290;ただし移住現実度は&#12302;制度確認込み&#12303;で見てください&#12290;", bestFor:["海","コスパ","中規模都市","日本への近さ"], tags:["海","バランス","近距離"], day:[["08:00","海沿いを歩き&#12289;朝食は現地の麺&#12290;"],["11:00","カフェで作業&#12290;窓の向こうに南国の光&#12290;"],["17:00","街と海をつなぐ散歩コースへ&#12290;"],["22:00","&#12302;海&#12539;街&#12539;安さ&#12303;の三角形を今日も確認&#12290;"]] },
      { id:"ho-chi-minh", country:"ベトナム", city:"ホーチミン", flag:"🇻🇳", region:"東南アジア", regionTags:["asia","city"], cost:4, urban:5, quiet:2, sea:2, nature:1, warm:5, cool:1, humidity:1, healthcare:3, safety:3, english:3, languageBarrier:2, japaneseAccess:4, japanAccess:5, carFree:2, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:4, visaPracticality:3, themeScores:{asia:5,europe:1,island:1,far:1,city:5,north:1,ideal:4}, catchCopy:"会社は辞めても&#12289;刺激まで辞めたくない&#12290;", lifestyle:"バイクの音&#12289;食&#12289;若い街の勢い&#12290;静かなFIREより&#12289;会社員時代とは違う刺激を自分で選ぶFIREがしたい人向けです&#12290;", goodPoints:["コストと都市の活気","食とカフェの選択肢","若い外国人コミュニティと仕事の余地"], cautions:["暑さ&#12539;湿気&#12539;交通は好みが分かれる","静かな暮らしとは距離がある","長期滞在の現実性は目的別に確認"], trivia:["朝から夜まで街の音が途切れにくい","カフェを生活の拠点にしやすい","現地飯から日本食まで食の振れ幅が大きい"], visaNote:"ベトナムでの滞在方法は観光&#12539;就労&#12539;投資など目的別に異なります&#12290;制度の更新を公式情報で確認してください&#12290;", fireNote:"低コストで刺激とリモート環境を取りにいける一方&#12289;静けさと湿気への耐性が必要です&#12290;", bestFor:["刺激","コスト","都会","食"], tags:["都会","活気","カフェ"], day:[["09:00","外に出た瞬間&#12289;街の音で目が覚める&#12290;"],["13:00","食堂からカフェへ移動して少し仕事&#12290;"],["18:00","バイクの流れを眺めながら夕食&#12290;"],["23:00","会社は辞めたが&#12289;街のエネルギーはまだある&#12290;"]] },
      { id:"bali", country:"インドネシア", city:"バリ島", flag:"🇮🇩", region:"東南アジア", regionTags:["asia","island"], cost:3, urban:2, quiet:3, sea:5, nature:5, warm:5, cool:1, humidity:2, healthcare:2, safety:3, english:4, languageBarrier:4, japaneseAccess:2, japanAccess:4, carFree:2, internationalAccess:4, excitement:4, expatCommunity:5, remoteWork:5, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:5,europe:1,island:5,far:2,city:2,north:1,ideal:5}, catchCopy:"FIREというより&#12289;人生そのものを南国仕様に&#12290;", lifestyle:"海&#12539;自然&#12539;外国人コミュニティと&#12289;場所によって変わる生活密度&#12290;会社を辞めるだけでなく&#12289;人生の背景ごと変えたい人に強く刺さります&#12290;", goodPoints:["海&#12539;自然&#12539;リモートワークの妄想が膨らむ","外国人コミュニティが厚い","南国の一日を作りやすい"], cautions:["渋滞とエリア差は大きい","医療&#12539;インフラは生活圏を選ぶ必要","観光地価格と制度を見落とさない"], trivia:["同じ島でも仕事場とリゾートの顔が変わる","カフェやコワーキングを日課に組み込める","海だけでなく内陸の自然も日常に近い"], visaNote:"インドネシアの滞在制度は目的&#12539;期間&#12539;所得等で変わります&#12290;長期滞在を考える場合は最新の公式案内を確認してください&#12290;", fireNote:"自由度と理想生活は高いものの&#12289;生活インフラと移動の現実を受け入れられる人向けです&#12290;", bestFor:["南国","自然","海","ノマド"], tags:["南国","自然","外国人コミュニティ"], day:[["07:00","静かな時間に海か田園を眺める&#12290;"],["10:00","コワーキングで少しだけ仕事&#12290;"],["15:00","渋滞を避けて近所のカフェへ&#12290;"],["20:00","観光ではなく&#12289;暮らしの夜を味わう&#12290;"]] },
      { id:"taipei", country:"台湾", city:"台北", flag:"🇹🇼", region:"東アジア", regionTags:["asia","city"], cost:3, urban:5, quiet:3, sea:2, nature:3, warm:3, cool:3, humidity:3, healthcare:5, safety:5, english:3, languageBarrier:4, japaneseAccess:5, japanAccess:5, carFree:5, internationalAccess:5, excitement:5, expatCommunity:4, remoteWork:5, fireCostEfficiency:4, visaPracticality:3, themeScores:{asia:5,europe:1,island:2,far:1,city:5,north:2,ideal:4}, catchCopy:"海外は怖い&#12290;でも海外には住みたい&#12290;その答え&#12290;", lifestyle:"日本からの距離&#12289;食&#12289;交通&#12289;都市機能の安心感をかなり残しつつ&#12289;海外生活へ踏み出せる&#12290;初めての海外移住の妄想が現実に寄りやすい都市です&#12290;", goodPoints:["公共交通と車なし生活","食&#12539;医療&#12539;治安の安心感","日本への往復と都市の刺激"], cautions:["生活費は東南アジア最安ではない","湿気や暑さ&#12289;地震など現地特有の確認","長期滞在制度は個別に確認"], trivia:["夜市が生活の寄り道になる","電車と徒歩で一日の用事を組み立てやすい","日本食&#12539;日本文化への心理的距離が近い"], visaNote:"台湾の長期滞在&#12539;就労等の制度は目的や資格で変わります&#12290;滞在前に最新の公式情報を確認してください&#12290;", fireNote:"完全なコスト最優先ではないが&#12289;医療&#12539;移動&#12539;日本への近さを含めた総合点が高い候補です&#12290;", bestFor:["海外初心者","車なし","日本への近さ","都会"], tags:["初心者向け","交通","食"], day:[["08:30","駅近の朝ごはんから一日を開始&#12290;"],["11:00","用事は電車と徒歩でだいたい終わる&#12290;"],["18:00","夜市へ寄り道&#12290;帰宅時間だけは自由&#12290;"],["22:00","日本に近い安心感を残したまま眠る&#12290;"]] },
      { id:"kaohsiung", country:"台湾", city:"高雄", flag:"🇹🇼", region:"東アジア", regionTags:["asia","island"], cost:4, urban:4, quiet:4, sea:4, nature:3, warm:4, cool:2, humidity:3, healthcare:5, safety:5, english:3, languageBarrier:4, japaneseAccess:4, japanAccess:5, carFree:4, internationalAccess:4, excitement:3, expatCommunity:4, remoteWork:4, fireCostEfficiency:5, visaPracticality:3, themeScores:{asia:5,europe:1,island:3,far:1,city:4,north:1,ideal:4}, catchCopy:"台湾の便利さを&#12289;ちょっとゆっくり楽しむ&#12290;", lifestyle:"台北の便利さを残しながら&#12289;空の広さと海辺の気配を足した都市&#12290;都会が好きだけれど&#12289;毎日が競争のようなのは疲れる人へ&#12290;", goodPoints:["医療&#12539;交通&#12539;治安の安心感","台北よりゆったりした都市サイズ","海&#12539;食&#12539;コストのバランス"], cautions:["日本食や国際移動の選択肢は台北に劣る","暑さと湿気は南寄り","制度は最新情報と個人条件の確認が必要"], trivia:["都市機能と港町らしい風景を一緒に楽しめる","自転車や公共交通で生活を組み立てやすい","台北より&#12302;空白の時間&#12303;を作りやすい"], visaNote:"台湾の滞在制度は目的&#12539;年齢&#12539;仕事等により異なります&#12290;長期滞在を計画する場合は公式情報を確認してください&#12290;", fireNote:"高コスト都市を避けつつ&#12289;車なし&#12539;医療&#12539;日本への近さを妥協しにくいバランス型です&#12290;", bestFor:["バランス","車なし","医療","ゆっくり"], tags:["港町","便利","ゆっくり"], day:[["08:00","市場で朝ごはん&#12290;"],["11:00","街の用事を公共交通で済ませる&#12290;"],["17:00","港の風を感じながら散歩&#12290;"],["21:00","便利さを残したまま&#12289;予定を一つ減らす&#12290;"]] },
      { id:"cebu", country:"フィリピン", city:"セブ", flag:"🇵🇭", region:"東南アジア", regionTags:["asia","island"], cost:4, urban:3, quiet:3, sea:5, nature:3, warm:5, cool:1, humidity:2, healthcare:2, safety:2, english:5, languageBarrier:5, japaneseAccess:3, japanAccess:4, carFree:2, internationalAccess:4, excitement:4, expatCommunity:5, remoteWork:4, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:5,europe:1,island:5,far:2,city:3,north:1,ideal:5}, catchCopy:"英語も海も欲しい&#12290;ついでに冬も捨てよう&#12290;", lifestyle:"英語環境と海&#12289;南国の開放感&#12290;日本食や都市インフラを最優先しないなら&#12289;英語を使って世界に混ざる入口になり得ます&#12290;", goodPoints:["英語を使う機会が多い","海と南国の生活イメージ","外国人コミュニティに入りやすい"], cautions:["医療&#12539;治安&#12539;インフラはエリア差がある","車なし生活の快適さは要確認","長期滞在制度の条件を個別に確認"], trivia:["英語を使う日常を作りやすい","海辺と都市の距離が比較的近い","英語留学とFIRE生活の妄想がつながる"], visaNote:"フィリピンにはリタイアメント向け居住制度等がありますが&#12289;年齢&#12539;資産&#12539;家族構成などの条件があります&#12290;最新情報を確認してください&#12290;", fireNote:"英語と海の相性は強いが&#12289;医療&#12539;治安&#12539;移動をどこまで許容できるかで評価が分かれます&#12290;", bestFor:["英語","海","南国","外国人環境"], tags:["英語","海","南国"], day:[["07:30","英語の挨拶から一日が始まる&#12290;"],["11:00","オンラインの用事を片付ける&#12290;"],["16:00","海が見える場所で&#12289;仕事の終了を宣言&#12290;"],["21:00","冬がないことを少しだけ自慢する&#12290;"]] },
      { id:"singapore", country:"シンガポール", city:"シンガポール", flag:"🇸🇬", region:"東南アジア", regionTags:["asia","city"], cost:1, urban:5, quiet:3, sea:2, nature:3, warm:5, cool:1, humidity:2, healthcare:5, safety:5, english:5, languageBarrier:5, japaneseAccess:4, japanAccess:5, carFree:5, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:1, visaPracticality:2, themeScores:{asia:5,europe:1,island:2,far:1,city:5,north:1,ideal:5}, catchCopy:"最高に便利&#12290;FIRE民の財布以外には&#12290;", lifestyle:"英語&#12289;治安&#12289;医療&#12289;交通&#12289;世界への接続&#12290;理想の都市生活を高密度で実現しやすい一方&#12289;FIREの財布には正直な都市です&#12290;", goodPoints:["公共交通&#12539;治安&#12539;医療の強さ","英語と国際的な生活環境","アジア旅行のハブとしての便利さ"], cautions:["生活費と住居費は大きな壁","長期居住のハードルが高い","便利さにお金を払い続ける設計になりやすい"], trivia:["街の移動がかなりコンパクトにまとまる","食の選択肢が多民族で広い","空港から世界へ飛ぶ妄想がしやすい"], visaNote:"長期滞在&#12539;就労&#12539;家族帯同等のルートは個人条件と資格で異なります&#12290;住みたい気持ちだけで決めず&#12289;最新の公式情報を確認してください&#12290;", fireNote:"生活の不安を減らす力は高いが&#12289;FIRE資産を長持ちさせる目的ならハードモードです&#12290;", bestFor:["世界都市","英語","安全","便利さ"], tags:["超便利","英語","高コスト"], day:[["07:30","地下鉄で移動&#12290;時間通りに予定が進む&#12290;"],["12:00","ホーカーで昼食&#12290;"],["17:00","仕事の後&#12289;別の国へ飛べそうな気分になる&#12290;"],["22:00","便利さの請求書も一緒に確認する&#12290;"]] },
      { id:"lisbon", country:"ポルトガル", city:"リスボン", flag:"🇵🇹", region:"南欧", regionTags:["europe","city"], cost:2, urban:4, quiet:3, sea:4, nature:3, warm:4, cool:3, humidity:4, healthcare:4, safety:4, english:4, languageBarrier:3, japaneseAccess:3, japanAccess:2, carFree:4, internationalAccess:5, excitement:4, expatCommunity:5, remoteWork:4, fireCostEfficiency:2, visaPracticality:3, themeScores:{asia:1,europe:5,island:3,far:5,city:4,north:2,ideal:5}, catchCopy:"FIRE後くらい&#12289;ヨーロッパ映画みたいに暮らす&#12290;", lifestyle:"坂道&#12289;海&#12289;カフェ&#12289;国際的な空気&#12290;日本からの距離と近年の生活費上昇を引き受けてでも&#12289;欧州で暮らす夢を取りに行く候補です&#12290;", goodPoints:["街歩きと海のある生活","国際的で外国人コミュニティが厚い","欧州旅行の拠点にしやすい"], cautions:["生活費は以前のイメージだけで見ない","日本への帰国は距離と費用が壁","居住制度&#12539;税制は最新の公的情報を確認"], trivia:["坂道そのものが一日の運動になる","カフェ時間が予定として成立する","大西洋を見て&#12302;日本から遠い&#12303;を実感できる"], visaNote:"パッシブ収入等を前提とした居住制度が選択肢になる場合があります&#12290;個人条件&#12539;制度変更&#12539;税務を含めて最新情報を確認してください&#12290;", fireNote:"欧州生活の満足度を優先する人向け&#12290;コストと帰国距離を飲み込めるかが分かれ目です&#12290;", bestFor:["ヨーロッパ","海","街歩き","国際性"], tags:["欧州","坂道","カフェ"], day:[["09:00","窓を開け&#12289;坂道を見ながら朝のコーヒー&#12290;"],["12:00","徒歩でランチ&#12290;予定より遠くまで歩く&#12290;"],["16:00","次の国への航空券を眺める&#12290;"],["21:00","&#12302;会社より坂道の方がしんどい&#12303;と笑う&#12290;"]] },
      { id:"porto", country:"ポルトガル", city:"ポルト", flag:"🇵🇹", region:"南欧", regionTags:["europe","nature"], cost:3, urban:3, quiet:4, sea:3, nature:3, warm:3, cool:3, humidity:4, healthcare:4, safety:4, english:3, languageBarrier:3, japaneseAccess:2, japanAccess:2, carFree:4, internationalAccess:4, excitement:3, expatCommunity:4, remoteWork:4, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:1,europe:5,island:2,far:5,city:3,north:2,ideal:4}, catchCopy:"派手じゃなくていい&#12290;毎日の景色が良ければいい&#12290;", lifestyle:"大都市の勢いより&#12289;川と古い街並み&#12289;落ち着いた食卓&#12290;欧州の空気を吸いながら&#12289;生活の速度は少し落としたい人へ&#12290;", goodPoints:["街の美しさと落ち着き","車なしで街歩きしやすい","リスボンより生活の密度を下げやすい"], cautions:["冬の涼しさ&#12539;雨の好みが分かれる","日本への距離は遠い","制度や税務を生活費だけで判断しない"], trivia:["川沿いの散歩が日常の背景になる","観光の街でも住民の時間が流れている","食事を急がない練習ができる"], visaNote:"ポルトガルの居住制度を検討できる場合がありますが&#12289;要件&#12539;税制&#12539;申請手続きは変更されるため最新情報を確認してください&#12290;", fireNote:"派手な消費より余白を重視する人なら&#12289;欧州の理想とFIRE後の静けさを両立しやすい候補です&#12290;", bestFor:["落ち着き","欧州","街並み","車なし"], tags:["欧州","川","静か"], day:[["08:30","川の方へ歩いて朝食&#12290;"],["12:00","市場で食材を買い&#12289;昼はゆっくり&#12290;"],["16:00","坂道の途中のベンチで何もしない&#12290;"],["20:00","一日が短いのではなく&#12289;急いでいないだけ&#12290;"]] },
      { id:"valencia", country:"スペイン", city:"バレンシア", flag:"🇪🇸", region:"南欧", regionTags:["europe","island"], cost:3, urban:4, quiet:4, sea:5, nature:3, warm:5, cool:2, humidity:4, healthcare:4, safety:4, english:3, languageBarrier:2, japaneseAccess:2, japanAccess:2, carFree:4, internationalAccess:4, excitement:4, expatCommunity:4, remoteWork:4, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:1,europe:5,island:4,far:5,city:4,north:1,ideal:5}, catchCopy:"都会も海も捨てられない人の欲張りFIRE&#12290;", lifestyle:"海辺の散歩&#12289;都市の便利さ&#12289;温暖な空気&#12290;大都市ほど巨大でなく&#12289;田舎ほど静かすぎない&#12289;欲張りなFIRE生活を狙えます&#12290;", goodPoints:["海と都市機能の両立","比較的ゆったりした街のサイズ","街歩き&#12539;食&#12539;太陽の生活"], cautions:["現地語の壁は生活の場面で出る","日本への帰国距離は要計算","欧州の住居&#12539;制度&#12539;税務は個別確認"], trivia:["海辺と街の予定を同じ日に入れられる","食事を遅く楽しむリズムに慣れやすい","&#12302;都会かリゾートか&#12303;を選ばなくていい"], visaNote:"スペインの滞在&#12539;居住制度は目的&#12289;所得&#12289;資産&#12289;仕事等により異なります&#12290;制度の最新条件を公式情報で確認してください&#12290;", fireNote:"理想生活とFIRE効率のバランスが良い中間候補&#12290;便利さも海も欲しい人に強いです&#12290;", bestFor:["海","欧州","都市と自然","温暖"], tags:["海","欧州","バランス"], day:[["08:30","市場で朝食&#12290;"],["12:00","街の用事を片付け&#12289;午後は海側へ&#12290;"],["18:00","海辺の散歩で一日の仕事を切り替える&#12290;"],["22:00","都会とリゾートのどちらにも住んでいる気分&#12290;"]] },
      { id:"malaga", country:"スペイン", city:"マラガ", flag:"🇪🇸", region:"南欧", regionTags:["europe","island"], cost:3, urban:3, quiet:4, sea:5, nature:4, warm:5, cool:1, humidity:4, healthcare:4, safety:4, english:4, languageBarrier:3, japaneseAccess:2, japanAccess:2, carFree:3, internationalAccess:4, excitement:3, expatCommunity:5, remoteWork:4, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:1,europe:5,island:4,far:5,city:3,north:1,ideal:5}, catchCopy:"冬まで明るい場所に逃げたらええ&#12290;", lifestyle:"南欧の太陽&#12289;海&#12289;外国人コミュニティ&#12290;冬の暗さから逃げたいけれど&#12289;完全な島暮らしより街の機能も欲しい人へ&#12290;", goodPoints:["温暖さと海の生活","外国人環境があり適応の入口を作りやすい","街歩きとゆっくりした時間"], cautions:["繁忙期の混雑や住居費を確認","現地語を使う場面は残る","日本から遠く&#12289;医療&#12539;制度の調査が必要"], trivia:["冬でも光を生活の背景にしやすい","海と街の距離が近い","外国人の多い場所と地元の生活が共存する"], visaNote:"スペインの長期滞在ルートは目的&#12539;所得&#12539;資産&#12539;仕事等で異なります&#12290;最新制度と税務上の扱いを確認してください&#12290;", fireNote:"太陽と海を優先するなら魅力的&#12290;ただし帰国距離と制度の準備は軽くありません&#12290;", bestFor:["太陽","海","欧州","外国人環境"], tags:["南欧","海","太陽"], day:[["09:00","日差しのあるテラスで朝食&#12290;"],["13:00","暑さが強い日はゆっくり昼休み&#12290;"],["18:00","海沿いを歩いて&#12289;知らない人とも挨拶&#12290;"],["21:00","冬の日本の天気を見て少し笑う&#12290;"]] },
      { id:"canary", country:"スペイン", city:"カナリア諸島", flag:"🇪🇸", region:"大西洋", regionTags:["europe","island"], cost:3, urban:2, quiet:5, sea:5, nature:5, warm:5, cool:1, humidity:4, healthcare:3, safety:4, english:4, languageBarrier:4, japaneseAccess:1, japanAccess:1, carFree:2, internationalAccess:4, excitement:2, expatCommunity:5, remoteWork:3, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:1,europe:5,island:5,far:5,city:2,north:1,ideal:5}, catchCopy:"日本から逃げすぎたら&#12289;大西洋の島まで来ました&#12290;", lifestyle:"島&#12289;海&#12289;自然&#12289;温暖さ&#12290;日本への距離と都市の刺激を手放しても&#12289;世界の端でゆっくり暮らしたい人向けの本気の逃亡先です&#12290;", goodPoints:["海&#12539;自然&#12539;静けさ&#12539;温暖さ","欧州圏の島暮らし","外国人コミュニティとゆっくりした時間"], cautions:["日本からかなり遠い","都市機能&#12539;医療&#12539;移動の範囲は要確認","島暮らしに飽きないか試住推奨"], trivia:["大西洋の島で季節の変化をゆるく感じる","海と火山の景色が生活の一部になる","&#12302;ちょっと帰国&#12303;がちょっとではない"], visaNote:"スペインの居住制度を検討する場合がありますが&#12289;島で暮らす実務&#12539;制度&#12539;税務は個別に確認してください&#12290;", fireNote:"理想生活への相性は高いが&#12289;距離&#12539;医療&#12539;移動を含む現実度は慎重に見る候補です&#12290;", bestFor:["島","自然","静けさ","遠距離"], tags:["大西洋","島","本気の逃亡"], day:[["08:00","海と火山の景色を見ながら朝食&#12290;"],["11:00","必要な作業をまとめて片付ける&#12290;"],["16:00","島の別の景色を見に行く&#12290;"],["21:00","日本までの距離を地図で確認して眠る&#12290;"]] },
      { id:"malta", country:"マルタ", city:"マルタ", flag:"🇲🇹", region:"地中海", regionTags:["europe","island"], cost:2, urban:3, quiet:3, sea:5, nature:3, warm:5, cool:2, humidity:4, healthcare:4, safety:4, english:5, languageBarrier:5, japaneseAccess:3, japanAccess:2, carFree:4, internationalAccess:5, excitement:4, expatCommunity:5, remoteWork:5, fireCostEfficiency:2, visaPracticality:3, themeScores:{asia:1,europe:5,island:5,far:5,city:3,north:1,ideal:5}, catchCopy:"英語で暮らせる地中海という反則&#12290;", lifestyle:"英語&#12289;海&#12289;欧州&#12289;国際的な小さな島&#12290;海外生活の言語ハードルは下げつつ&#12289;日本ではない日常へ飛び込みたい人に向いています&#12290;", goodPoints:["英語環境と海の組み合わせ","欧州の小国で国際的な暮らし","車なし生活を作れるエリアもある"], cautions:["島の住居費や混雑は確認","日本との距離と帰国コスト","長期滞在制度と税務は個別確認"], trivia:["英語を生活のベースにしやすい","海が&#12302;遠出&#12303;ではなく背景になる","島のサイズ感で人間関係が近くなりやすい"], visaNote:"マルタの長期滞在制度は所得&#12539;資産&#12539;住居等の条件が関係します&#12290;最新制度と専門家の案内を確認してください&#12290;", fireNote:"英語と理想の海暮らしを両立しやすい一方&#12289;島の生活費と制度の確認が必要です&#12290;", bestFor:["英語","海","欧州","島"], tags:["英語","地中海","国際性"], day:[["08:30","海が見える場所で英語のニュースを読む&#12290;"],["12:00","小さな街を歩いて用事を済ませる&#12290;"],["17:00","海沿いで一日の終わりを決める&#12290;"],["21:00","明日は別の島へ行くか&#12289;同じ島で休むか&#12290;"]] },
      { id:"split", country:"クロアチア", city:"スプリト", flag:"🇭🇷", region:"地中海", regionTags:["europe","island"], cost:3, urban:3, quiet:4, sea:5, nature:4, warm:4, cool:3, humidity:4, healthcare:4, safety:4, english:4, languageBarrier:3, japaneseAccess:1, japanAccess:2, carFree:3, internationalAccess:4, excitement:4, expatCommunity:4, remoteWork:3, fireCostEfficiency:3, visaPracticality:3, themeScores:{asia:1,europe:5,island:4,far:5,city:3,north:2,ideal:5}, catchCopy:"FIRE後の散歩道が世界遺産級&#12290;", lifestyle:"アドリア海&#12289;歴史ある街&#12289;街歩き&#12290;海辺の理想を取りながら&#12289;南欧ほど定番ではない場所へ行く冒険心も満たせます&#12290;", goodPoints:["海と歴史的な街歩き","自然と都市のスケールが近い","英語を使う観光&#12539;国際環境"], cautions:["観光シーズンの混雑&#12539;価格差","日本からの距離と乗継ぎ","長期滞在制度&#12539;医療の最新確認"], trivia:["旧市街が日々の散歩コースになる","海と山の景色を一日で切り替えられる","夏とそれ以外で街の顔が変わる"], visaNote:"クロアチアでの長期滞在ルートは目的&#12539;資産&#12539;仕事等で異なります&#12290;最新の公式条件を確認してください&#12290;", fireNote:"海と欧州の非日常感は強いが&#12289;季節差と距離を受け入れる人向けです&#12290;", bestFor:["海","欧州","歴史","散歩"], tags:["アドリア海","街歩き","欧州"], day:[["08:00","石畳を歩いて朝の市場へ&#12290;"],["12:00","海の見える場所でランチ&#12290;"],["17:00","観光客が少なくなる時間に旧市街を散歩&#12290;"],["21:00","仕事を辞めた理由を景色に説明してもらう&#12290;"]] },
      { id:"tallinn", country:"エストニア", city:"タリン", flag:"🇪🇪", region:"北欧&#12539;バルト", regionTags:["europe","north"], cost:2, urban:3, quiet:4, sea:2, nature:4, warm:1, cool:5, humidity:5, healthcare:5, safety:5, english:5, languageBarrier:4, japaneseAccess:1, japanAccess:2, carFree:5, internationalAccess:5, excitement:3, expatCommunity:4, remoteWork:5, fireCostEfficiency:2, visaPracticality:3, themeScores:{asia:1,europe:5,island:2,far:5,city:3,north:5,ideal:4}, catchCopy:"南国FIREだけがFIREじゃない&#12290;", lifestyle:"デジタル&#12289;コンパクト&#12289;旧市街&#12289;涼しい空気&#12290;暑さから逃げ&#12289;静かな街でネットと散歩を軸にFIREしたい人へ&#12290;", goodPoints:["英語&#12539;デジタル&#12539;車なし生活","静けさと美しい旧市街","涼しさ&#12539;自然&#12539;リモート適性"], cautions:["冬の寒さと暗さは要体験","日本食&#12539;帰国距離&#12539;生活費を確認","長期滞在制度は個別の条件が必要"], trivia:["街のサイズがコンパクトで歩きやすい","デジタルな暮らしと旧市街が同居する","南国と逆方向へ逃げるFIREもできる"], visaNote:"エストニアの滞在制度は就労&#12539;リモート&#12539;資産等の条件で異なります&#12290;制度変更を含めて公式情報を確認してください&#12290;", fireNote:"涼しさ&#12539;車なし&#12539;リモートを重視する人には刺さるが&#12289;冬との相性が結果を左右します&#12290;", bestFor:["涼しさ","英語","車なし","デジタル"], tags:["北欧寄り","涼しい","デジタル"], day:[["08:30","静かな旧市街を歩いてコーヒー&#12290;"],["11:00","オンラインの仕事を短時間で片付ける&#12290;"],["16:00","空気が冷える前に散歩&#12290;"],["20:00","南国の写真を見ながら&#12289;寒い方が好きだと確認&#12290;"]] },
      { id:"tbilisi", country:"ジョージア", city:"トビリシ", flag:"🇬🇪", region:"コーカサス", regionTags:["europe","far"], cost:5, urban:4, quiet:3, sea:1, nature:3, warm:3, cool:3, humidity:4, healthcare:3, safety:3, english:3, languageBarrier:2, japaneseAccess:1, japanAccess:2, carFree:3, internationalAccess:4, excitement:4, expatCommunity:4, remoteWork:5, fireCostEfficiency:4, visaPracticality:4, themeScores:{asia:3,europe:3,island:1,far:5,city:4,north:2,ideal:5,adventure:5}, catchCopy:"普通の海外移住では物足りなくなった人へ&#12290;", lifestyle:"欧州とアジアの境界のような空気&#12289;食&#12289;独特の文化&#12290;便利さの正解より&#12289;知らない場所に住む面白さを取りに行く候補です&#12290;", goodPoints:["比較的コストを抑えた都市生活","食と文化の独自性","リモートワークと冒険感"], cautions:["言語&#12539;医療&#12539;制度の調査は厚めに","日本からの距離と乗継ぎ","政治&#12539;地域情勢を含む最新情報の確認"], trivia:["ワインや食卓が生活の中心になりやすい","街の表情がエリアで変わる","&#12302;海外に住んでいる感&#12303;が毎日ある"], visaNote:"ジョージアの滞在制度は期間&#12539;仕事&#12539;国籍等によって扱いが変わります&#12290;最新の入国&#12539;滞在情報を必ず確認してください&#12290;", fireNote:"コストと冒険心には強いが&#12289;安心&#12539;日本食&#12539;医療を最優先する人には準備が必要です&#12290;", bestFor:["冒険","コスト","文化","ノマド"], tags:["冒険","文化","コーカサス"], day:[["09:00","近所のパン屋で朝食&#12290;"],["12:00","カフェでネットの仕事を片付ける&#12290;"],["17:00","知らない路地を一つだけ歩く&#12290;"],["22:00","今日も日本から遠い場所で暮らしている&#12290;"]] },
      { id:"dubai", country:"UAE", city:"ドバイ", flag:"🇦🇪", region:"中東", regionTags:["city","far"], cost:2, urban:5, quiet:2, sea:3, nature:1, warm:5, cool:1, humidity:3, healthcare:5, safety:5, english:5, languageBarrier:5, japaneseAccess:4, japanAccess:4, carFree:3, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:2, visaPracticality:2, themeScores:{asia:3,europe:3,island:2,far:5,city:5,north:1,ideal:5}, catchCopy:"節約FIRE&#65311;知らん&#12290;世界の中心で生きる&#12290;", lifestyle:"英語&#12289;国際都市&#12289;空港&#12289;ビジネス&#12289;圧倒的なスケール&#12290;安く自由になるより&#12289;世界の中心で刺激を選ぶFIREの候補です&#12290;", goodPoints:["英語と外国人コミュニティ","空港&#12539;国際移動&#12539;都市の刺激","医療&#12539;治安&#12539;サービスの選択肢"], cautions:["暑さと住居費は大きい","節約FIREの設計には向きにくい","滞在制度&#12539;仕事&#12539;税務の条件を確認"], trivia:["街そのものが&#12302;世界の途中&#12303;にある","空港を使った生活設計がしやすい","屋内の快適さと屋外の暑さの差が大きい"], visaNote:"UAEの滞在ルートは就労&#12539;事業&#12539;資産&#12539;リモート等で異なります&#12290;個人条件と最新の公式情報を確認してください&#12290;", fireNote:"FIRE資産の効率より&#12289;国際都市での理想と仕事の余地を優先する人向けです&#12290;", bestFor:["世界都市","英語","刺激","国際移動"], tags:["国際都市","英語","高コスト"], day:[["08:00","英語のメールを確認し&#12289;今日の移動を決める&#12290;"],["12:00","屋内の快適な場所でランチ&#12290;"],["18:00","夕方から街の光が本気になる&#12290;"],["23:00","FIREしたのに&#12289;まだ世界の中心にいる&#12290;"]] },
      { id:"mauritius", country:"モーリシャス", city:"モーリシャス", flag:"🇲🇺", region:"インド洋", regionTags:["island","far"], cost:3, urban:2, quiet:5, sea:5, nature:5, warm:5, cool:1, humidity:3, healthcare:3, safety:4, english:4, languageBarrier:4, japaneseAccess:2, japanAccess:1, carFree:2, internationalAccess:3, excitement:2, expatCommunity:5, remoteWork:4, fireCostEfficiency:3, visaPracticality:4, themeScores:{asia:2,europe:3,island:5,far:5,city:2,north:1,ideal:5}, catchCopy:"会社を辞めたら&#12289;インド洋まで逃げてもいい&#12290;", lifestyle:"海&#12289;自然&#12289;温暖さ&#12289;島の余白&#12290;日本からの距離と都市の小ささを引き受けて&#12289;地球の端で毎日をゆるめたい人向けです&#12290;", goodPoints:["海&#12539;自然&#12539;温暖な暮らし","英語&#12539;フランス語を含む国際環境","長期滞在制度を検討できる場合"], cautions:["日本への帰国は簡単ではない","医療&#12539;買い物&#12539;交通の範囲を確認","島暮らしの距離感が合うか試住推奨"], trivia:["海が&#12302;予定&#12303;ではなく生活の背景になる","島の自然を日課に取り込みやすい","遠くへ逃げた実感が毎日ある"], visaNote:"モーリシャスには長期滞在制度が選択肢になる場合があります&#12290;所得&#12539;資産&#12539;仕事&#12539;滞在目的等の最新条件を確認してください&#12290;", fireNote:"理想の余白と移住現実度を両立しやすい一方&#12289;距離と島の医療&#12539;物流を受け入れる必要があります&#12290;", bestFor:["島","海","静けさ","遠距離"], tags:["インド洋","島","静か"], day:[["07:00","海の色を見てから一日を始める&#12290;"],["10:00","必要な仕事だけオンラインで片付ける&#12290;"],["16:00","自然の中を歩く&#12290;"],["21:00","日本から遠いことを&#12289;今日は長所として数える&#12290;"]] },
      { id:"gold-coast", country:"オーストラリア", city:"ゴールドコースト", flag:"🇦🇺", region:"オセアニア", regionTags:["island","far"], cost:2, urban:3, quiet:4, sea:5, nature:4, warm:4, cool:2, humidity:4, healthcare:5, safety:5, english:5, languageBarrier:5, japaneseAccess:2, japanAccess:2, carFree:3, internationalAccess:4, excitement:4, expatCommunity:5, remoteWork:4, fireCostEfficiency:2, visaPracticality:2, themeScores:{asia:1,europe:2,island:5,far:5,city:3,north:2,ideal:5}, catchCopy:"サーフィンしてたら一日が終わる&#12290;それでいい&#12290;", lifestyle:"英語&#12289;海&#12289;アウトドア&#12289;温暖な空気&#12290;自由時間をスポーツと自然に使う&#12289;明るいFIRE生活を想像する人へ&#12290;", goodPoints:["海とアウトドアが日常に近い","英語&#12539;医療&#12539;治安の安心感","都市とリゾートの中間"], cautions:["生活費&#12539;住居費がFIRE資産に効く","車の必要性はエリアで変わる","ビザと就労条件の確認が必要"], trivia:["サーフィンが&#12302;旅行の目的&#12303;から&#12302;朝の習慣&#12303;になる","海と街の両方を一日に入れやすい","英語を使う生活が自然に増える"], visaNote:"オーストラリアの滞在制度は年齢&#12539;仕事&#12539;資産&#12539;資格等により異なります&#12290;長期滞在を前提に最新の公式情報を確認してください&#12290;", fireNote:"生活の理想は高いが&#12289;コストとビザが壁&#12290;資産に余裕がある理想優先派向けです&#12290;", bestFor:["海","英語","自然","スポーツ"], tags:["サーフィン","海","英語"], day:[["06:30","海のコンディションを確認して散歩&#12290;"],["10:00","必要なら少しだけ仕事&#12290;"],["15:00","サーフィンか海辺の昼寝&#12290;"],["20:00","一日が短いのではなく&#12289;満足度が高い&#12290;"]] },
      { id:"sydney", country:"オーストラリア", city:"シドニー", flag:"🇦🇺", region:"オセアニア", regionTags:["city","far"], cost:1, urban:5, quiet:3, sea:5, nature:4, warm:3, cool:3, humidity:4, healthcare:5, safety:5, english:5, languageBarrier:5, japaneseAccess:3, japanAccess:2, carFree:5, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:1, visaPracticality:2, themeScores:{asia:1,europe:2,island:3,far:5,city:5,north:2,ideal:5}, catchCopy:"資産に余裕があるなら&#12289;FIRE先まで妥協しない&#12290;", lifestyle:"世界都市&#12289;海&#12289;英語&#12289;医療&#12289;生活環境&#12290;FIRE後に&#12302;一番住みたい場所&#12303;を取りにいく理想優先型の都市です&#12290;", goodPoints:["都市&#12539;海&#12539;自然&#12539;英語の総合力","公共交通と国際的な暮らし","医療&#12539;治安&#12539;仕事の選択肢"], cautions:["生活費&#12539;家賃が非常に重い","長期滞在のハードルがある","日本への距離と帰国コストを計算"], trivia:["都市生活と海辺の一日を両立できる","多文化環境で世界中の人と出会える","&#12302;自由になったから一番好きな街へ&#12303;が似合う"], visaNote:"オーストラリアの長期滞在ルートは目的&#12539;年齢&#12539;仕事&#12539;資産等により異なります&#12290;制度の最新条件を公式情報で確認してください&#12290;", fireNote:"FIRE資産を守る効率は高くないが&#12289;理想の暮らしへの相性を最優先するなら納得感があります&#12290;", bestFor:["世界都市","海","英語","理想優先"], tags:["世界都市","海","高コスト"], day:[["08:00","海と高層ビルを見ながら朝食&#12290;"],["12:00","仕事をするなら&#12289;終わる時間を先に決める&#12290;"],["18:00","街のイベントか海辺の散歩&#12290;"],["22:00","財布以外は&#12289;かなり自由&#12290;"]] },
      { id:"honolulu", country:"アメリカ", city:"ホノルル", flag:"🇺🇸", region:"太平洋", regionTags:["island","far"], cost:1, urban:4, quiet:4, sea:5, nature:4, warm:5, cool:1, humidity:4, healthcare:4, safety:4, english:4, languageBarrier:5, japaneseAccess:5, japanAccess:3, carFree:3, internationalAccess:4, excitement:4, expatCommunity:5, remoteWork:4, fireCostEfficiency:1, visaPracticality:1, themeScores:{asia:2,europe:1,island:5,far:4,city:4,north:1,ideal:5}, catchCopy:"理想は満点&#12290;財布との相性は知らん&#12290;", lifestyle:"海&#12289;気候&#12289;日本食&#12289;日本語サービス&#12289;太平洋の開放感&#12290;海外初心者にも妄想しやすい理想郷ですが&#12289;&#12302;住めるか&#12303;と&#12302;好きか&#12303;は別問題です&#12290;", goodPoints:["海と気候の理想度","日本食&#12539;日本語へのアクセス","島の中に都市機能がある"], cautions:["FIRE資産を守る場所としてハードモード","好きだからそのまま長期滞在はできない","島暮らしが長期的に合うか試住推奨"], trivia:["日本語や日本食に出会いやすい海外都市","ビーチが日常生活のすぐ横にある","問題はだいたい物価と長期滞在"], visaNote:"米国への長期滞在&#12539;居住は目的や資格に応じた制度確認が必要です&#12290;ビザ取得を前提にせず&#12289;最新の公式情報を確認してください&#12290;", fireNote:"理想生活との相性は非常に高いが&#12289;生活費と移住現実度は別軸で厳しく評価する候補です&#12290;", bestFor:["海","日本食","海外初心者","理想優先"], tags:["海","日本語","高コスト"], day:[["07:00","海を見てから一日を始める&#12290;"],["11:00","日本食かローカルか&#12289;選べることがうれしい&#12290;"],["16:00","仕事を終えてビーチへ&#12290;"],["21:00","理想は満点&#12289;財布は少し無言&#12290;"]] },
      { id:"vancouver", country:"カナダ", city:"バンクーバー", flag:"🇨🇦", region:"北米", regionTags:["city","north"], cost:1, urban:4, quiet:4, sea:3, nature:5, warm:1, cool:5, humidity:5, healthcare:5, safety:4, english:5, languageBarrier:5, japaneseAccess:3, japanAccess:2, carFree:5, internationalAccess:5, excitement:4, expatCommunity:5, remoteWork:5, fireCostEfficiency:1, visaPracticality:2, themeScores:{asia:1,europe:2,island:3,far:5,city:4,north:5,ideal:5}, catchCopy:"都会を出たら山&#12290;反対側には海&#12290;ズルい&#12290;", lifestyle:"多文化都市&#12289;英語&#12289;山&#12289;海&#12289;アウトドア&#12290;涼しい気候と自然を優先しながら&#12289;完全な田舎には行きたくない人に刺さります&#12290;", goodPoints:["自然&#12539;都市&#12539;英語のバランス","車なし生活と国際環境","医療&#12539;治安&#12539;外国人コミュニティ"], cautions:["住居費と生活費が高い","冬&#12539;雨&#12539;日照の好みを要確認","長期滞在の制度と医療の現実を確認"], trivia:["山と海が都市の日常背景になる","多文化な食&#12539;人&#12539;言語が混ざる","アウトドアを&#12302;旅行&#12303;から&#12302;習慣&#12303;へ変えやすい"], visaNote:"カナダの滞在&#12539;居住ルートは年齢&#12539;職歴&#12539;資格&#12539;資産等で変わります&#12290;最新の公的情報で適格性を確認してください&#12290;", fireNote:"自然と都市の理想は強いが&#12289;高コストのためFIRE効率より暮らしの質を優先する人向けです&#12290;", bestFor:["自然","涼しさ","英語","都市と山"], tags:["山","英語","北米"], day:[["08:00","山の天気を確認してコーヒー&#12290;"],["11:00","街のカフェで仕事&#12290;"],["17:00","仕事終わりに海かトレイルへ&#12290;"],["21:00","都会にいるのに&#12289;自然の音が残っている&#12290;"]] },
      { id:"mexico-city", country:"メキシコ", city:"メキシコシティ", flag:"🇲🇽", region:"中南米", regionTags:["city","far"], cost:4, urban:5, quiet:2, sea:1, nature:2, warm:3, cool:3, humidity:4, healthcare:3, safety:2, english:3, languageBarrier:2, japaneseAccess:2, japanAccess:1, carFree:4, internationalAccess:5, excitement:5, expatCommunity:4, remoteWork:4, fireCostEfficiency:4, visaPracticality:4, themeScores:{asia:1,europe:2,island:1,far:5,city:5,north:2,ideal:5,adventure:5}, catchCopy:"FIRE後まで無難な人生で終わらせない&#12290;", lifestyle:"巨大都市の食&#12289;文化&#12289;刺激&#12289;標高のある空気&#12290;日本から遠くても&#12289;人生の背景を大きく変えたい人の冒険型FIREです&#12290;", goodPoints:["比較的コストを調整しやすい","巨大都市の食&#12539;文化&#12539;刺激","外国人環境とリモートワーク"], cautions:["治安はエリア差を強く意識","日本食&#12539;帰国距離&#12539;医療を確認","言語適応と現地の生活情報が必要"], trivia:["地区ごとに街の顔がまるで違う","食と文化が日常を強く彩る","日本から遠い分&#12289;生活の変化を実感しやすい"], visaNote:"メキシコの長期滞在制度は所得&#12539;資産&#12539;滞在目的等により扱いが異なります&#12290;最新の公式情報を確認してください&#12290;", fireNote:"コストと刺激のバランスは魅力だが&#12289;治安&#12539;言語&#12539;距離を含めて冒険できる人向けです&#12290;", bestFor:["冒険","巨大都市","食","遠距離"], tags:["冒険","大都市","食"], day:[["08:00","街の音と香りで目を覚ます&#12290;"],["12:00","市場かカフェでランチ&#12290;"],["18:00","安全なルートを選んで文化に触れる&#12290;"],["22:00","日本から遠い場所で&#12289;人生の別ルートを実感&#12290;"]] },
      { id:"london", country:"イギリス", city:"ロンドン", flag:"🇬🇧", region:"西欧", regionTags:["europe","city"], cost:1, urban:5, quiet:2, sea:1, nature:2, warm:2, cool:4, humidity:5, healthcare:5, safety:4, english:5, languageBarrier:5, japaneseAccess:4, japanAccess:1, carFree:5, internationalAccess:5, excitement:5, expatCommunity:5, remoteWork:5, fireCostEfficiency:1, visaPracticality:2, themeScores:{asia:1,europe:5,island:2,far:5,city:5,north:4,ideal:5}, catchCopy:"FIREしたのに世界一忙しそうな場所へ行く人&#12290;", lifestyle:"英語&#12289;文化&#12289;世界都市&#12289;刺激&#12290;会社の忙しさは捨てたのに&#12289;都市の誘惑は捨てられない人のための理想優先候補です&#12290;", goodPoints:["世界都市の文化&#12539;交通&#12539;英語","日本食&#12539;外国人環境&#12539;仕事の選択肢","車なし生活と国際旅行"], cautions:["生活費と住居費が非常に高い","長期居住のハードルがある","日本への距離&#12539;天気&#12539;税務を確認"], trivia:["一人でも一生かけて遊べる文化の密度","地下鉄で都市の層を移動できる","FIRE後の刺激が不足する心配は少ない"], visaNote:"英国の長期滞在&#12539;居住制度は目的&#12539;仕事&#12539;資産等によって異なります&#12290;最新の公的情報と専門家の案内を確認してください&#12290;", fireNote:"FIRE効率は低いが&#12289;文化&#12539;英語&#12539;刺激のために資産を使う理想優先型なら納得感があります&#12290;", bestFor:["世界都市","英語","欧州","刺激"], tags:["世界都市","英語","文化"], day:[["08:30","地下鉄で街のどこかへ&#12290;"],["12:00","美術館かカフェ&#12289;仕事は少しだけ&#12290;"],["18:00","観劇かパブか&#12289;文化の誘惑に負ける&#12290;"],["23:00","会社より街の方が忙しいことに気づく&#12290;"]] },
      { id:"auckland", country:"ニュージーランド", city:"オークランド", flag:"🇳🇿", region:"オセアニア", regionTags:["island","far"], cost:1, urban:3, quiet:4, sea:4, nature:5, warm:3, cool:3, humidity:5, healthcare:5, safety:5, english:5, languageBarrier:5, japaneseAccess:2, japanAccess:2, carFree:4, internationalAccess:4, excitement:3, expatCommunity:5, remoteWork:4, fireCostEfficiency:2, visaPracticality:2, themeScores:{asia:1,europe:2,island:4,far:5,city:3,north:2,ideal:4}, catchCopy:"都会を捨てすぎず&#12289;忙しさだけ捨てる&#12290;", lifestyle:"英語&#12289;海&#12289;自然&#12289;ゆっくりした都市生活&#12290;大都会ほど刺激はいらないが&#12289;買い物&#12539;医療&#12539;カフェは欲しい人の現実的な遠距離候補です&#12290;", goodPoints:["自然&#12539;海&#12539;英語&#12539;安心感","都市とアウトドアの距離","外国人コミュニティと穏やかなペース"], cautions:["生活費&#12539;住居費&#12539;距離が壁","季節と天気の確認","ビザ&#12539;医療&#12539;帰国計画を個別に設計"], trivia:["海と自然を週末だけにしなくていい","街の忙しさを少し下げた生活を作れる","日本から遠いが&#12289;遠いからこそ切り替わる"], visaNote:"ニュージーランドの滞在&#12539;居住ルートは年齢&#12539;仕事&#12539;資格&#12539;資産等により異なります&#12290;最新の公式情報を確認してください&#12290;", fireNote:"自然と英語の理想は高いが&#12289;コスト&#12539;距離&#12539;ビザを含む本格的な海外FIREになります&#12290;", bestFor:["自然","英語","海","安心感"], tags:["自然","英語","遠距離"], day:[["08:00","海か公園へ散歩&#12290;"],["11:00","街のカフェで必要な仕事だけ&#12290;"],["16:00","少し遠くまで自然を見に行く&#12290;"],["21:00","忙しさだけを置いてきた感覚で眠る&#12290;"]] }
    ];

    var TYPE_DEFINITIONS = {
      asia: { icon:"🍜", name:"アジア快適FIRE型", description:"海外には住みたい&#12290;でも日本食も便利さも&#12289;できれば捨てたくない&#12290;&#12302;不便も楽しめ&#12303;と言われても&#12289;便利な方がええやん&#12289;という現実派です&#12290;", oneLiner:"海外に住みたい&#12290;でも不便は嫌&#12290;", tags:["アジア","便利","食"] },
      tropical: { icon:"🌴", name:"南国逃亡型", description:"冬&#12539;寒さ&#12539;会社の空気からまとめて逃げたいタイプ&#12290;海と太陽があれば&#12289;FIRE後の予定はあとから考えます&#12290;", oneLiner:"FIREしたら&#12289;まず冬から退職する人&#12290;", tags:["南国","海","太陽"] },
      cost: { icon:"💰", name:"コスパFIRE型", description:"国境を越えることに抵抗がなく&#12289;FIRE資産の寿命を一日でも伸ばしたいタイプ&#12290;便利さとの落としどころも冷静に探します&#12290;", oneLiner:"生活費を下げるためなら&#12289;国境くらい普通に越える人&#12290;", tags:["コスパ","資産","現実派"] },
      europe: { icon:"🇪🇺", name:"ヨーロッパ憧れ型", description:"せっかく自由になったなら&#12289;毎日の景色も変えたいタイプ&#12290;街歩き&#12289;カフェ&#12289;歴史&#12289;海を生活の背景にします&#12290;", oneLiner:"FIRE後くらい&#12289;毎日を映画のロケ地にしたい人&#12290;", tags:["欧州","街歩き","景色"] },
      far: { icon:"🌎", name:"地球の裏側上等型", description:"帰国のしやすさより&#12289;人生の背景を変えることを優先するタイプ&#12290;遠さを不便ではなく&#12289;自由の証明として楽しみます&#12290;", oneLiner:"自由になった結果&#12289;日本から9,000kmくらい離れようとしている人&#12290;", tags:["遠距離","冒険","別人生"] },
      worldcity: { icon:"🏙", name:"世界都市FIRE型", description:"会社は辞めても&#12289;都市の刺激&#12539;食&#12539;文化&#12539;人の多さは手放さないタイプ&#12290;FIRE後も暇を持て余す予定はありません&#12290;", oneLiner:"都会が嫌なのではなく&#12289;会社だけが嫌だった人&#12290;", tags:["都会","刺激","文化"] },
      resort: { icon:"🏝", name:"一生リゾート型", description:"海と自然を旅行の予定にせず&#12289;生活の背景にしたいタイプ&#12290;毎日が休日でも飽きないかどうかが&#12289;次の検討事項です&#12290;", oneLiner:"資産より&#12289;海を見ながら飲むコーヒーを信用している人&#12290;", tags:["海","島","自然"] },
      quiet: { icon:"🦥", name:"何もしない海外FIRE型", description:"何もしない時間を人生の主役にしたいタイプ&#12290;街の大きさより&#12289;予定の少なさと心の静けさを選びます&#12290;", oneLiner:"予定がない日を&#12289;最高の予定として扱う人&#12290;", tags:["静けさ","余白","ゆっくり"] },
      japan: { icon:"&#9992;&#65039;", name:"日本すぐ帰る型", description:"海外に住みたい気持ちと&#12289;日本の食&#12539;医療&#12539;家族への未練を両立するタイプ&#12290;距離の近さは&#12289;自由を守るインフラです&#12290;", oneLiner:"海外に行くけど&#12289;日本にもすぐ帰る人&#12290;", tags:["近距離","日本食","安心"] },
      adventure: { icon:"🧳", name:"冒険家FIRE型", description:"住みやすさの正解より&#12289;まだ知らない場所で暮らす面白さを優先するタイプ&#12290;多少の言語や制度の壁も&#12289;旅の続きとして受け止めます&#12290;", oneLiner:"無難な老後より&#12289;知らない街の朝食を選ぶ人&#12290;", tags:["冒険","文化","未知"] },
      remote: { icon:"💻", name:"ノマドFIRE型", description:"完全に仕事を捨てるより&#12289;場所と時間を自分で選べる働き方を残したいタイプ&#12290;通信環境とカフェが第二のオフィスです&#12290;", oneLiner:"会社は辞める&#12290;でもWi-Fiとは別れない人&#12290;", tags:["リモート","自由","仕事"] },
      safety: { icon:"🛡", name:"安心最優先FIRE型", description:"自由は&#12289;毎日の不安を減らしてこそ味わえると考えるタイプ&#12290;医療&#12539;治安&#12539;交通を&#12289;妥協ではなく生活の土台として見ます&#12290;", oneLiner:"夢を見る前に&#12289;病院と帰りの交通を確認する人&#12290;", tags:["医療","治安","堅実"] },
      cool: { icon:"&#10052;&#65039;", name:"涼風FIRE型", description:"南国だけが海外FIREではありません&#12290;暑さと湿気から距離を置き&#12289;涼しい空気の中で集中と余白を取り戻したいタイプです&#12290;", oneLiner:"FIREしたら&#12289;冬ではなく夏の方を退職する人&#12290;", tags:["涼しさ","自然","静けさ"] },
      balanced: { icon:"🌏", name:"バランスFIRE型", description:"理想だけでも&#12289;コストだけでも決めないタイプ&#12290;日本への距離&#12289;生活の便利さ&#12289;自然&#12289;移住の現実性を一つずつ見比べます&#12290;", oneLiner:"夢も見るし&#12289;スプレッドシートも開く人&#12290;", tags:["バランス","現実","選択肢"] }
    };

    var root = document.getElementById("world-iju-guide-app");
    var main = document.getElementById("wigu-main");
    var state = { answers: [], questionIndex: 0, result: null, timer: null };

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function round(value) {
      return Math.round(value);
    }

    function decodeHtmlEntities(value) {
      var text = String(value == null ? "" : value);
      for (var pass = 0; pass < 2; pass += 1) {
        text = text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, function (entity, token) {
          var lower = token.toLowerCase();
          if (lower === "amp") return "&";
          if (lower === "lt") return "<";
          if (lower === "gt") return ">";
          if (lower === "quot") return "\"";
          if (lower === "apos") return "'";
          if (lower === "nbsp") return " ";
          var code = lower.charAt(1) === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
          return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
        });
      }
      return text;
    }

    function stripEmoji(value) {
      return String(value == null ? "" : value)
        .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}]/gu, "")
        .replace(/[\uFE0E\uFE0F\u200D\u20E3]/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
    }

    function cleanDisplayText(value) {
      return stripEmoji(decodeHtmlEntities(value));
    }

    function escapeHtml(value) {
      return cleanDisplayText(value).replace(/[&<>"']/g, function (character) {
        return { "&":"\u0026amp;", "<":"\u0026lt;", ">":"\u0026gt;", "\"":"\u0026quot;", "'":"\u0026#39;" }[character];
      });
    }

    function clearTimer() {
      if (state.timer) {
        window.clearTimeout(state.timer);
        state.timer = null;
      }
    }

    function readSavedProgress() {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var saved = JSON.parse(raw);
        if (!saved || !Array.isArray(saved.answers)) return null;
        if (saved.answers.length >= questions.length) return null;
        if (saved.answers.some(function (answer) { return answer !== null && (answer < 0 || answer > 2); })) return null;
        return saved;
      } catch (error) {
        return null;
      }
    }

    function saveProgress() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          answers: state.answers,
          questionIndex: state.questionIndex
        }));
      } catch (error) {}
    }

    function clearProgress() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {}
    }

    function axisValue(destination, axis) {
      return Number(destination[axis] || 3);
    }

    function calculatePreferences(answerIndexes) {
      var sums = {};
      var weights = {};
      var themeSums = {};
      var themeWeights = {};
      AXES.forEach(function (axis) {
        sums[axis.key] = 0;
        weights[axis.key] = 0;
      });
      answerIndexes.forEach(function (answerIndex, questionIndex) {
        var selected = questions[questionIndex] && questions[questionIndex].answers[answerIndex];
        if (!selected) return;
        selected.effects.forEach(function (effect) {
          var key = effect[0];
          var desired = effect[1];
          var weight = effect[2];
          sums[key] += desired * weight;
          weights[key] += weight;
        });
        selected.themes.forEach(function (theme) {
          var key = theme[0];
          var desired = theme[1];
          var weight = theme[2];
          themeSums[key] = (themeSums[key] || 0) + desired * weight;
          themeWeights[key] = (themeWeights[key] || 0) + weight;
        });
      });
      var prefs = {};
      AXES.forEach(function (axis) {
        prefs[axis.key] = {
          target: weights[axis.key] ? sums[axis.key] / weights[axis.key] : 3,
          weight: weights[axis.key],
          importance: clamp(weights[axis.key] / 9, 0, 1)
        };
      });
      var themes = {};
      Object.keys(themeSums).forEach(function (key) {
        themes[key] = {
          target: themeWeights[key] ? themeSums[key] / themeWeights[key] : 3,
          weight: themeWeights[key]
        };
      });
      return { axes: prefs, themes: themes };
    }

    function weightedSimilarity(destination, prefs, keys) {
      var total = 0;
      var weightTotal = 0;
      keys.forEach(function (key) {
        var preference = prefs.axes[key];
        if (!preference || !preference.weight) return;
        var similarity = 1 - Math.abs(axisValue(destination, key) - preference.target) / 4;
        total += clamp(similarity, 0, 1) * preference.weight;
        weightTotal += preference.weight;
      });
      return weightTotal ? total / weightTotal * 100 : 60;
    }

    function themeCompatibility(destination, prefs) {
      var keys = Object.keys(prefs.themes);
      if (!keys.length) return 60;
      var total = 0;
      var weightTotal = 0;
      keys.forEach(function (key) {
        var pref = prefs.themes[key];
        var profile = destination.themeScores && destination.themeScores[key] ? destination.themeScores[key] : 3;
        total += clamp(1 - Math.abs(profile - pref.target) / 4, 0, 1) * pref.weight;
        weightTotal += pref.weight;
      });
      return weightTotal ? total / weightTotal * 100 : 60;
    }

    function calculateLifestyleScore(destination, prefs) {
      var lifestyleKeys = ["urban", "quiet", "sea", "nature", "warm", "cool", "humidity", "english", "languageBarrier", "japaneseAccess", "japanAccess", "carFree", "internationalAccess", "excitement", "expatCommunity", "remoteWork"];
      var axisScore = weightedSimilarity(destination, prefs, lifestyleKeys);
      var themeScore = themeCompatibility(destination, prefs);
      var themeWeight = Object.keys(prefs.themes).reduce(function (sum, key) {
        return sum + prefs.themes[key].weight;
      }, 0);
      var themeBlend = themeWeight >= 7 ? .30 : (themeWeight >= 4 ? .23 : .18);
      return round(clamp(axisScore * (1 - themeBlend) + themeScore * themeBlend, 0, 100));
    }

    function calculateFireScore(destination, prefs) {
      var fireKeys = ["cost", "healthcare", "safety", "carFree", "remoteWork", "visaReality", "urban", "japanAccess"];
      var preferenceScore = weightedSimilarity(destination, prefs, fireKeys);
      var fundamentals = ((destination.fireCostEfficiency + destination.healthcare + destination.safety + destination.remoteWork) / 20) * 100;
      var reality = destination.visaPracticality / 5 * 100;
      return round(clamp(preferenceScore * .58 + fundamentals * .27 + reality * .15, 0, 100));
    }

    function calculateVisaReality(destination) {
      return round(clamp(destination.visaPracticality / 5 * 100, 0, 100));
    }

    function calculateMismatchPenalty(destination, prefs) {
      var total = 0;
      var reasons = [];
      function addHighNeed(axis, label, maxPenalty) {
        var pref = prefs.axes[axis];
        if (!pref || pref.weight < 2 || pref.target <= 3.15) return;
        var diff = clamp((pref.target - axisValue(destination, axis)) / 4, 0, 1);
        var amount = diff * maxPenalty * clamp(pref.weight / 7, 0, 1);
        if (amount >= 1.2) {
          total += amount;
          reasons.push({ amount: amount, text: label });
        }
      }
      function addLowNeed(axis, label, maxPenalty) {
        var pref = prefs.axes[axis];
        if (!pref || pref.weight < 2 || pref.target >= 2.85) return;
        var diff = clamp((axisValue(destination, axis) - pref.target) / 4, 0, 1);
        var amount = diff * maxPenalty * clamp(pref.weight / 7, 0, 1);
        if (amount >= 1.2) {
          total += amount;
          reasons.push({ amount: amount, text: label });
        }
      }
      addHighNeed("cost", "💸 生活費を抑えたい気持ちに対して&#12289;財布の負担が大きめ", 12);
      addHighNeed("japanAccess", "&#9992;&#65039; 日本へ頻繁に帰りたい希望には&#12289;距離が少し重い", 11);
      addHighNeed("healthcare", "🏥 医療を最優先する希望には&#12289;生活圏の確認が必要", 8);
      addHighNeed("safety", "🛡 安心を最優先する希望には&#12289;エリア選びが重要", 8);
      addHighNeed("english", "🗣 英語で暮らしたい希望に対して&#12289;言語の壁が残る", 8);
      addHighNeed("carFree", "🚇 車なしで暮らしたい希望には&#12289;移動の工夫が必要", 8);
      addHighNeed("visaReality", "🛂 簡単に長く住みたい希望には&#12289;制度確認が重い", 10);
      addLowNeed("warm", "🥵 暑さが苦手なのに&#12289;南国の気候が強い", 10);
      addLowNeed("humidity", "🫠 湿気が苦手なのに&#12289;高温多湿の可能性がある", 11);
      addLowNeed("excitement", "🦥 静かに暮らしたいのに&#12289;街の刺激が強め", 7);
      addLowNeed("japaneseAccess", "🍣 日本食や日本語への未練に対して&#12289;選択肢が少なめ", 7);
      reasons.sort(function (a, b) { return b.amount - a.amount; });
      return { total: round(clamp(total, 0, 25)), reasons: reasons.slice(0, 4) };
    }

    function calculateWeights(answerIndexes) {
      var weights = { lifestyle: .65, fire: .25, visa: .10 };
      var efficiency = answerIndexes[0] === 0 && answerIndexes[1] === 0 && answerIndexes[23] === 2;
      var ideal = answerIndexes[1] === 2 && answerIndexes[17] === 2 && answerIndexes[23] === 1;
      var visaEasy = answerIndexes[17] === 0 || answerIndexes[18] === 0;
      if (efficiency) {
        weights.lifestyle = .55;
        weights.fire = .35;
      }
      if (ideal) {
        weights.lifestyle = .80;
        weights.fire = .10;
      }
      if (visaEasy) {
        weights.lifestyle -= .03;
        weights.visa += .03;
      }
      var sum = weights.lifestyle + weights.fire + weights.visa;
      weights.lifestyle /= sum;
      weights.fire /= sum;
      weights.visa /= sum;
      return weights;
    }

    function calculateFinalScore(lifestyleScore, fireScore, visaScore, mismatchPenalty, weights) {
      return round(clamp(lifestyleScore * weights.lifestyle + fireScore * weights.fire + visaScore * weights.visa - mismatchPenalty, 0, 100));
    }

    function profileDistance(first, second) {
      var total = 0;
      var count = 0;
      AXES.forEach(function (axis) {
        total += Math.abs(axisValue(first, axis.key) - axisValue(second, axis.key)) / 4;
        count += 1;
      });
      return count ? total / count : .5;
    }

    function scoreAllDestinations(answerIndexes) {
      var prefs = calculatePreferences(answerIndexes);
      var weights = calculateWeights(answerIndexes);
      return destinations.map(function (destination, index) {
        var lifestyleScore = calculateLifestyleScore(destination, prefs);
        var fireScore = calculateFireScore(destination, prefs);
        var visaScore = calculateVisaReality(destination);
        var mismatch = calculateMismatchPenalty(destination, prefs);
        var finalScore = calculateFinalScore(lifestyleScore, fireScore, visaScore, mismatch.total, weights);
        return {
          destination: destination,
          lifestyleScore: lifestyleScore,
          fireScore: fireScore,
          visaScore: visaScore,
          mismatchPenalty: mismatch.total,
          mismatchReasons: mismatch.reasons,
          finalScore: finalScore,
          index: index
        };
      });
    }

    function selectFirstDestination(scored) {
      return scored.slice().sort(function (a, b) {
        return b.finalScore - a.finalScore ||
          b.lifestyleScore - a.lifestyleScore ||
          b.fireScore - a.fireScore ||
          axisValue(b.destination, "japanAccess") - axisValue(a.destination, "japanAccess") ||
          a.index - b.index;
      })[0];
    }

    function selectSecondDestination(scored, first) {
      return scored.filter(function (item) {
        return item.destination.id !== first.destination.id;
      }).map(function (item) {
        var distance = profileDistance(first.destination, item.destination);
        var diversityBonus = round(clamp(distance * 8, 0, 8));
        return {
          item: item,
          diversityBonus: diversityBonus,
          secondaryScore: item.finalScore + diversityBonus
        };
      }).sort(function (a, b) {
        return b.secondaryScore - a.secondaryScore ||
          b.item.finalScore - a.item.finalScore ||
          b.item.lifestyleScore - a.item.lifestyleScore ||
          a.item.index - b.item.index;
      })[0];
    }

    function preferenceTarget(prefs, key) {
      return prefs.axes[key] ? prefs.axes[key].target : 3;
    }

    function preferenceWeight(prefs, key) {
      return prefs.axes[key] ? prefs.axes[key].weight : 0;
    }

    function themeTarget(prefs, key) {
      return prefs.themes[key] ? prefs.themes[key].target : 3;
    }

    function determineFireType(prefs) {
      var asiaTheme = themeTarget(prefs, "asia");
      var europeTheme = themeTarget(prefs, "europe");
      var islandTheme = themeTarget(prefs, "island");
      var cityTheme = themeTarget(prefs, "city");
      var farTheme = themeTarget(prefs, "far");
      var idealTheme = themeTarget(prefs, "ideal");
      var cost = preferenceTarget(prefs, "cost");
      var japanAccess = preferenceTarget(prefs, "japanAccess");
      var healthcare = preferenceTarget(prefs, "healthcare");
      var safety = preferenceTarget(prefs, "safety");
      var warm = preferenceTarget(prefs, "warm");
      var cool = preferenceTarget(prefs, "cool");
      var sea = preferenceTarget(prefs, "sea");
      var quiet = preferenceTarget(prefs, "quiet");
      var excitement = preferenceTarget(prefs, "excitement");
      var remoteWork = preferenceTarget(prefs, "remoteWork");
      var languageBarrier = preferenceTarget(prefs, "languageBarrier");
      var strong = function (key, threshold) {
        return preferenceWeight(prefs, key) >= 4 && preferenceTarget(prefs, key) >= threshold;
      };
      if (strong("cost", 4.15) && cost >= 4.15) return TYPE_DEFINITIONS.cost;
      if (europeTheme >= 4.25 && preferenceWeight(prefs, "internationalAccess") >= 3) return TYPE_DEFINITIONS.europe;
      if (cool >= 4.2 && warm <= 2.6 && preferenceWeight(prefs, "cool") >= 4) return TYPE_DEFINITIONS.cool;
      if (healthcare >= 4.35 && preferenceWeight(prefs, "healthcare") >= 5 && safety >= 3.5) return TYPE_DEFINITIONS.safety;
      if (safety >= 4.35 && preferenceWeight(prefs, "safety") >= 5) return TYPE_DEFINITIONS.safety;
      if (remoteWork >= 4.25 && preferenceWeight(prefs, "remoteWork") >= 5 && farTheme >= 4) return TYPE_DEFINITIONS.remote;
      if (islandTheme >= 4.3 && sea >= 4.2 && preferenceWeight(prefs, "sea") >= 4) return TYPE_DEFINITIONS.resort;
      if (asiaTheme >= 4.25 && preferenceWeight(prefs, "japaneseAccess") >= 4) return TYPE_DEFINITIONS.asia;
      if (japanAccess >= 4.25 && preferenceWeight(prefs, "japanAccess") >= 5) return TYPE_DEFINITIONS.japan;
      if (warm >= 4.25 && sea >= 4.1 && preferenceWeight(prefs, "warm") >= 4) return TYPE_DEFINITIONS.tropical;
      if (cityTheme >= 4.2 && excitement >= 4.2 && preferenceWeight(prefs, "urban") >= 5) return TYPE_DEFINITIONS.worldcity;
      if (quiet >= 4.3 && excitement <= 2.4 && preferenceWeight(prefs, "quiet") >= 4) return TYPE_DEFINITIONS.quiet;
      if (languageBarrier >= 4.2 && japanAccess <= 2.7 && farTheme >= 4) return TYPE_DEFINITIONS.adventure;
      if (idealTheme >= 4.2 && sea >= 4.1) return TYPE_DEFINITIONS.resort;
      var scores = {
        asia: themeTarget(prefs, "asia") * 1.8 + preferenceTarget(prefs, "japaneseAccess") + preferenceTarget(prefs, "cost"),
        tropical: preferenceTarget(prefs, "warm") * 2 + preferenceTarget(prefs, "sea") + preferenceTarget(prefs, "humidity"),
        cost: preferenceTarget(prefs, "cost") * 2 + preferenceTarget(prefs, "visaReality") + preferenceTarget(prefs, "carFree"),
        europe: themeTarget(prefs, "europe") * 2.4 + preferenceTarget(prefs, "internationalAccess") + preferenceTarget(prefs, "languageBarrier"),
        far: themeTarget(prefs, "far") * 2.4 + (6 - preferenceTarget(prefs, "japanAccess")) * 2 + preferenceTarget(prefs, "internationalAccess"),
        worldcity: themeTarget(prefs, "city") * 2 + preferenceTarget(prefs, "urban") * 1.7 + preferenceTarget(prefs, "excitement"),
        resort: themeTarget(prefs, "island") * 2 + preferenceTarget(prefs, "sea") * 1.7 + preferenceTarget(prefs, "nature"),
        quiet: preferenceTarget(prefs, "quiet") * 2 + (6 - preferenceTarget(prefs, "excitement")) * 1.7,
        japan: preferenceTarget(prefs, "japanAccess") * 2 + preferenceTarget(prefs, "japaneseAccess") + preferenceTarget(prefs, "healthcare"),
        adventure: (6 - preferenceTarget(prefs, "japaneseAccess")) + themeTarget(prefs, "adventure") * 2.2 + preferenceTarget(prefs, "languageBarrier"),
        remote: preferenceTarget(prefs, "remoteWork") * 2.2 + preferenceTarget(prefs, "internationalAccess") + preferenceTarget(prefs, "languageBarrier"),
        safety: preferenceTarget(prefs, "safety") * 2 + preferenceTarget(prefs, "healthcare") + preferenceTarget(prefs, "visaReality"),
        cool: preferenceTarget(prefs, "cool") * 2.1 + (6 - preferenceTarget(prefs, "warm")) + (6 - preferenceTarget(prefs, "humidity")),
        balanced: 9 + Math.min(preferenceWeight(prefs, "cost"), 5) / 2
      };
      var winner = Object.keys(scores).sort(function (a, b) {
        return scores[b] - scores[a] || a.localeCompare(b);
      })[0];
      return TYPE_DEFINITIONS[winner] || TYPE_DEFINITIONS.balanced;
    }

    function reasonForAxis(key, target) {
      var high = target >= 3.5;
      var low = target <= 2.5;
      var messages = {
        cost: high ? "💰 FIRE資産はなるべく減らしたくない" : "&#10024; お金より&#12302;一番住みたい&#12303;を優先できる",
        urban: high ? "🏙 田舎より&#12289;店と街の便利さが好き" : "🌿 街の密度より&#12289;余白がほしい",
        quiet: high ? "🦥 会社のない静かな時間を増やしたい" : "🎉 FIRE後も街の刺激は残したい",
        sea: high ? "🌊 海を旅行ではなく日常の背景にしたい" : "🗺 海より街や別の景色を選びたい",
        nature: high ? "🌿 自然を生活のすぐそばに置きたい" : "🏙 自然より都市の選択肢を優先したい",
        warm: high ? "&#9728;&#65039; 冬と寒さから逃げたい" : "&#10052;&#65039; 涼しさや季節感を手放したくない",
        cool: high ? "&#10052;&#65039; 暑さより涼しい空気を選びたい" : "🌴 寒い場所より太陽がほしい",
        humidity: high ? "🌴 高温多湿も南国の一部として楽しめそう" : "🫠 湿気だけはできれば避けたい",
        healthcare: high ? "🏥 医療はFIRE後も妥協したくない" : "🧳 医療より&#12289;まず自由と体験を取りに行きたい",
        safety: high ? "🛡 夜も安心できる生活を重視している" : "🌍 海外らしい緊張感も少しは受け入れられる",
        english: high ? "🗣 英語で生活を組み立てたい" : "🍣 日本語や日本食の逃げ道がほしい",
        languageBarrier: high ? "🔥 現地語の壁も海外生活の面白さにできそう" : "📱 言葉で困る場面はできるだけ減らしたい",
        japaneseAccess: high ? "🍜 日本食&#12539;日本文化への未練がかなり強い" : "🌮 現地の食と文化へ飛び込めそう",
        japanAccess: high ? "&#9992;&#65039; 日本へ気軽に戻れる距離が大切" : "🌎 日本から遠くても新しい人生を選べる",
        carFree: high ? "🚇 車なしで生活を完結させたい" : "🚗 移動のための運転は受け入れられる",
        internationalAccess: high ? "🛫 住む場所を世界旅行の拠点にもしたい" : "🏡 国際移動より&#12289;日常の落ち着きを優先したい",
        excitement: high ? "🎉 FIRE後も刺激や人の気配がほしい" : "🦥 平和であることを最高のイベントにしたい",
        expatCommunity: high ? "🌏 外国人コミュニティに混ざりたい" : "🏡 大きなコミュニティより自分のペースを守りたい",
        remoteWork: high ? "💻 会社は辞めても&#12289;少し働ける余地は残したい" : "🦥 仕事からはできるだけ離れたい",
        visaReality: high ? "🛂 住みたいだけでなく&#12289;長く住める現実性も重視" : "🏆 理想の場所なら制度の壁も突破したい"
      };
      return messages[key] || (high ? "🌍 海外生活への希望が強い" : "🌍 海外生活の条件を現実的に見ている");
    }

    function buildReasons(prefs, destination) {
      var entries = AXES.map(function (axis) {
        return { key: axis.key, label: axis.label, target: preferenceTarget(prefs, axis.key), weight: preferenceWeight(prefs, axis.key) };
      }).filter(function (entry) { return entry.weight > 0; });
      entries.sort(function (a, b) {
        return (b.weight * (1 + Math.abs(b.target - 3) / 4)) - (a.weight * (1 + Math.abs(a.target - 3) / 4));
      });
      var reasons = entries.slice(0, 4).map(function (entry) {
        return reasonForAxis(entry.key, entry.target);
      });
      destination.bestFor.slice(0, 2).forEach(function (tag) {
        if (reasons.length < 4 && reasons.indexOf("🏷 " + tag + "との相性が高い") < 0) {
          reasons.push("🏷 " + tag + "との相性が高い");
        }
      });
      return reasons.slice(0, 4);
    }

    function buildDifference(first, second) {
      var a = first.destination;
      var b = second.destination;
      if (a.regionTags.indexOf("asia") >= 0 && b.regionTags.indexOf("asia") >= 0) {
        if (b.sea > a.sea + 1) return a.city + "より海を優先するなら&#12289;" + b.city + "&#12290;";
        if (b.quiet > a.quiet + 1) return a.city + "ほど刺激はいらないなら&#12289;" + b.city + "&#12290;";
        if (b.cost > a.cost + 1) return a.city + "よりFIRE効率を狙うなら&#12289;" + b.city + "&#12290;";
      }
      if (b.sea > a.sea + 1) return a.city + "より海を近くに置きたいなら&#12289;" + b.city + "&#12290;";
      if (b.cost > a.cost + 1) return a.city + "より資産の寿命を優先するなら&#12289;" + b.city + "&#12290;";
      if (b.urban > a.urban + 1) return a.city + "より都市の刺激を増やすなら&#12289;" + b.city + "&#12290;";
      if (b.quiet > a.quiet + 1) return a.city + "より静かな生活へ寄せるなら&#12289;" + b.city + "&#12290;";
      if (b.cool > a.cool + 1) return a.city + "より涼しい気候を選ぶなら&#12289;" + b.city + "&#12290;";
      return "第1候補と同じ価値観を&#12289;少し違う角度から叶えるなら" + b.city + "&#12290;";
    }

    function difficultyFor(first, prefs, answerIndexes) {
      var effort = (5 - first.destination.visaPracticality) * 1.4;
      effort += (5 - first.destination.japanAccess) * .5;
      effort += (5 - first.destination.cost) * .35;
      effort += preferenceTarget(prefs, "languageBarrier") <= 2 && first.destination.languageBarrier <= 2 ? 1.2 : 0;
      if (answerIndexes[17] === 2) effort += 1.5;
      if (answerIndexes[18] === 2) effort += 1;
      var level;
      var description;
      if (effort <= 3) { level = "EASY"; description = "近距離&#12539;比較的適応しやすい選択&#12290;まずは下見から始められそうです&#12290;"; }
      else if (effort <= 5) { level = "NORMAL"; description = "準備すれば十分狙える選択&#12290;制度と生活費を順番に確認しましょう&#12290;"; }
      else if (effort <= 7) { level = "HARD"; description = "言語&#12539;距離&#12539;制度のどこかにハードルあり&#12290;試住と情報収集が重要です&#12290;"; }
      else if (effort <= 9) { level = "VERY HARD"; description = "かなり本気の海外移住&#12290;資産&#12539;滞在資格&#12539;医療を同時に設計する必要があります&#12290;"; }
      else { level = "BOSS"; description = "&#12302;そこに住みたい&#12303;と&#12302;そこに住める&#12303;は別問題&#12290;夢を現実の計画へ翻訳する難易度です&#12290;"; }
      return { level: level, description: description };
    }

    function buildResult(answerIndexes) {
      var safeAnswers = answerIndexes.slice(0, questions.length);
      var prefs = calculatePreferences(safeAnswers);
      var scored = scoreAllDestinations(safeAnswers);
      var first = selectFirstDestination(scored);
      var secondChoice = selectSecondDestination(scored, first);
      var second = secondChoice.item;
      var type = determineFireType(prefs);
      return {
        answers: safeAnswers,
        preferences: prefs,
        weights: calculateWeights(safeAnswers),
        scored: scored,
        first: first,
        second: second,
        secondDiversityBonus: secondChoice.diversityBonus,
        type: type,
        reasons: buildReasons(prefs, first.destination),
        difference: buildDifference(first, second),
        difficulty: difficultyFor(first, prefs, safeAnswers)
      };
    }

    function renderHome() {
      clearTimer();
      var saved = readSavedProgress();
      var resume = "";
      if (saved && saved.answers.length) {
        var resumeQuestion = clamp((saved.questionIndex || saved.answers.length) + 1, 1, questions.length);
        resume = '<div class="wigu-resume"><strong>前回の海外逃亡計画があります</strong><p>Q' + resumeQuestion + 'あたりから再開できます&#12290;回答はブラウザ内だけに保存しています&#12290;</p><div class="wigu-resume-actions"><button type="button" data-action="resume">続きから</button><button type="button" data-action="fresh">最初から</button></div></div>';
      }
      main.innerHTML =
        '<section class="wigu-screen wigu-card wigu-home">' +
          '<p class="wigu-eyebrow">OVERSEAS FIRE DESTINATION GUIDE</p>' +
          '<div class="wigu-map" aria-hidden="true"><span class="wigu-map-pin wigu-pin-a">&#9679;</span><span class="wigu-map-pin wigu-pin-b">&#9679;</span><span class="wigu-map-pin wigu-pin-c">&#9679;</span><span class="wigu-map-label">YOUR NEXT LIFE</span></div>' +
          '<h1>移住場所 勝手に案内所<span>&#65372;海外編</span></h1>' +
          '<p class="wigu-lead"><strong>会社を辞めたあなたを&#12289;勝手に海外へ飛ばします&#12290;</strong><br>会社に行かなくていい&#12290;住む場所も日本じゃなくていい&#12290;じゃあ&#12289;世界のどこで暮らす&#65311; 物価&#12289;気候&#12289;海&#12289;都会&#12289;日本食&#12289;医療&#12289;英語&#12289;ビザ&#12289;日本への距離&#8230;&#8230;24問に答えるだけで&#12289;海外FIRE先を第1候補&#12539;第2候補まで決めます&#12290;</p>' +
          '<div class="wigu-chip-row"><span class="wigu-chip">生活費</span><span class="wigu-chip">海&#12539;自然</span><span class="wigu-chip">医療</span><span class="wigu-chip">ビザ</span><span class="wigu-chip">日本との距離</span></div>' +
          '<div class="wigu-note">全24問&#12539;すべて3択&#12539;所要時間は約4分&#12290;正解はありません&#12290;好きそうな場所と&#12289;実際にFIRE移住しやすい場所は違うので&#12289;両方を分けて診断します&#12290;</div>' +
          resume +
          '<button class="wigu-primary" type="button" data-action="start">会社を辞めて世界へ逃亡する</button>' +
        '</section>';
      var start = main.querySelector('[data-action="start"]');
      if (start) start.addEventListener("click", function () {
        clearProgress();
        state.answers = [];
        state.questionIndex = 0;
        renderQuestion();
      });
      var resumeButton = main.querySelector('[data-action="resume"]');
      if (resumeButton) resumeButton.addEventListener("click", function () {
        state.answers = (saved.answers || []).slice();
        state.questionIndex = clamp(saved.questionIndex || state.answers.length, 0, questions.length - 1);
        if ([6, 12, 18, 23].indexOf(state.questionIndex) >= 0) renderComment(state.questionIndex);
        else renderQuestion();
      });
      var freshButton = main.querySelector('[data-action="fresh"]');
      if (freshButton) freshButton.addEventListener("click", function () {
        clearProgress();
        state.answers = [];
        state.questionIndex = 0;
        renderQuestion();
      });
    }

    function renderQuestion() {
      clearTimer();
      var index = clamp(state.questionIndex, 0, questions.length - 1);
      var current = questions[index];
      var answerButtons = current.answers.map(function (answer, answerIndex) {
        return '<button class="wigu-answer" type="button" data-answer="' + answerIndex + '"><span class="wigu-letter">' + String.fromCharCode(65 + answerIndex) + '</span><span class="wigu-answer-copy">' + escapeHtml(answer.text) + '</span></button>';
      }).join("");
      main.innerHTML =
        '<section class="wigu-screen wigu-card wigu-question" aria-labelledby="wigu-question-title">' +
          '<div class="wigu-question-top"><span>WORLD ESCAPE TEST</span><strong>Q ' + (index + 1) + ' / ' + questions.length + '</strong></div>' +
          '<div class="wigu-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + questions.length + '" aria-valuenow="' + (index + 1) + '"><span style="width:' + (((index + 1) / questions.length) * 100) + '%"></span></div>' +
          '<h2 id="wigu-question-title">' + escapeHtml(current.text) + '</h2>' +
          '<div class="wigu-answers">' + answerButtons + '</div>' +
          '<button class="wigu-back" type="button" data-action="back" ' + (index === 0 ? "disabled" : "") + '>&#8592; 前の質問へ</button>' +
        '</section>';
      main.querySelectorAll("[data-answer]").forEach(function (button) {
        button.addEventListener("click", function () {
          selectAnswer(index, Number(button.getAttribute("data-answer")), button);
        });
      });
      var back = main.querySelector('[data-action="back"]');
      if (back) back.addEventListener("click", function () {
        if (state.questionIndex > 0) {
          state.questionIndex -= 1;
          state.answers = state.answers.slice(0, state.questionIndex);
          saveProgress();
          renderQuestion();
        }
      });
    }

    function selectAnswer(questionIndex, answerIndex, button) {
      if (button.disabled) return;
      button.disabled = true;
      button.classList.add("is-picked");
      state.answers[questionIndex] = answerIndex;
      state.answers = state.answers.slice(0, questionIndex + 1);
      state.questionIndex = questionIndex + 1;
      saveProgress();
      window.setTimeout(function () {
        if (state.questionIndex >= questions.length) {
          renderLoading();
        } else if ([6, 12, 18, 23].indexOf(state.questionIndex) >= 0) {
          renderComment(state.questionIndex);
        } else {
          renderQuestion();
        }
      }, 150);
    }

    function renderComment(nextQuestionIndex) {
      clearTimer();
      var comments = {
        6: ["", "案内所&#12300;海外で生きられそうか調べてます&#12290;&#12301;"],
        12: ["", "案内所&#12300;だいぶ日本から離れてきました&#12290;&#12301;"],
        18: ["", "案内所&#12300;理想だけじゃなく&#12289;財布とも相談しています&#12290;&#12301;"],
        23: ["", "案内所&#12300;ほぼ行き先決まりました&#12290;会社への退職届をご用意ください&#12290;&#12301;"]
      };
      var comment = comments[nextQuestionIndex] || comments[6];
      main.innerHTML =
        '<section class="wigu-screen wigu-card wigu-comment">' +
          '<div class="wigu-comment-icon" aria-hidden="true">' + comment[0] + '</div>' +
          '<p class="wigu-kicker">IMMIGRATION DESK MEMO</p>' +
          '<h2>途中経過のお知らせ</h2>' +
          '<p>' + escapeHtml(comment[1]) + '</p>' +
          '<div class="wigu-actions"><button class="wigu-primary" type="button" data-action="continue">次の質問へ &#8594;</button><button class="wigu-secondary" type="button" data-action="back">&#8592; 前の質問へ</button></div>' +
        '</section>';
      main.querySelector('[data-action="continue"]').addEventListener("click", function () {
        renderQuestion();
      });
      main.querySelector('[data-action="back"]').addEventListener("click", function () {
        state.questionIndex = Math.max(0, nextQuestionIndex - 1);
        state.answers = state.answers.slice(0, state.questionIndex);
        saveProgress();
        renderQuestion();
      });
    }

    function renderLoading() {
      clearTimer();
      var messages = [
        "世界193か国を勝手に捜索中&#8230;&#8230;",
        "FIRE資産の寿命を計算中&#8230;&#8230;",
        "南国への逃亡願望を測定中&#8230;&#8230;",
        "日本食なしで生きられるか確認中&#8230;&#8230;",
        "日本への未練を測定中&#8230;&#8230;",
        "ビザという現実を確認中&#8230;&#8230;",
        "あなたの逃亡先が決まりました&#12290;"
      ];
      main.innerHTML =
        '<section class="wigu-screen wigu-card wigu-loading">' +
          '<div class="wigu-loading-inner"><div class="wigu-radar" aria-hidden="true"><b>+</b></div><h2>あなたの海外FIRE先を探索中</h2><div class="wigu-loading-message" id="wigu-loading-message">' + escapeHtml(messages[0]) + '</div></div>' +
        '</section>';
      var messageNode = document.getElementById("wigu-loading-message");
      var messageIndex = 0;
      function tick() {
        messageIndex += 1;
        if (messageIndex < messages.length) {
          if (messageNode) messageNode.textContent = cleanDisplayText(messages[messageIndex]);
          state.timer = window.setTimeout(tick, messageIndex === messages.length - 1 ? 430 : 340);
        } else {
          clearProgress();
          state.result = buildResult(state.answers);
          renderResult(state.result);
        }
      }
      state.timer = window.setTimeout(tick, 340);
    }

    function renderStars(value) {
      var count = clamp(Math.round(value), 1, 5);
      return count + "/5";
    }

    function renderReasonList(reasons) {
      return '<ul class="wigu-reasons">' + reasons.map(function (reason) { return "<li>" + escapeHtml(reason) + "</li>"; }).join("") + "</ul>";
    }

    function renderTimeline(destination) {
      return '<ul class="wigu-timeline">' + destination.day.map(function (item) {
        return '<li><span class="wigu-time">' + escapeHtml(item[0]) + '</span><span>' + escapeHtml(item[1]) + '</span></li>';
      }).join("") + "</ul>";
    }

    function renderCautions(item) {
      var cautions = item.mismatchReasons.map(function (reason) { return reason.text; });
      item.destination.cautions.forEach(function (caution) {
        if (cautions.length < 3) cautions.push("注意: " + caution);
      });
      while (cautions.length < 2) cautions.push("注意: 現地の生活圏を決める前に&#12289;短期滞在で相性を確認");
      return cautions.slice(0, 3);
    }

    function renderProfileBars(result) {
      var entries = AXES.map(function (axis) {
        var pref = result.preferences.axes[axis.key];
        return { label: axis.label, target: pref.target, weight: pref.weight };
      }).filter(function (entry) { return entry.weight > 0; }).sort(function (a, b) {
        return (b.weight * (1 + Math.abs(b.target - 3) / 4)) - (a.weight * (1 + Math.abs(a.target - 3) / 4));
      }).slice(0, 5);
      return entries.map(function (entry) {
        var value = round(entry.target / 5 * 100);
        return '<div class="wigu-profile-row"><span>' + escapeHtml(entry.label) + '</span><div class="wigu-bar"><span style="width:' + value + '%"></span></div><b>' + value + '%</b></div>';
      }).join("");
    }

    function renderDebug(result) {
      if (!DEBUG_MODE) return "";
      var ranking = result.scored.slice().sort(function (a, b) { return b.finalScore - a.finalScore || a.index - b.index; }).map(function (item, index) {
        return (index + 1) + ". " + item.destination.city + " life=" + item.lifestyleScore + " fire=" + item.fireScore + " visa=" + item.visaScore + " penalty=" + item.mismatchPenalty + " final=" + item.finalScore;
      }).join("\n");
      return '<pre class="wigu-debug">' + escapeHtml("weights=" + JSON.stringify(result.weights) + "\n\npreferences=" + JSON.stringify(result.preferences.axes, null, 2) + "\n\nanswers=" + JSON.stringify(result.answers) + "\n\nranking=\n" + ranking) + "</pre>";
    }

    var LOCATION_POINTS_BY_REGION = {
      "東南アジア": { x: 75, y: 50 },
      "東アジア": { x: 83, y: 36 },
      "南欧": { x: 46, y: 42 },
      "大西洋": { x: 38, y: 51 },
      "地中海": { x: 51, y: 46 },
      "北欧&#12539;バルト": { x: 52, y: 29 },
      "コーカサス": { x: 61, y: 36 },
      "中東": { x: 63, y: 43 },
      "インド洋": { x: 64, y: 69 },
      "オセアニア": { x: 89, y: 72 },
      "太平洋": { x: 12, y: 48 },
      "北米": { x: 18, y: 34 },
      "中南米": { x: 29, y: 53 },
      "西欧": { x: 44, y: 35 }
    };

    var WORLD_MAP_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/BlankMap-Equirectangular.svg/1280px-BlankMap-Equirectangular.svg.png";
    var WORLD_MAP_SOURCE_URL = "https://commons.wikimedia.org/wiki/File:BlankMap-Equirectangular.svg";

    /* Real city coordinates, projected onto the equirectangular base map. */
    var LOCATION_POINTS_BY_ID = {
      "kuala-lumpur": { lon: 101.687, lat: 3.139 },
      "penang": { lon: 100.329, lat: 5.414 },
      "bangkok": { lon: 100.502, lat: 13.756 },
      "chiang-mai": { lon: 98.986, lat: 18.788 },
      "phuket": { lon: 98.392, lat: 7.880 },
      "danang": { lon: 108.202, lat: 16.054 },
      "ho-chi-minh": { lon: 106.629, lat: 10.823 },
      "bali": { lon: 115.216, lat: -8.650 },
      "taipei": { lon: 121.565, lat: 25.033 },
      "kaohsiung": { lon: 120.301, lat: 22.627 },
      "cebu": { lon: 123.885, lat: 10.315 },
      "singapore": { lon: 103.819, lat: 1.352 },
      "lisbon": { lon: -9.139, lat: 38.722 },
      "porto": { lon: -8.629, lat: 41.157 },
      "valencia": { lon: -0.376, lat: 39.470 },
      "malaga": { lon: -4.421, lat: 36.721 },
      "canary": { lon: -15.430, lat: 28.124 },
      "malta": { lon: 14.514, lat: 35.899 },
      "split": { lon: 16.440, lat: 43.508 },
      "tallinn": { lon: 24.753, lat: 59.437 },
      "tbilisi": { lon: 44.827, lat: 41.715 },
      "dubai": { lon: 55.271, lat: 25.205 },
      "mauritius": { lon: 57.500, lat: -20.160 },
      "gold-coast": { lon: 153.400, lat: -28.016 },
      "sydney": { lon: 151.209, lat: -33.868 },
      "honolulu": { lon: -157.858, lat: 21.307 },
      "vancouver": { lon: -123.120, lat: 49.282 },
      "mexico-city": { lon: -99.133, lat: 19.432 },
      "london": { lon: -0.128, lat: 51.507 },
      "auckland": { lon: 174.763, lat: -36.850 }
    };

    function getLocationPoint(destination) {
      var point = LOCATION_POINTS_BY_ID[destination.id] || LOCATION_POINTS_BY_REGION[cleanDisplayText(destination.region)] || { x: 50, y: 50 };
      if (typeof point.lon === "number" && typeof point.lat === "number") {
        return {
          x: ((point.lon + 180) / 360) * 100,
          y: ((90 - point.lat) / 180) * 100
        };
      }
      return { x: point.x, y: point.y };
    }

    function renderWorldMapImage(altText) {
      return '<img class="wigu-map-image" src="' + WORLD_MAP_IMAGE_URL + '" alt="' + escapeHtml(altText || "") + '" decoding="async" />' +
        '<span class="wigu-map-grid" aria-hidden="true"></span>';
    }

    function renderWorldMapSource() {
      return '<p class="wigu-map-source">地図&#65306;<a href="' + WORLD_MAP_SOURCE_URL + '" target="_blank" rel="noopener">Wikimedia Commons / Natural Earth</a>&#65288;CC0&#65289;</p>';
    }

    function renderLocationMap(firstDestination, secondDestination) {
      var firstPoint = getLocationPoint(firstDestination);
      var secondPoint = getLocationPoint(secondDestination);
      if (Math.abs(firstPoint.x - secondPoint.x) < 7 && Math.abs(firstPoint.y - secondPoint.y) < 7) {
        firstPoint.x -= 4;
        secondPoint.x += 4;
      }
      var firstCity = cleanDisplayText(firstDestination.city);
      var secondCity = cleanDisplayText(secondDestination.city);
      var firstCountry = cleanDisplayText(firstDestination.country);
      var secondCountry = cleanDisplayText(secondDestination.country);
      return '<section class="wigu-location-map" aria-label="候補地の世界地図">' +
        '<div class="wigu-location-map-head"><p>WORLD MAP</p><h2>候補地は世界のこの辺</h2><span>第1候補と第2候補を地図上のピンで表示</span></div>' +
        '<div class="wigu-map-canvas" role="img" aria-label="第1候補 ' + escapeHtml(firstCity) + ' と第2候補 ' + escapeHtml(secondCity) + ' のおおまかな位置">' +
          renderWorldMapImage("") +
          '<span class="wigu-map-pin wigu-map-pin-first" style="--x:' + firstPoint.x + '%;--y:' + firstPoint.y + '%;" aria-hidden="true"><b>1</b></span>' +
          '<span class="wigu-map-pin wigu-map-pin-second" style="--x:' + secondPoint.x + '%;--y:' + secondPoint.y + '%;" aria-hidden="true"><b>2</b></span>' +
        '</div>' +
        '<div class="wigu-map-legend">' +
          '<div class="wigu-map-legend-item"><b class="wigu-map-key-first">1</b><div><strong>' + escapeHtml(firstCity) + '</strong><span>' + escapeHtml(firstCountry) + '</span></div></div>' +
          '<div class="wigu-map-legend-item"><b class="wigu-map-key-second">2</b><div><strong>' + escapeHtml(secondCity) + '</strong><span>' + escapeHtml(secondCountry) + '</span></div></div>' +
        '</div>' +
        renderWorldMapSource() +
      '</section>';
    }

    function getAllLocationEntries() {
      var offsets = [
        [0, 0], [-3, -3], [3, -3], [-3, 3], [3, 3], [-6, 0], [6, 0], [0, -6], [0, 6],
        [-6, -6], [6, -6], [-6, 6], [6, 6], [-9, 0], [9, 0], [0, -9], [0, 9],
        [-9, -6], [9, -6], [-9, 6], [9, 6], [-6, -9], [6, -9], [-6, 9], [6, 9]
      ];
      var placed = [];
      return destinations.map(function (destination, index) {
        var base = getLocationPoint(destination);
        var point = { x: base.x, y: base.y };
        for (var offsetIndex = 0; offsetIndex < offsets.length; offsetIndex += 1) {
          var candidate = {
            x: Math.max(3, Math.min(97, base.x + offsets[offsetIndex][0])),
            y: Math.max(5, Math.min(93, base.y + offsets[offsetIndex][1]))
          };
          var occupied = placed.some(function (other) {
            return Math.abs(candidate.x - other.x) < 4.5 && Math.abs(candidate.y - other.y) < 4.5;
          });
          if (!occupied || offsetIndex === offsets.length - 1) {
            point = candidate;
            break;
          }
        }
        placed.push(point);
        return { index: index, destination: destination, point: point };
      });
    }

    function focusAllMapLocation(locationId) {
      var pins = main.querySelectorAll('[data-map-location]');
      var items = main.querySelectorAll('[data-map-list]');
      var targetItem = null;
      Array.prototype.forEach.call(pins, function (pin) {
        pin.classList.toggle("is-active", pin.getAttribute("data-map-location") === locationId);
      });
      Array.prototype.forEach.call(items, function (item) {
        var isTarget = item.getAttribute("data-map-list") === locationId;
        item.classList.toggle("is-active", isTarget);
        if (isTarget) targetItem = item;
      });
      if (targetItem && targetItem.scrollIntoView) targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function renderAllDestinationMap() {
      clearTimer();
      var entries = getAllLocationEntries();
      var groups = {};
      var groupOrder = [];
      entries.forEach(function (entry) {
        var region = cleanDisplayText(entry.destination.region);
        if (!groups[region]) {
          groups[region] = [];
          groupOrder.push(region);
        }
        groups[region].push(entry);
      });
      var pins = entries.map(function (entry) {
        var number = ("0" + (entry.index + 1)).slice(-2);
        var city = cleanDisplayText(entry.destination.city);
        var country = cleanDisplayText(entry.destination.country);
        return '<button class="wigu-all-map-pin" type="button" data-map-location="' + escapeHtml(entry.destination.id) + '" style="--x:' + entry.point.x + '%;--y:' + entry.point.y + '%;" aria-label="' + escapeHtml(number + " " + city + "&#65288;" + country + "&#65289;") + '">' + number + '</button>';
      }).join("");
      var list = groupOrder.map(function (region) {
        var group = groups[region];
        return '<section class="wigu-all-map-group"><h3>' + escapeHtml(region) + '<span>' + group.length + 'か所</span></h3><div class="wigu-all-map-items">' + group.map(function (entry) {
          var number = ("0" + (entry.index + 1)).slice(-2);
          return '<button class="wigu-all-map-item" type="button" data-map-list="' + escapeHtml(entry.destination.id) + '"><span class="wigu-all-map-item-number">' + number + '</span><span><strong>' + escapeHtml(entry.destination.city) + '</strong><small>' + escapeHtml(entry.destination.country) + '</small></span></button>';
        }).join("") + '</div></section>';
      }).join("");
      main.innerHTML =
        '<section class="wigu-screen wigu-all-map-screen">' +
          '<div class="wigu-result-intro"><p>ALL DESTINATIONS</p><h1>候補地を全て見る</h1></div>' +
          '<section class="wigu-card wigu-all-map-panel"><h2>海外FIRE候補 ' + destinations.length + 'か所</h2><p>国境線のある世界地図に&#12289;候補地を番号で配置しています&#12290;番号と下の一覧を照らし合わせてください&#12290;</p>' +
            '<div class="wigu-map-canvas wigu-all-map-canvas" role="group" aria-label="海外FIRE候補地 ' + destinations.length + 'か所の世界地図">' +
              renderWorldMapImage("国境線のある世界地図") +
              pins +
            '</div>' +
            '<p class="wigu-all-map-help">地図の数字を押すと&#12289;下の一覧で場所を確認できます&#12290;</p>' +
            renderWorldMapSource() +
            '<div class="wigu-all-map-list">' + list + '</div>' +
          '</section>' +
          '<div class="wigu-actions"><button class="wigu-secondary" type="button" data-action="all-map-back">結果画面に戻る</button></div>' +
        '</section>';
      main.scrollIntoView({ behavior: "auto", block: "start" });
      main.querySelectorAll("[data-map-location]").forEach(function (pin) {
        pin.addEventListener("click", function () { focusAllMapLocation(pin.getAttribute("data-map-location")); });
      });
      main.querySelectorAll("[data-map-list]").forEach(function (item) {
        item.addEventListener("click", function () { focusAllMapLocation(item.getAttribute("data-map-list")); });
      });
      main.querySelector('[data-action="all-map-back"]').addEventListener("click", function () {
        renderResult(state.result);
        main.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }

    function renderResult(result) {
      clearTimer();
      var first = result.first;
      var second = result.second;
      var firstDestination = first.destination;
      var secondDestination = second.destination;
      var firstCautions = renderCautions(first);
      var secondReasons = buildReasons(result.preferences, secondDestination).slice(0, 2);
      main.innerHTML =
        '<section class="wigu-screen wigu-result">' +
          '<div class="wigu-result-intro"><p>RESULT OF YOUR WORLD ESCAPE TEST</p><h1>会社を辞めたあなたの行き先は&#8230;&#8230;</h1></div>' +
          '<div class="wigu-summary-card" data-result-card>' +
            '<p class="wigu-summary-kicker">第1候補&#65372;案内所の判定</p>' +
            '<div class="wigu-summary-main"><div><h2>' + escapeHtml(firstDestination.city) + '</h2><p>' + escapeHtml(firstDestination.country) + ' / ' + escapeHtml(firstDestination.region) + '</p></div></div>' +
            '<div class="wigu-summary-score"><div class="wigu-ring" style="--score:' + (first.lifestyleScore * 3.6) + 'deg" aria-label="暮らし相性 ' + first.lifestyleScore + 'パーセント"><span>' + first.lifestyleScore + '%</span></div><div class="wigu-summary-stat"><div><span>暮らし相性</span><b>' + first.lifestyleScore + '%</b></div><div><span>FIRE相性</span><b>' + first.fireScore + '%</b></div><div><span>移住現実度</span><b>' + renderStars(firstDestination.visaPracticality) + '</b></div></div></div>' +
            '<div class="wigu-copy">&#8220;' + escapeHtml(firstDestination.catchCopy) + '&#8221;</div>' +
          '</div>' +
          renderLocationMap(firstDestination, secondDestination) +
          '<section class="wigu-card wigu-section"><h2>案内所が' + escapeHtml(firstDestination.city) + 'に飛ばした理由</h2>' + renderReasonList(result.reasons) + '</section>' +
          '<section class="wigu-card wigu-section"><h2>会社を辞めたあなたの一日</h2><p>' + escapeHtml(firstDestination.lifestyle) + '</p>' + renderTimeline(firstDestination) + '</section>' +
          '<section class="wigu-card wigu-section wigu-highlight"><h2>FIRE民的にはどう&#65311;</h2><p>' + escapeHtml(firstDestination.fireNote) + '</p></section>' +
          '<section class="wigu-card wigu-section wigu-alert"><h3>移住する前にちょっと待った</h3><ul>' + firstCautions.map(function (caution) { return "<li>" + escapeHtml(caution) + "</li>"; }).join("") + "</ul></section>" +
          '<section class="wigu-card wigu-section"><h2>知ってた&#65311;</h2><ul class="wigu-trivia-grid">' + firstDestination.trivia.map(function (fact) { return "<li>" + escapeHtml(fact) + "</li>"; }).join("") + "</ul></section>" +
          '<section class="wigu-card wigu-section wigu-visa"><h3>で&#12289;実際住めるん&#65311;</h3><p>' + escapeHtml(firstDestination.visaNote) + '</p><p class="wigu-visa-note">制度は年齢&#12539;所得&#12539;資産&#12539;仕事&#12539;家族構成等によって変わります&#12290;この診断はビザ取得を保証するものではありません&#12290;ビザ&#12539;税制&#12539;滞在条件は変更されることがあります&#12290;実際の移住前に最新の公式情報をご確認ください&#12290;</p></section>' +
          '<section class="wigu-card wigu-section wigu-second"><div class="wigu-second-head"><div><h2>実はこっちもかなりアリ</h2><p class="wigu-second-country">' + escapeHtml(secondDestination.country) + '&#65372;' + escapeHtml(secondDestination.city) + '</p></div></div><div class="wigu-second-score">暮らし相性 <span>' + second.lifestyleScore + '%</span>&#12288; FIRE相性 ' + second.fireScore + '%</div><p><strong>&#8220;' + escapeHtml(secondDestination.catchCopy) + '&#8221;</strong></p>' + renderReasonList(secondReasons) + '<p class="wigu-difference">第1候補との違い&#65306;' + escapeHtml(result.difference) + '</p></section>' +
          '<section class="wigu-card wigu-section"><h2>案内所が勝手に分析したあなた</h2><p>20軸から&#12289;今回の回答で特徴が強かった上位5項目です&#12290;</p><div class="wigu-profile-bars">' + renderProfileBars(result) + '</div></section>' +
          '<section class="wigu-type"><div><h2>あなたは&#8230;&#8230;<br>' + escapeHtml(result.type.name) + '</h2><p>' + escapeHtml(result.type.description) + '</p><p class="wigu-one-liner">' + escapeHtml(result.type.oneLiner) + '</p></div></section>' +
          '<section class="wigu-difficulty"><span class="wigu-difficulty-label">' + result.difficulty.level + '</span><h3>あなたの海外FIRE難易度</h3><p>' + escapeHtml(result.difficulty.description) + '</p></section>' +
          '<section class="wigu-share"><h2>結果をシェアする</h2><p>簡易結果カードをPNG画像で保存できます&#12290;日本語は端末の標準フォントで描画します&#12290;</p><div class="wigu-actions"><button class="wigu-secondary" type="button" data-action="save-image">画像を保存&#65288;PNG&#65289;</button><button class="wigu-secondary" type="button" data-action="share">Xで結果をシェアする</button><button class="wigu-secondary" type="button" data-action="copy">結果テキストをコピー</button></div></section>' +
          '<section class="wigu-all-map-entry"><h2>候補地を全て見る</h2><p>今回の診断で第一候補&#12539;第二候補になり得る' + destinations.length + 'か所を&#12289;世界地図と一覧で確認できます&#12290;</p><button class="wigu-primary" type="button" data-action="all-map">候補地を全て見る</button></section>' +
          '<section class="wigu-final-message">会社を辞めたら&#12289;<br>今の家に住み続けなきゃいけない理由もありません&#12290;<br><br>東京でもいい&#12290;沖縄でもいい&#12290;タイでもいい&#12290;ポルトガルでもいい&#12290;<br><br>実際に移住するかどうかは別として&#12289;<strong>&#12300;自分はどこでも暮らせる&#12301;</strong>と思えるだけで&#12289;人生の選択肢はちょっと広がります&#12290;<br><br>さて&#12290;<br><br><strong>会社辞めたら&#12289;どこ行く&#65311;</strong></section>' +
          '<div class="wigu-actions"><button class="wigu-primary" type="button" data-action="restart">別の国へ逃亡する</button><button class="wigu-secondary" type="button" data-action="home">案内所のトップへ戻る</button></div>' +
          renderDebug(result) +
        '</section>';
      main.querySelector('[data-action="save-image"]').addEventListener("click", function (event) { saveResultImage(result, event.currentTarget); });
      main.querySelector('[data-action="share"]').addEventListener("click", shareResult);
      main.querySelector('[data-action="copy"]').addEventListener("click", function (event) { copyResult(result, event.currentTarget); });
      main.querySelector('[data-action="all-map"]').addEventListener("click", renderAllDestinationMap);
      main.querySelector('[data-action="restart"]').addEventListener("click", function () {
        state.answers = [];
        state.questionIndex = 0;
        state.result = null;
        clearProgress();
        renderQuestion();
      });
      main.querySelector('[data-action="home"]').addEventListener("click", renderHome);
    }

    function buildShareText(result) {
      var url = SHARE_URL || window.location.href;
      return APP_TITLE + "\n会社を辞めたあなたの行き先は&#8230;&#8230;\n\n第1候補: " + cleanDisplayText(result.first.destination.city) + " " + result.first.lifestyleScore + "%\n第2候補: " + cleanDisplayText(result.second.destination.city) + " " + result.second.lifestyleScore + "%\n\n" + cleanDisplayText(result.type.name) + "\n" + cleanDisplayText(result.type.oneLiner) + "\n\n#移住場所勝手に案内所 #FIRE\n" + url;
    }

    function shareResult() {
      if (!state.result) return;
      var text = encodeURIComponent(buildShareText(state.result));
      var url = "https://twitter.com/intent/tweet?text=" + text;
      window.open(url, "_blank", "noopener,noreferrer");
    }

    function copyResult(result, button) {
      var text = buildShareText(result);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          button.textContent = "コピーしました";
          window.setTimeout(function () { button.textContent = "結果テキストをコピー"; }, 1800);
        }).catch(function () { window.prompt("結果テキストをコピーしてください", text); });
      } else {
        window.prompt("結果テキストをコピーしてください", text);
      }
    }

    /*
     * 画像保存は簡易カードに限定しています&#12290;
     * Canvasへ絵文字を大量に描画せず&#12289;UTF-8の日本語を端末標準フォントで描画することで&#12289;
     * 端末ごとの絵文字フォント差による文字化け&#12539;欠落を避けます&#12290;
     */
    function drawWrappedText(context, value, x, y, maxWidth, lineHeight, maxLines) {
      var characters = Array.from(cleanDisplayText(value));
      var lines = [];
      var line = "";
      characters.forEach(function (character) {
        if (character === "\n") {
          lines.push(line);
          line = "";
          return;
        }
        var candidate = line + character;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = candidate;
        }
      });
      if (line || !lines.length) lines.push(line);
      if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        var last = lines.length - 1;
        while (context.measureText(lines[last] + "&#8230;").width > maxWidth && lines[last].length > 1) {
          lines[last] = lines[last].slice(0, -1);
        }
        lines[last] += "&#8230;";
      }
      lines.forEach(function (text, index) {
        context.fillText(text, x, y + index * lineHeight);
      });
      return y + lines.length * lineHeight;
    }

    function drawCanvasText(context, value, x, y) {
      context.fillText(cleanDisplayText(value), x, y);
    }

    function saveResultImage(result, button) {
      var canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1500;
      var context = canvas.getContext("2d");
      var fontFamily = '"Yu Gothic", "YuGothic", "Meiryo", "Hiragino Kaku Gothic ProN", sans-serif';
      var first = result.first;
      var second = result.second;
      var type = result.type;
      var firstName = cleanDisplayText(first.destination.city);
      var secondName = cleanDisplayText(second.destination.city);
      context.fillStyle = "#fffaf0";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#e74735";
      context.fillRect(0, 0, canvas.width, 310);
      context.fillStyle = "#ffd34b";
      context.font = "900 30px " + fontFamily;
      drawCanvasText(context, "WORLD FIRE DESTINATION", 70, 75);
      context.fillStyle = "#ffffff";
      context.font = "900 54px " + fontFamily;
      drawCanvasText(context, "移住場所 勝手に案内所", 70, 155);
      context.font = "700 34px " + fontFamily;
      drawCanvasText(context, "海外編&#65372;会社を辞めたあなたの行き先", 70, 220);
      context.fillStyle = "#202a36";
      context.font = "900 30px " + fontFamily;
      drawCanvasText(context, "第1候補", 70, 390);
      context.fillStyle = "#173b59";
      context.font = "900 72px " + fontFamily;
      drawCanvasText(context, firstName, 70, 480);
      context.fillStyle = "#68727c";
      context.font = "700 30px " + fontFamily;
      drawCanvasText(context, first.destination.country + " / " + first.destination.region, 70, 535);
      context.fillStyle = "#e74735";
      context.font = "900 44px " + fontFamily;
      drawCanvasText(context, "暮らし相性 " + first.lifestyleScore + "%", 70, 630);
      context.fillStyle = "#202a36";
      context.font = "700 31px " + fontFamily;
      drawCanvasText(context, "FIRE相性 " + first.fireScore + "%", 70, 690);
      drawCanvasText(context, "移住現実度 " + renderStars(first.destination.visaPracticality), 70, 740);
      context.fillStyle = "#fff0aa";
      context.fillRect(55, 790, 1090, 160);
      context.fillStyle = "#202a36";
      context.font = "900 34px " + fontFamily;
      drawWrappedText(context, "&#12300;" + first.destination.catchCopy + "&#12301;", 85, 855, 1030, 48, 2);
      context.fillStyle = "#202a36";
      context.font = "900 30px " + fontFamily;
      drawCanvasText(context, "第2候補", 70, 1035);
      context.fillStyle = "#173b59";
      context.font = "900 50px " + fontFamily;
      drawCanvasText(context, secondName + "  " + second.lifestyleScore + "%", 70, 1110);
      context.fillStyle = "#5b956f";
      context.font = "900 38px " + fontFamily;
      drawCanvasText(context, type.name, 70, 1210);
      context.fillStyle = "#56636b";
      context.font = "700 28px " + fontFamily;
      drawWrappedText(context, type.oneLiner, 70, 1270, 1060, 43, 2);
      context.fillStyle = "#68727c";
      context.font = "500 22px " + fontFamily;
      drawCanvasText(context, "&#8251;エンタメ診断です&#12290;実際の移住では最新の公式情報をご確認ください&#12290;", 70, 1435);

      function finishDownload(blob) {
        var objectUrl = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = objectUrl;
        link.download = "iju-guide-overseas-" + first.destination.id + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1000);
        button.textContent = "画像を保存しました";
        window.setTimeout(function () { button.textContent = "画像を保存&#65288;PNG&#65289;"; }, 1800);
      }

      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) finishDownload(blob);
        }, "image/png");
      } else {
        var link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "iju-guide-overseas-" + first.destination.id + ".png";
        link.click();
        button.textContent = "画像を保存しました";
        window.setTimeout(function () { button.textContent = "画像を保存&#65288;PNG&#65289;"; }, 1800);
      }
    }

    function getResultForAnswers(answerIndexes) {
      return buildResult(answerIndexes.map(function (value) { return Number(value); }));
    }

    window.WorldIjuGuide = {
      questions: questions,
      destinations: destinations,
      typeDefinitions: TYPE_DEFINITIONS,
      getResultForAnswers: getResultForAnswers,
      calculatePreferences: calculatePreferences,
      calculateLifestyleScore: calculateLifestyleScore,
      calculateFireScore: calculateFireScore,
      calculateVisaReality: calculateVisaReality,
      calculateMismatchPenalty: calculateMismatchPenalty,
      calculateFinalScore: calculateFinalScore,
      selectFirstDestination: selectFirstDestination,
      selectSecondDestination: selectSecondDestination,
      determineFireType: determineFireType
    };

    renderHome();
  }());

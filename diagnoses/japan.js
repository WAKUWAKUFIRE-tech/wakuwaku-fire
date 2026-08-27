
    (function () {
      "use strict";

      /* ===== 公開後も変更しやすい設定 ===== */
      const SHARE_URL = "https://wakuwaku-fire-git.pages.dev/fire-migration-japan/";
      const DEBUG_MODE = false;
      const APP_TITLE = "移住場所 勝手に案内所";

      const app = document.getElementById("iju-guide-app");
      const main = document.getElementById("iju-guide-main");
      if (!app || !main) return;

      const AXIS_KEYS = [
        "urban", "quiet", "nature", "sea", "mountain", "warm", "coolSummer",
        "snow", "lowCost", "carFree", "transport", "airport", "community", "work"
      ];

      const AXIS_LABELS = {
        urban: "都会の便利さ",
        quiet: "静かな生活",
        nature: "自然への近さ",
        sea: "海への憧れ",
        mountain: "山への憧れ",
        warm: "暖かい気候",
        coolSummer: "涼しい夏",
        snow: "雪を楽しむ気持ち",
        lowCost: "生活費の軽さ",
        carFree: "車なし生活",
        transport: "広域交通",
        airport: "空港アクセス",
        community: "人とのつながり",
        work: "仕事の選択肢"
      };

      const AXIS_ICONS = {
        urban: "🏙", quiet: "🌙", nature: "🌿", sea: "🌊", mountain: "⛰",
        warm: "☀️", coolSummer: "🍃", snow: "❄️", lowCost: "💰", carFree: "🚃",
        transport: "🚄", airport: "✈️", community: "🤝", work: "💼"
      };

      const REASON_COPY = {
        urban: "街の便利さを手放さずに暮らせそう",
        quiet: "人混みから少し離れた、落ち着く毎日をつくれそう",
        nature: "自然を「休日だけ」ではなく生活の近くに置けそう",
        sea: "海との距離を、行きたいときに行ける近さにできそう",
        mountain: "山や高原を、気分転換の選択肢にしやすそう",
        warm: "冬の寒さに追われにくい暮らしを選べそう",
        coolSummer: "夏の暑さから少し逃げられそう",
        snow: "雪も含めて、季節の変化を楽しめそう",
        lowCost: "家賃と生活費に余白をつくりやすそう",
        carFree: "車に縛られない暮らしを組み立てやすそう",
        transport: "大都市へ出る用事も、無理なくこなせそう",
        airport: "飛行機で遠くへ出る日のハードルが低そう",
        community: "地域に顔見知りを増やしたい気持ちを受け止めてくれそう",
        work: "働き方を変えた後の選択肢も残しやすそう"
      };

      const DIFFERENCE_COPY = {
        urban: "街の便利さ",
        quiet: "人混みからの距離",
        nature: "自然の近さ",
        sea: "海との距離",
        mountain: "山・高原への近さ",
        warm: "冬の暖かさ",
        coolSummer: "夏の涼しさ",
        snow: "雪のある季節",
        lowCost: "家賃と生活費の余白",
        carFree: "車なし生活のしやすさ",
        transport: "新幹線などの移動",
        airport: "空港へのアクセス",
        community: "地域とのつながり",
        work: "仕事・商売の選択肢"
      };

      function makeAnswer(emoji, text, points, constraints) {
        return { emoji: emoji, text: text, points: points || {}, constraints: constraints || {} };
      }

      /* 質問データ。A/B/Cの数ではなく、複数の生活軸へ重みを分散します。 */
      const questions = [
        {
          text: "会社を辞めた翌朝。窓を開けたら、どんな景色がいい？",
          answers: [
            makeAnswer("🏙", "ビルや店が見える。便利が正義", { urban: 4, carFree: 2, transport: 2, work: 1 }),
            makeAnswer("🌳", "緑が見えるくらいがちょうどいい", { quiet: 3, nature: 3, urban: 2 }),
            makeAnswer("🏔", "山・海・自然ドーン！がいい", { nature: 5, sea: 2, mountain: 2, quiet: 2 })
          ]
        },
        {
          text: "徒歩5分の場所に絶対ほしいものは？",
          answers: [
            makeAnswer("🚉", "駅・スーパー・飲食店。全部ほしい", { urban: 5, carFree: 4, transport: 2, work: 1 }, { needUrban: 4, avoidCar: 3 }),
            makeAnswer("🛒", "スーパーとコンビニがあればOK", { urban: 3, carFree: 2, lowCost: 2, quiet: 1 }),
            makeAnswer("🌿", "何もなくても静かならOK", { quiet: 5, lowCost: 3, nature: 3 }, { needQuiet: 4, needLowCost: 3 })
          ]
        },
        {
          text: "車のある生活、どう思う？",
          answers: [
            makeAnswer("🚃", "できれば一生持ちたくない", { carFree: 5, urban: 3, transport: 3 }, { avoidCar: 5, needUrban: 4, needTransport: 4 }),
            makeAnswer("🚙", "あってもなくてもいい", { carFree: 2, quiet: 1, nature: 1, urban: 1 }),
            makeAnswer("🚗", "むしろ車で自由に走りたい", { nature: 4, quiet: 2, mountain: 2, lowCost: 1 })
          ]
        },
        {
          text: "真夏のあなた。",
          answers: [
            makeAnswer("🥵", "暑いの無理。涼しいところへ逃げたい", { coolSummer: 5, quiet: 1, nature: 1 }, { avoidWarm: 5, needCoolSummer: 4 }),
            makeAnswer("☀️", "夏は暑くて当然", { warm: 2, coolSummer: 2, nature: 1 }),
            makeAnswer("🌴", "暑い方がテンション上がる", { warm: 5, sea: 2, nature: 1 }, { needWarm: 5 })
          ]
        },
        {
          text: "雪が積もりました。",
          answers: [
            makeAnswer("😱", "いやいやいや、勘弁してください", { warm: 3, quiet: 1 }, { avoidSnow: 5, needWarm: 3 }),
            makeAnswer("⛄", "多少なら季節感あっていい", { snow: 2, coolSummer: 1, nature: 1 }),
            makeAnswer("❄️", "雪国生活、ちょっと憧れる", { snow: 5, coolSummer: 2, nature: 2 }, { needSnow: 5 })
          ]
        },
        {
          text: "家について一番大事なのは？",
          answers: [
            makeAnswer("💰", "家賃を下げて自由度を上げたい", { lowCost: 5, quiet: 2, nature: 1 }, { needLowCost: 5 }),
            makeAnswer("🏠", "広さと便利さのバランス", { lowCost: 3, urban: 3, quiet: 2 }),
            makeAnswer("📍", "高くても立地を優先したい", { urban: 5, carFree: 3, transport: 2 }, { needUrban: 4, avoidCar: 3 })
          ]
        },
        {
          text: "会社を辞めた後の昼メシ。",
          answers: [
            makeAnswer("🍜", "店が100軒くらいあってほしい", { urban: 5, carFree: 2, work: 1 }),
            makeAnswer("🍱", "お気に入りが何軒かあれば十分", { urban: 2, community: 1, quiet: 1 }),
            makeAnswer("🍳", "自炊するし選択肢は少なくてもOK", { quiet: 3, lowCost: 3, nature: 1 })
          ]
        },
        {
          text: "休日に一番やりたいのは？",
          answers: [
            makeAnswer("🎬", "買い物・イベント・カフェ・街歩き", { urban: 5, transport: 2, carFree: 2, work: 1 }),
            makeAnswer("🚲", "散歩・サイクリング・公園", { nature: 3, quiet: 3, urban: 1 }),
            makeAnswer("🏕", "登山・キャンプ・釣り・アウトドア", { nature: 5, mountain: 4, quiet: 3 }, { needNature: 4, needMountain: 4 })
          ]
        },
        {
          text: "海まで30分。どう感じる？",
          answers: [
            makeAnswer("🤷", "別になくてもいい", { urban: 1, quiet: 1 }),
            makeAnswer("🌊", "たまに行けるとうれしい", { sea: 3, nature: 1 }),
            makeAnswer("🏖", "それ最高。海の近くに住みたい", { sea: 5, warm: 1, nature: 2 }, { needSea: 5 })
          ]
        },
        {
          text: "山まで30分。どう感じる？",
          answers: [
            makeAnswer("🤷", "特に必要ない", { urban: 1 }),
            makeAnswer("🌲", "近ければうれしい", { mountain: 3, nature: 2 }),
            makeAnswer("⛰", "めちゃくちゃ重要", { mountain: 5, nature: 3, quiet: 1 }, { needMountain: 5 })
          ]
        },
        {
          text: "東京や大阪へ遊びに行く頻度は？",
          answers: [
            makeAnswer("🚄", "すぐ行ける距離じゃないと困る", { transport: 5, urban: 3, airport: 2 }, { needTransport: 5 }),
            makeAnswer("🧳", "数時間なら問題なし", { transport: 3, airport: 2, quiet: 1 }),
            makeAnswer("🌏", "ほとんど行かなくてもいい", { quiet: 3, nature: 2, lowCost: 1 })
          ]
        },
        {
          text: "飛行機で旅行するとしたら？",
          answers: [
            makeAnswer("✈️", "空港アクセスはかなり重要", { airport: 5, transport: 2, urban: 1 }, { needAirport: 5 }),
            makeAnswer("🛫", "多少遠くても問題なし", { airport: 2, transport: 1, lowCost: 1 }),
            makeAnswer("🏡", "そもそもそんなに飛行機に乗らない", { quiet: 2, lowCost: 2, nature: 1 })
          ]
        },
        {
          text: "人との距離感は？",
          answers: [
            makeAnswer("🙈", "基本ほっといてほしい", { quiet: 5, lowCost: 1 }, { avoidCommunity: 5, needQuiet: 4 }),
            makeAnswer("🙂", "ゆるく顔見知りが増えるくらい", { community: 3, quiet: 2, nature: 1 }),
            makeAnswer("🤝", "地域の人とも仲良くなりたい", { community: 5, work: 2, quiet: 1 }, { needCommunity: 5 })
          ]
        },
        {
          text: "仕事を辞めても、また働く可能性は？",
          answers: [
            makeAnswer("💻", "在宅や個人でちょっと稼げればいい", { work: 3, lowCost: 2, quiet: 2 }),
            makeAnswer("🧑‍💼", "必要なら現地で働くかも", { work: 4, urban: 2, transport: 1 }),
            makeAnswer("🔥", "むしろ新しい仕事や商売もやりたい", { work: 5, community: 3, urban: 2 }, { needWork: 5, needCommunity: 2 })
          ]
        },
        {
          text: "家を出た瞬間、人がたくさんいます。",
          answers: [
            makeAnswer("😆", "活気があって最高", { urban: 5, carFree: 2, community: 2 }),
            makeAnswer("🙂", "ほどほどならOK", { urban: 2, quiet: 2, community: 1 }),
            makeAnswer("😵", "人混みはもう卒業したい", { quiet: 5, nature: 2, lowCost: 1 }, { avoidCrowds: 5, needQuiet: 4 })
          ]
        },
        {
          text: "移住後の理想の生活費は？",
          answers: [
            makeAnswer("💰", "とにかく固定費を小さくしたい", { lowCost: 5, quiet: 1, nature: 1 }, { needLowCost: 5 }),
            makeAnswer("⚖️", "無理なく暮らせればOK", { lowCost: 3, quiet: 1, urban: 1 }),
            makeAnswer("✨", "お金より暮らしの楽しさ優先", { urban: 2, nature: 2, work: 1 })
          ]
        },
        {
          text: "会社を辞めて一番欲しいものは？",
          answers: [
            makeAnswer("🎉", "刺激のある毎日", { urban: 4, work: 2, transport: 1 }),
            makeAnswer("🌱", "ゆとりのある毎日", { quiet: 3, nature: 2, community: 1 }),
            makeAnswer("🦥", "何にも追われない毎日", { quiet: 5, nature: 3, lowCost: 2 }, { needQuiet: 5, needNature: 3 })
          ]
        },
        {
          text: "最後です。突然1000万円もらいました。どこへ引っ越す？",
          answers: [
            makeAnswer("🏙", "一度くらい都会生活を満喫する", { urban: 5, transport: 3, work: 2, carFree: 1 }, { needUrban: 4 }),
            makeAnswer("🌊", "自然と街の「いいとこ取り」を探す", { nature: 3, sea: 2, urban: 3, transport: 1 }),
            makeAnswer("🏡", "家賃を下げて、のんびり暮らす", { lowCost: 5, quiet: 4, nature: 3 }, { needLowCost: 4, needQuiet: 3 })
          ]
        }
      ];

      /* 各都市は生活スタイルとの相性を見るための、1〜5の目安値です。 */
      const destinations = [
        {
          key: "sapporo", name: "札幌", region: "北海道", emoji: "❄️",
          catchCopy: "街の便利さと、夏の涼しさを両取りしたいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 4, sea: 3, mountain: 4, warm: 1, coolSummer: 5, snow: 5, lowCost: 3, carFree: 4, transport: 4, airport: 5, community: 2, work: 4 },
          goodPoints: ["地下鉄と街の選択肢がしっかりある", "夏の暑さから逃げやすい", "自然への入口も意外と近い"],
          cautionPoints: [{ axis: "snow", text: "冬の雪かきと移動は、想像より生活の一部。" }, { axis: "warm", text: "寒さと日照時間の短さが苦手なら、冬の下見は必須。" }, { axis: "community", text: "地域との距離感は、住むエリアで印象が変わる。" }],
          lifestyle: ["朝は地下鉄で街へ出て、昼は気になる店を開拓。", "夏は公園や近郊へ逃げ、冬は家でじっくり趣味。", "便利さを残しながら、季節の濃さも楽しむ毎日です。"]
        },
        {
          key: "sendai", name: "仙台", region: "東北", emoji: "🌿",
          catchCopy: "都市のサイズ感と、山・海への逃げ道を両方ほしいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 4, sea: 3, mountain: 4, warm: 2, coolSummer: 3, snow: 3, lowCost: 3, carFree: 4, transport: 5, airport: 4, community: 3, work: 4 },
          goodPoints: ["街がコンパクトで日常の移動を組み立てやすい", "新幹線・空港の選択肢がある", "海も山も休日の候補になる"],
          cautionPoints: [{ axis: "warm", text: "冬の寒さはあるので、暖かさを最優先するなら要比較。" }, { axis: "carFree", text: "中心部を外れると、車があると自由度が上がる。" }, { axis: "community", text: "人付き合いの濃さは、エリアと参加する場で変わる。" }],
          lifestyle: ["朝は街なかのカフェへ、休日は電車や車で海・山へ。", "遠出したくなれば新幹線や空港が背中を押してくれる。", "地方都市らしい余白と、都会への接続をほどよく持てます。"]
        },
        {
          key: "takasaki", name: "高崎", region: "関東", emoji: "🚄",
          catchCopy: "家賃を抑えつつ、東京へ出るカードも残したいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 3, sea: 1, mountain: 4, warm: 3, coolSummer: 2, snow: 2, lowCost: 4, carFree: 2, transport: 5, airport: 2, community: 3, work: 3 },
          goodPoints: ["新幹線で広域移動の予定を残せる", "住まいの広さと家賃のバランスを取りやすい", "山・温泉方面へ気軽に逃げられる"],
          cautionPoints: [{ axis: "carFree", text: "駅から離れるほど、車があると日常がラク。" }, { axis: "sea", text: "海の近さを重視する人には、距離が気になるかも。" }, { axis: "coolSummer", text: "夏の暑さが苦手なら、住まいの断熱や立地を確認したい。" }],
          lifestyle: ["平日は駅の近くで身軽に暮らし、必要なときだけ東京へ。", "休日は山や温泉へ向かい、家賃の余白は趣味に回す。", "都会を完全には捨てない、現実派の移住生活です。"]
        },
        {
          key: "tsukuba", name: "つくば", region: "関東", emoji: "🛰️",
          catchCopy: "落ち着きと仕事の選択肢を、研究都市の空気の中で両立したいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 4, sea: 1, mountain: 3, warm: 3, coolSummer: 2, snow: 1, lowCost: 3, carFree: 2, transport: 4, airport: 3, community: 3, work: 5 },
          goodPoints: ["仕事・学びの選択肢が残りやすい", "公園や緑のスケールが大きい", "都心へ出るルートも確保しやすい"],
          cautionPoints: [{ axis: "carFree", text: "研究学園都市らしい広さが、車なしでは不便に出ることも。" }, { axis: "sea", text: "海辺の暮らしを求めるなら、別の候補と比べたい。" }, { axis: "urban", text: "夜まで街の刺激がほしい人は物足りなさを感じるかも。" }],
          lifestyle: ["広い空の下で仕事をし、夕方は公園を歩いて頭を切り替える。", "必要な日はつくばエクスプレスで都心へ。", "落ち着きと知的な刺激が、同じ生活圏にあります。"]
        },
        {
          key: "tokyo-tama", name: "東京・多摩エリア", region: "関東", emoji: "🚉",
          catchCopy: "東京の仕事と便利さを残しながら、少しだけ呼吸を深くしたいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 3, sea: 1, mountain: 3, warm: 3, coolSummer: 2, snow: 1, lowCost: 2, carFree: 4, transport: 5, airport: 3, community: 2, work: 5 },
          goodPoints: ["鉄道で買い物・仕事・遊びをつなげやすい", "多摩丘陵や公園が生活の近くにある", "東京の選択肢を残したまま住環境を選べる"],
          cautionPoints: [{ axis: "lowCost", text: "都内側に近いほど、家賃の余白は小さくなりやすい。" }, { axis: "quiet", text: "駅近の便利さと静けさは、エリア選びでトレードオフ。" }, { axis: "sea", text: "海の近さより、鉄道と丘の暮らしが得意な候補。" }],
          lifestyle: ["朝は近所の緑を歩き、必要な日は電車で都心へ。", "休日は多摩の公園や商店街を回り、刺激もすぐ補給する。", "会社を辞めても、東京を完全に辞めない選択です。"]
        },
        {
          key: "yokohama", name: "横浜", region: "関東", emoji: "🚢",
          catchCopy: "海の気配と都会の便利さを、どちらも日常にしたいあなたへ。",
          profile: { urban: 5, quiet: 2, nature: 2, sea: 4, mountain: 1, warm: 3, coolSummer: 2, snow: 1, lowCost: 2, carFree: 5, transport: 5, airport: 4, community: 2, work: 5 },
          goodPoints: ["電車・店・仕事の選択肢が多い", "海辺の散歩を生活に組み込みやすい", "東京方面への移動が軽い"],
          cautionPoints: [{ axis: "lowCost", text: "家賃を下げて自由度を上げたい人には、場所選びが重要。" }, { axis: "quiet", text: "静けさと人の少なさを最優先するなら、駅距離を要確認。" }, { axis: "nature", text: "山や大自然を毎日の近くに置きたい人には少し都会的。" }],
          lifestyle: ["朝は海の風を感じ、昼は気になる街でランチ。", "気分が変われば、電車で東京にも横浜の別エリアにも行ける。", "便利さを辞めずに、暮らしの景色だけ変える毎日です。"]
        },
        {
          key: "fujisawa-chigasaki", name: "藤沢・茅ヶ崎", region: "関東", emoji: "🏖",
          catchCopy: "海までの距離を、休日ではなく生活のリズムにしたいあなたへ。",
          profile: { urban: 3, quiet: 3, nature: 3, sea: 5, mountain: 1, warm: 4, coolSummer: 1, snow: 1, lowCost: 2, carFree: 4, transport: 4, airport: 2, community: 3, work: 3 },
          goodPoints: ["海辺の散歩や自転車を日常にできる", "街の機能とローカル感のバランスがある", "都心へ出るルートも残せる"],
          cautionPoints: [{ axis: "lowCost", text: "海の近さにこだわるほど、家賃は上がりやすい。" }, { axis: "coolSummer", text: "夏の暑さと湿気が苦手なら、海沿いの下見は必須。" }, { axis: "work", text: "現地で新しい仕事を探すなら、通勤圏も含めて考えたい。" }],
          lifestyle: ["朝は海まで歩き、昼は駅の近くでお気に入りを見つける。", "夕方、サーフィンや散歩の人に混ざって一日を締める。", "会社を辞めた理由を、海風が毎日思い出させてくれます。"]
        },
        {
          key: "toyama", name: "富山", region: "北陸", emoji: "🏔",
          catchCopy: "静かな街、山、海、そして暮らしのコストを丁寧に選びたいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 5, sea: 4, mountain: 5, warm: 2, coolSummer: 4, snow: 4, lowCost: 4, carFree: 2, transport: 3, airport: 3, community: 3, work: 3 },
          goodPoints: ["山と海の両方が生活圏に入る", "住まいにゆとりを持たせやすい", "路面電車のある中心部は歩いて暮らせる"],
          cautionPoints: [{ axis: "snow", text: "雪と雨の季節を、暮らしの一部として受け入れたい。" }, { axis: "carFree", text: "中心部以外では、車があると行動範囲が広がる。" }, { axis: "work", text: "仕事の選択肢を広く残したい場合は、働き方を先に確認。" }],
          lifestyle: ["朝は立山連峰を眺め、昼は路面電車で街へ。", "休日は海の幸か、山の温泉か、その日の気分で決める。", "静けさと自然の密度を、家賃の余白と一緒に味わいます。"]
        },
        {
          key: "kanazawa", name: "金沢", region: "北陸", emoji: "🍵",
          catchCopy: "街歩きの楽しさと、落ち着いた日常を同時に持ちたいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 3, sea: 3, mountain: 3, warm: 2, coolSummer: 3, snow: 3, lowCost: 3, carFree: 3, transport: 3, airport: 3, community: 4, work: 4 },
          goodPoints: ["食・工芸・街歩きの楽しみが身近", "都市としての機能と歴史ある景色がある", "地域との接点をつくるきっかけが多い"],
          cautionPoints: [{ axis: "snow", text: "冬の雪・雨の日の移動は、暮らす目線で確認したい。" }, { axis: "carFree", text: "観光では歩けても、生活では車が便利な場面もある。" }, { axis: "lowCost", text: "人気エリアは、地方都市のイメージより家賃が上がることも。" }],
          lifestyle: ["朝は市場や喫茶店へ、昼は工芸と古い街並みを歩く。", "知り合いが少しずつ増え、季節の行事も自分の予定になる。", "観光地を、観光しない日にも楽しめる暮らしです。"]
        },
        {
          key: "matsumoto", name: "松本", region: "甲信越", emoji: "🏯",
          catchCopy: "山の近くで静かに暮らしながら、街の文化も手放したくないあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 5, sea: 1, mountain: 5, warm: 2, coolSummer: 4, snow: 3, lowCost: 4, carFree: 2, transport: 3, airport: 2, community: 4, work: 3 },
          goodPoints: ["山・高原・温泉へのアクセスが強い", "小さな街に店や文化の選択肢がある", "家賃と暮らしのサイズを調整しやすい"],
          cautionPoints: [{ axis: "sea", text: "海を日常の近くに置きたい人には、方向性が違う。" }, { axis: "carFree", text: "郊外の自然を楽しむには、車があると自由度が高い。" }, { axis: "warm", text: "朝晩の冷え込みと冬の生活を想像しておきたい。" }],
          lifestyle: ["朝は山を見ながら仕事をして、午後は街の本屋へ。", "休日は高原・温泉・登山のどれかへ、気軽にリセット。", "人間より山と仲良くしたい気分を、ちゃんと受け止めます。"]
        },
        {
          key: "mishima-numazu", name: "三島・沼津", region: "東海", emoji: "🗻",
          catchCopy: "富士山と海、東京への接続を欲張りに組み合わせたいあなたへ。",
          profile: { urban: 3, quiet: 3, nature: 4, sea: 4, mountain: 4, warm: 3, coolSummer: 2, snow: 1, lowCost: 3, carFree: 3, transport: 5, airport: 2, community: 3, work: 3 },
          goodPoints: ["新幹線で東京・関西への用事を残せる", "海と山を休日の選択肢にできる", "駅周辺と郊外で住み方を選べる"],
          cautionPoints: [{ axis: "airport", text: "飛行機移動を最優先する場合は、空港までの動線を確認。" }, { axis: "carFree", text: "自然の細かなスポット巡りは、車があると便利。" }, { axis: "urban", text: "大都市の夜の刺激を毎日ほしい人は物足りないかも。" }],
          lifestyle: ["朝は富士山を確認し、昼は海の近くで定食を食べる。", "急な東京の予定も新幹線で対応、戻れば空気はゆっくり。", "都会と自然のいいとこ取りを、移動距離で実現します。"]
        },
        {
          key: "shizuoka", name: "静岡", region: "東海", emoji: "🍵",
          catchCopy: "温暖さ、街の使いやすさ、海と山の近さをバランスよく選びたいあなたへ。",
          profile: { urban: 3, quiet: 3, nature: 4, sea: 4, mountain: 3, warm: 4, coolSummer: 2, snow: 1, lowCost: 3, carFree: 3, transport: 4, airport: 2, community: 3, work: 4 },
          goodPoints: ["海・山・街の距離がほどよい", "比較的温暖で雪の心配が少ない", "新幹線で東西へ出やすい"],
          cautionPoints: [{ axis: "coolSummer", text: "涼しい夏を最優先するなら、暑さ対策は必要。" }, { axis: "airport", text: "空港アクセス重視なら、他都市と所要時間を比較したい。" }, { axis: "carFree", text: "住む場所によっては、車があると日常がラクになる。" }],
          lifestyle: ["朝は海と富士山の気配を感じ、昼は街の店を巡る。", "休日はお茶畑や山へ、遠出したい日は新幹線へ。", "気候と移動のバランスで、無理のない移住をつくれます。"]
        },
        {
          key: "nagoya", name: "名古屋", region: "東海", emoji: "🚅",
          catchCopy: "仕事・交通・街の便利さを、家賃とのバランスで現実的に残したいあなたへ。",
          profile: { urban: 5, quiet: 2, nature: 2, sea: 2, mountain: 1, warm: 3, coolSummer: 2, snow: 1, lowCost: 3, carFree: 4, transport: 5, airport: 4, community: 2, work: 5 },
          goodPoints: ["新幹線・空港・在来線の選択肢が豊富", "働き方を変えるときの仕事の層が厚い", "大都市の便利さを比較的現実的に選べる"],
          cautionPoints: [{ axis: "quiet", text: "静かさや自然の濃さを最優先するなら、郊外まで視野に入れたい。" }, { axis: "coolSummer", text: "夏の暑さと湿気が苦手なら、住まい選びは慎重に。" }, { axis: "sea", text: "海辺の散歩を日課にしたい人には、少し距離がある。" }],
          lifestyle: ["朝は駅近で仕事、昼は選択肢の多い街でランチ。", "東京にも大阪にも出られ、暮らしの拠点は名古屋に置く。", "会社を辞めても、次の仕事のカードを手元に残せます。"]
        },
        {
          key: "kyoto", name: "京都", region: "関西", emoji: "⛩️",
          catchCopy: "文化のある街で、歩ける日常と人の気配を味わいたいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 3, sea: 1, mountain: 3, warm: 3, coolSummer: 2, snow: 1, lowCost: 2, carFree: 4, transport: 4, airport: 2, community: 4, work: 4 },
          goodPoints: ["歩いて楽しめる街の密度がある", "文化・店・学びの選択肢が多い", "山の気配も街の近くにある"],
          cautionPoints: [{ axis: "lowCost", text: "人気エリアの家賃と観光シーズンの混雑は、先に確認したい。" }, { axis: "quiet", text: "静かな暮らしを求めるなら、観光動線から少し離れる工夫が必要。" }, { axis: "airport", text: "飛行機移動の多さを重視する場合は、空港までの時間を要確認。" }],
          lifestyle: ["朝は近所の寺社や川沿いを歩き、昼は小さな店へ。", "季節の景色が生活の背景になり、知りたいことも尽きない。", "観光客のいない時間帯に、京都を自分の街にしていきます。"]
        },
        {
          key: "osaka", name: "大阪", region: "関西", emoji: "🐙",
          catchCopy: "人の気配、店の多さ、交通の強さを、肩の力を抜いて楽しみたいあなたへ。",
          profile: { urban: 5, quiet: 1, nature: 1, sea: 2, mountain: 1, warm: 3, coolSummer: 2, snow: 1, lowCost: 3, carFree: 5, transport: 5, airport: 5, community: 3, work: 5 },
          goodPoints: ["店・仕事・遊びの選択肢がとにかく多い", "車なしで動きやすい", "新幹線・空港・近隣都市への接続が強い"],
          cautionPoints: [{ axis: "quiet", text: "静けさと人混みからの距離を最優先する人は、エリア選びが重要。" }, { axis: "nature", text: "自然を毎日の窓から感じたいなら、別候補との比較を。" }, { axis: "community", text: "人の多さと地域のつながりは、同じものではないので場を選びたい。" }],
          lifestyle: ["朝から店が開き、昼は気分で違う街へ食べに行く。", "思い立ったら電車でどこへでも。退屈する前に予定が埋まる。", "会社を辞めても、街のほうが勝手に次の遊びを持ってきます。"]
        },
        {
          key: "kobe", name: "神戸", region: "関西", emoji: "⚓",
          catchCopy: "街・海・山の距離が近い、気分転換の多い暮らしを選びたいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 3, sea: 4, mountain: 4, warm: 3, coolSummer: 2, snow: 1, lowCost: 3, carFree: 4, transport: 4, airport: 4, community: 3, work: 4 },
          goodPoints: ["海と山が同じ生活圏にある", "街の便利さと落ち着いた住宅地を選べる", "大阪・空港方面へも動きやすい"],
          cautionPoints: [{ axis: "lowCost", text: "坂や駅距離、人気エリアで住みやすさと家賃が変わりやすい。" }, { axis: "carFree", text: "山側の住まいは、坂道と移動手段を現地で確かめたい。" }, { axis: "quiet", text: "街の刺激と静けさを両立するなら、沿線選びがカギ。" }],
          lifestyle: ["朝は坂の上から海を見て、昼は街でランチ。", "気分転換に山へ、買い物や仕事は電車で大阪方面へ。", "自然派にも都会派にも、ちょっとずつ言い訳ができます。"]
        },
        {
          key: "okayama", name: "岡山", region: "中国", emoji: "🍑",
          catchCopy: "温暖さ、交通、暮らしのコストを堅実にそろえたいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 3, sea: 3, mountain: 3, warm: 4, coolSummer: 2, snow: 1, lowCost: 4, carFree: 3, transport: 5, airport: 3, community: 3, work: 4 },
          goodPoints: ["新幹線で東西へ動きやすい", "温暖で暮らしのリズムをつくりやすい", "家賃と街の便利さのバランスが良い"],
          cautionPoints: [{ axis: "coolSummer", text: "涼しい夏を求める場合は、暑さ対策と住まいの風通しを確認。" }, { axis: "carFree", text: "中心部以外の生活では、車の有無で行動範囲が変わる。" }, { axis: "nature", text: "大自然を毎週の主役にしたい人は、周辺エリアまで見たい。" }],
          lifestyle: ["朝は駅前で用事をまとめ、昼は商店街や川沿いへ。", "遠くへ行きたい日は新幹線、家にいたい日は庭や部屋で。", "無理をしない移住の、かなり現実的な候補です。"]
        },
        {
          key: "hiroshima", name: "広島", region: "中国", emoji: "⛴️",
          catchCopy: "街の熱量と、海・島・山へ逃げられる余白を両方ほしいあなたへ。",
          profile: { urban: 4, quiet: 3, nature: 4, sea: 4, mountain: 3, warm: 4, coolSummer: 2, snow: 1, lowCost: 3, carFree: 4, transport: 4, airport: 3, community: 4, work: 4 },
          goodPoints: ["市電などで中心部を動きやすい", "海・島・山の休日を選べる", "街の仕事・店・人のつながりがある"],
          cautionPoints: [{ axis: "warm", text: "暑さが苦手な人は、夏の湿気も含めて下見したい。" }, { axis: "airport", text: "空港は市街地から距離があるため、飛行機利用の頻度を要確認。" }, { axis: "community", text: "地域のつながりは魅力でもあり、距離感の調整も必要。" }],
          lifestyle: ["朝は市電で街へ、午後は海の見える場所でひと息。", "休日は島・山・街のどこかへ出かけ、広島に戻る。", "人と自然、どちらかを諦めない日常を組み立てます。"]
        },
        {
          key: "takamatsu", name: "高松", region: "四国", emoji: "🌉",
          catchCopy: "穏やかな街のサイズで、海と人の気配を毎日に少し足したいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 4, sea: 5, mountain: 2, warm: 4, coolSummer: 2, snow: 1, lowCost: 4, carFree: 3, transport: 3, airport: 3, community: 4, work: 3 },
          goodPoints: ["瀬戸内の海と島を暮らしの背景にできる", "街がコンパクトで家賃にも余白がある", "人とのつながりをつくる場がある"],
          cautionPoints: [{ axis: "transport", text: "大都市へ頻繁に出る人は、移動時間を生活の一部として確認。" }, { axis: "carFree", text: "島や郊外まで遊ぶなら、車や自転車の選択があると便利。" }, { axis: "work", text: "現地で仕事・商売を広く探すなら、オンラインも併用したい。" }],
          lifestyle: ["朝は港や商店街を歩き、昼はうどんの店を開拓。", "午後は島へ行くか、知り合いの店で長話をする。", "せかされないのに、ちゃんと毎日が埋まる暮らしです。"]
        },
        {
          key: "fukuoka", name: "福岡", region: "九州・沖縄", emoji: "🍜",
          catchCopy: "会社は辞めたい。でも便利さと遊びの選択肢までは辞めたくないあなたへ。",
          profile: { urban: 5, quiet: 2, nature: 3, sea: 4, mountain: 2, warm: 4, coolSummer: 1, snow: 1, lowCost: 3, carFree: 5, transport: 4, airport: 5, community: 3, work: 5 },
          goodPoints: ["空港が街に近く、遠出の心理的コストが低い", "車なしで食・買い物・仕事を回しやすい", "街の熱量と海辺の逃げ道がある"],
          cautionPoints: [{ axis: "coolSummer", text: "夏の暑さと湿気が苦手なら、涼しさは期待しすぎない。" }, { axis: "quiet", text: "便利な中心部ほど、人の多さと家賃が気になることも。" }, { axis: "lowCost", text: "人気エリアは、地方都市のイメージより住居費が上がりやすい。" }],
          lifestyle: ["朝は近所を散歩し、昼はお気に入りの店でランチ。", "午後はカフェ、気が向いたら地下鉄で街へ。", "会社を辞めたのに、意外と退屈していない。そんな毎日です。"]
        },
        {
          key: "kumamoto", name: "熊本", region: "九州・沖縄", emoji: "🌋",
          catchCopy: "街の便利さ、火の国の自然、暮らしの余白をバランスよく持ちたいあなたへ。",
          profile: { urban: 3, quiet: 4, nature: 5, sea: 3, mountain: 4, warm: 4, coolSummer: 1, snow: 1, lowCost: 4, carFree: 3, transport: 3, airport: 3, community: 4, work: 4 },
          goodPoints: ["街なかの生活と郊外の自然を選べる", "阿蘇などへの休日の逃げ道が強い", "生活費と住まいの広さに余白をつくりやすい"],
          cautionPoints: [{ axis: "coolSummer", text: "夏の暑さを避けたい人には、気候の相性を要確認。" }, { axis: "carFree", text: "阿蘇など自然を満喫する日は、車があると自由度が高い。" }, { axis: "airport", text: "空港は市街地から距離があるので、頻度が高い人は動線を確認。" }],
          lifestyle: ["朝は街なかで用事を済ませ、午後は山の方へドライブ。", "家賃の余白で食と趣味を楽しみ、たまに温泉へ。", "便利と大自然のあいだを、自分のペースで往復します。"]
        },
        {
          key: "miyazaki", name: "宮崎", region: "九州・沖縄", emoji: "🌴",
          catchCopy: "冬の寒さを手放し、海とゆっくりした時間を生活の主役にしたいあなたへ。",
          profile: { urban: 2, quiet: 4, nature: 5, sea: 5, mountain: 3, warm: 5, coolSummer: 1, snow: 1, lowCost: 4, carFree: 2, transport: 2, airport: 4, community: 4, work: 2 },
          goodPoints: ["冬も海や外遊びを楽しみやすい", "自然とサーフィンなどの趣味が近い", "住まいと暮らしのコストに余白をつくりやすい"],
          cautionPoints: [{ axis: "transport", text: "大都市へ頻繁に行く人には、移動の距離が負担になりやすい。" }, { axis: "carFree", text: "生活圏によっては、車がほぼ前提になる場面もある。" }, { axis: "coolSummer", text: "涼しい夏を求める人には、気候の方向がかなり違う。" }],
          lifestyle: ["朝は海を見て、昼はお気に入りの店か自炊。", "風がよければサーフィン、疲れた日は木陰で何もしない。", "冬まで南国気分で生きたい人の、かなり正直な候補です。"]
        },
        {
          key: "kagoshima", name: "鹿児島", region: "九州・沖縄", emoji: "🌋",
          catchCopy: "温暖な街と濃い自然、人の温度をぜんぶ生活のスパイスにしたいあなたへ。",
          profile: { urban: 3, quiet: 3, nature: 5, sea: 5, mountain: 4, warm: 5, coolSummer: 1, snow: 1, lowCost: 4, carFree: 3, transport: 3, airport: 4, community: 5, work: 3 },
          goodPoints: ["桜島や海の景色が日常の背景になる", "温暖で外へ出るきっかけが多い", "地域の人とのつながりを育てやすい"],
          cautionPoints: [{ axis: "coolSummer", text: "暑さ・湿気が苦手なら、気候はしっかり確認したい。" }, { axis: "community", text: "人の温かさが魅力でも、距離感を自分でつくる工夫は必要。" }, { axis: "transport", text: "本州の大都市へ頻繁に移動するなら、時間と費用を見積もりたい。" }],
          lifestyle: ["朝は桜島を眺め、昼は市場や商店街で人と話す。", "休日は海か山へ。気分次第でフェリーに乗る。", "静かすぎず、騒がしすぎない、人の熱のある移住生活です。"]
        },
        {
          key: "naha", name: "那覇", region: "九州・沖縄", emoji: "🌺",
          catchCopy: "冬の寒さを完全に辞めて、街・海・人の熱量の中で暮らしたいあなたへ。",
          profile: { urban: 4, quiet: 2, nature: 4, sea: 5, mountain: 1, warm: 5, coolSummer: 1, snow: 1, lowCost: 2, carFree: 4, transport: 2, airport: 5, community: 4, work: 3 },
          goodPoints: ["空港が近く、島や県外へ動きやすい", "海と南国の空気を毎日の背景にできる", "車なしでも中心部は歩いて楽しめる"],
          cautionPoints: [{ axis: "lowCost", text: "家賃・物価・観光需要の影響は、南国気分だけで決めず確認したい。" }, { axis: "coolSummer", text: "暑さと湿気が苦手なら、かなり相性が分かれる。" }, { axis: "transport", text: "本州の大都市へ日帰りで頻繁に出る生活には距離がある。" }],
          lifestyle: ["朝は市場や港を歩き、昼は気になる店でゆっくり。", "暑い日は海へ、雨の日は街のアーケードへ逃げる。", "会社を辞めた後の景色を、思い切って全部変えたい人向けです。"]
        }
      ];

      let userAnswers = [];
      let currentQuestion = 0;
      let isTransitioning = false;
      let pendingResult = null;
      let toastTimer = null;
      let investigationTimers = [];
      let currentResult = null;

      function decodeEntities(value) {
        return String(value == null ? "" : value).replace(/&#(\d+);/g, function (full, code) {
          var number = Number(code);
          return number >= 0 && number <= 1114111 ? String.fromCodePoint(number) : full;
        });
      }

      function escapeHtml(value) {
        var text = decodeEntities(value);
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function scrollToTop() {
        try {
          app.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          window.scrollTo(0, 0);
        }
      }

      function clearTimers() {
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = null;
        investigationTimers.forEach(function (timer) { window.clearTimeout(timer); });
        investigationTimers = [];
      }

      function renderHome() {
        clearTimers();
        isTransitioning = false;
        main.innerHTML = [
          '<section class="iju-screen iju-home" aria-labelledby="iju-home-title">',
            '<div class="iju-sticker">18問・約2〜3分・日本全国</div>',
            '<div class="iju-home-sign">',
              '<p class="iju-sign-small">怪しいけれど、ちょっと本気な</p>',
              '<h1 id="iju-home-title">移住場所<br><span>勝手に案内所</span></h1>',
              '<p class="iju-home-subtitle">会社を辞めたあなたを、勝手に日本のどこかへ飛ばします。</p>',
            '</div>',
            '<div class="iju-home-intro">',
              '<p>もし明日から会社に行かなくていいなら、どこで暮らしますか？</p>',
              '<p>都会？海？山？暖かい場所？<br>家賃、車、気候、人付き合い、休日の過ごし方……</p>',
              '<p>18個の質問に答えるだけで、あなたの「会社を辞めた後の移住先」を勝手に決定します。</p>',
            '</div>',
            '<ul class="iju-home-checks" aria-label="診断の特徴">',
              '<li>🚃 車</li><li>🌤 気候</li><li>💰 家賃</li><li>🌊 自然</li><li>🤝 人付き合い</li>',
            '</ul>',
            '<button type="button" class="iju-primary-button" data-iju-action="start">🚪 会社を辞めて移住する</button>',
            '<p class="iju-home-note">正解・不正解はありません。あなたの暮らし方を、勝手に考えます。</p>',
          '</section>'
        ].join("");
      }

      function renderQuestion() {
        const question = questions[currentQuestion];
        if (!question) return;
        const progress = Math.round(((currentQuestion + 1) / questions.length) * 100);
        const answerIndex = userAnswers[currentQuestion];
        main.innerHTML = [
          '<section class="iju-screen iju-question-screen" aria-labelledby="iju-question-title">',
            '<div class="iju-question-top">',
              '<div class="iju-question-count">Q ' + (currentQuestion + 1) + ' / ' + questions.length + '</div>',
              '<div class="iju-question-meta">案内所の聞き込み中</div>',
            '</div>',
            '<div class="iju-progress" aria-label="診断の進み具合"><span style="width:' + progress + '%"></span></div>',
            '<p class="iju-kicker">質問 ' + String(currentQuestion + 1).padStart(2, "0") + '</p>',
            '<h1 id="iju-question-title" class="iju-question-heading">' + escapeHtml(question.text) + '</h1>',
            '<p class="iju-question-tip">いちばん「自分っぽい」ものを、直感でどうぞ。</p>',
            '<div class="iju-answer-list" role="group" aria-label="回答候補">',
              question.answers.map(function (answer, index) {
                const selected = answerIndex === index;
                return '<button type="button" class="iju-answer-button' + (selected ? ' iju-is-selected' : '') + '" data-iju-action="answer" data-iju-answer="' + index + '" aria-pressed="' + selected + '">'
                  + '<span class="iju-answer-letter">' + String.fromCharCode(65 + index) + '</span>'
                  + '<span class="iju-answer-emoji" aria-hidden="true">' + answer.emoji + '</span>'
                  + '<span>' + escapeHtml(answer.text) + '</span>'
                  + '<span class="iju-answer-arrow" aria-hidden="true">→</span>'
                  + '</button>';
              }).join(""),
            '</div>',
            '<div class="iju-question-footer">',
              '<button type="button" class="iju-back-button" data-iju-action="back">← ' + (currentQuestion === 0 ? 'タイトルへ戻る' : 'ひとつ前に戻る') + '</button>',
              '<small>回答すると自動で次へ進みます</small>',
            '</div>',
          '</section>'
        ].join("");
        scrollToTop();
      }

      function renderInvestigation() {
        main.innerHTML = [
          '<section class="iju-screen iju-investigation" aria-labelledby="iju-investigation-title">',
            '<div class="iju-search-emblem" aria-hidden="true">🗾</div>',
            '<h1 id="iju-investigation-title">あなたの移住先を<br>勝手に捜索中……</h1>',
            '<p id="iju-investigation-subtitle" class="iju-investigation-subtitle" aria-live="assertive">会社への未練を確認中……</p>',
            '<div class="iju-investigation-dots" aria-hidden="true"><i></i><i></i><i></i></div>',
          '</section>'
        ].join("");
        scrollToTop();
      }

      function calculatePreferences(answerIndexes) {
        const totals = {};
        const maxTotals = {};
        const hard = {};
        AXIS_KEYS.forEach(function (axis) {
          totals[axis] = 0;
          maxTotals[axis] = 0;
        });

        questions.forEach(function (question, questionIndex) {
          AXIS_KEYS.forEach(function (axis) {
            maxTotals[axis] += Math.max.apply(null, question.answers.map(function (answer) {
              return answer.points[axis] || 0;
            }));
          });
          const answer = question.answers[answerIndexes[questionIndex]];
          if (!answer) return;
          Object.keys(answer.points).forEach(function (axis) {
            totals[axis] = (totals[axis] || 0) + answer.points[axis];
          });
          Object.keys(answer.constraints).forEach(function (constraint) {
            hard[constraint] = Math.max(hard[constraint] || 0, answer.constraints[constraint]);
          });
        });

        const values = {};
        const weights = {};
        AXIS_KEYS.forEach(function (axis) {
          const intensity = maxTotals[axis] ? clamp(totals[axis] / maxTotals[axis], 0, 1) : 0;
          values[axis] = 1 + intensity * 4;
          weights[axis] = .65 + intensity * 1.85;
        });

        return {
          axes: values,
          values: values,
          weights: weights,
          totals: totals,
          hard: hard,
          answerIndexes: answerIndexes.slice()
        };
      }

      function calculateMismatchPenalty(destination, userPreference) {
        const profile = destination.profile;
        const hard = userPreference.hard || {};
        const lowSeverity = function (axis) { return Math.max(0, (3 - profile[axis]) / 2); };
        const highSeverity = function (axis) { return Math.max(0, (profile[axis] - 3) / 2); };
        const rules = [
          ["avoidWarm", function () { return highSeverity("warm"); }, 19],
          ["avoidSnow", function () { return highSeverity("snow"); }, 19],
          ["avoidCar", function () { return lowSeverity("carFree"); }, 20],
          ["needSea", function () { return lowSeverity("sea"); }, 19],
          ["needMountain", function () { return lowSeverity("mountain"); }, 16],
          ["needTransport", function () { return lowSeverity("transport"); }, 16],
          ["needAirport", function () { return lowSeverity("airport"); }, 15],
          ["needUrban", function () { return lowSeverity("urban"); }, 15],
          ["needQuiet", function () { return lowSeverity("quiet"); }, 16],
          ["needLowCost", function () { return lowSeverity("lowCost"); }, 16],
          ["needCommunity", function () { return lowSeverity("community"); }, 13],
          ["needWork", function () { return lowSeverity("work"); }, 13],
          ["needNature", function () { return lowSeverity("nature"); }, 14],
          ["needWarm", function () { return lowSeverity("warm"); }, 16],
          ["needCoolSummer", function () { return lowSeverity("coolSummer"); }, 15],
          ["needSnow", function () { return lowSeverity("snow"); }, 13],
          ["avoidCommunity", function () { return highSeverity("community"); }, 11],
          ["avoidCrowds", function () { return lowSeverity("quiet"); }, 14]
        ];
        let penalty = 0;
        rules.forEach(function (rule) {
          const strength = hard[rule[0]] || 0;
          if (!strength) return;
          penalty += (strength / 5) * rule[2] * rule[1]();
        });
        return Math.round(penalty * 10) / 10;
      }

      function calculateDestinationScore(destination, userPreference) {
        let weightedSimilarity = 0;
        let weightTotal = 0;
        AXIS_KEYS.forEach(function (axis) {
          const weight = userPreference.weights[axis];
          const distance = Math.abs(userPreference.values[axis] - destination.profile[axis]) / 4;
          weightedSimilarity += (1 - distance) * weight;
          weightTotal += weight;
        });
        const similarityScore = weightTotal ? (weightedSimilarity / weightTotal) * 100 : 0;
        const mismatchPenalty = calculateMismatchPenalty(destination, userPreference);
        return {
          destination: destination,
          weightedSimilarity: Math.round(similarityScore * 10) / 10,
          mismatchPenalty: mismatchPenalty,
          rawScore: similarityScore - mismatchPenalty,
          score: clamp(Math.round(similarityScore - mismatchPenalty), 0, 100)
        };
      }

      function profileSimilarity(first, second) {
        let total = 0;
        AXIS_KEYS.forEach(function (axis) {
          total += 1 - Math.abs(first.profile[axis] - second.profile[axis]) / 4;
        });
        return total / AXIS_KEYS.length;
      }

      function getTopDestinations(userPreference) {
        const scored = destinations.map(function (destination, index) {
          const result = calculateDestinationScore(destination, userPreference);
          result.order = index;
          return result;
        }).sort(function (a, b) {
          return b.rawScore - a.rawScore || b.weightedSimilarity - a.weightedSimilarity || a.order - b.order;
        });

        const first = scored[0];
        const secondCandidates = scored.slice(1).map(function (item) {
          const similarity = profileSimilarity(first.destination, item.destination);
          let diversityPenalty = Math.max(0, similarity - .68) * 10;
          if (first.destination.region === item.destination.region) diversityPenalty += 1.2;
          return Object.assign({}, item, {
            profileSimilarity: Math.round(similarity * 100) / 100,
            diversityPenalty: Math.round(diversityPenalty * 10) / 10,
            adjustedSecondScore: item.rawScore - diversityPenalty
          });
        }).sort(function (a, b) {
          return b.adjustedSecondScore - a.adjustedSecondScore || b.rawScore - a.rawScore || a.order - b.order;
        });

        return { first: first, second: secondCandidates[0], all: scored, secondCandidates: secondCandidates };
      }

      function getPersonalitySummary(userPreference) {
        return AXIS_KEYS.map(function (axis) {
          const value = userPreference.values[axis];
          return {
            axis: axis,
            label: AXIS_LABELS[axis],
            icon: AXIS_ICONS[axis],
            value: value,
            percent: clamp(Math.round(((value - 1) / 4) * 100), 0, 100),
            priority: (value - 1) * userPreference.weights[axis]
          };
        }).sort(function (a, b) {
          return b.priority - a.priority || a.axis.localeCompare(b.axis);
        }).slice(0, 4);
      }

      function getTopReasons(destination, userPreference, count) {
        const reasons = AXIS_KEYS.map(function (axis) {
          const userInterest = clamp((userPreference.values[axis] - 1) / 4, 0, 1);
          const profileStrength = destination.profile[axis] / 5;
          return {
            axis: axis,
            score: userInterest * profileStrength * userPreference.weights[axis]
          };
        }).filter(function (item) {
          return item.score > .22 && destination.profile[item.axis] >= 3;
        }).sort(function (a, b) {
          return b.score - a.score;
        });
        const selected = reasons.slice(0, count || 3).map(function (item) {
          return AXIS_ICONS[item.axis] + " " + REASON_COPY[item.axis];
        });
        if (selected.length < (count || 3)) {
          destination.goodPoints.slice(0, (count || 3) - selected.length).forEach(function (item) {
            selected.push("✨ " + item);
          });
        }
        return selected.slice(0, count || 3);
      }

      function hardForAxis(userPreference, axis) {
        const map = {
          warm: ["needWarm", "avoidWarm"], snow: ["needSnow", "avoidSnow"], carFree: ["avoidCar"],
          sea: ["needSea"], mountain: ["needMountain"], transport: ["needTransport"], airport: ["needAirport"],
          urban: ["needUrban"], quiet: ["needQuiet", "avoidCrowds"], lowCost: ["needLowCost"], community: ["needCommunity", "avoidCommunity"],
          work: ["needWork"], nature: ["needNature"], coolSummer: ["needCoolSummer"]
        };
        return (map[axis] || []).reduce(function (max, key) {
          return Math.max(max, userPreference.hard[key] || 0);
        }, 0);
      }

      function getCautions(destination, userPreference) {
        return destination.cautionPoints.map(function (item) {
          const profileGap = 6 - destination.profile[item.axis];
          const strongConcern = hardForAxis(userPreference, item.axis);
          return {
            text: item.text,
            score: profileGap * (.45 + userPreference.weights[item.axis] / 2) + strongConcern * 1.8
          };
        }).sort(function (a, b) {
          return b.score - a.score;
        }).slice(0, 2).map(function (item) {
          return "⚠️ " + item.text;
        });
      }

      function getSecondDifference(first, second, userPreference) {
        const candidates = AXIS_KEYS.map(function (axis) {
          const delta = second.profile[axis] - first.profile[axis];
          const interest = .35 + clamp((userPreference.values[axis] - 1) / 4, 0, 1);
          return { axis: axis, delta: delta, score: delta * interest * userPreference.weights[axis] };
        }).filter(function (item) { return item.delta > 0; }).sort(function (a, b) {
          return b.score - a.score || b.delta - a.delta;
        });
        const choice = candidates[0] || AXIS_KEYS.map(function (axis) {
          return { axis: axis, delta: second.profile[axis] - first.profile[axis], score: 0 };
        }).sort(function (a, b) { return b.delta - a.delta; })[0];
        return DIFFERENCE_COPY[choice.axis] || "ちょっと違う暮らしの余白";
      }

      function getPersonalityLine(userPreference) {
        const p = userPreference.values;
        if (p.urban >= 3.75 && p.carFree >= 3.75) return "会社は辞めたい。でも都会の便利さまで辞める気はない人。";
        if (p.warm >= 3.75 && p.sea >= 3.55) return "冬まで南国気分で生きたい、海辺の現実派。";
        if (p.mountain >= 3.75 && p.quiet >= 3.75) return "人間より山と仲良くしたい人。";
        if (p.lowCost >= 3.75 && p.quiet >= 3.55) return "家賃を下げて、人生の難易度まで下げたい人。";
        if (p.community >= 3.75) return "会社は辞めても、顔見知りまでは増やしたい人。";
        if (p.coolSummer >= 3.75 && p.snow < 3) return "夏は涼しく、冬はほどほどに。気候に正直な人。";
        if (p.sea >= 3.75 && p.nature >= 3.5) return "海を見ながら暮らしたい。でも買い物も諦めない人。";
        if (p.urban >= 3.5 && p.nature >= 3.5) return "便利さと自然、両方欲しがる欲張り移住民。";
        return "会社を辞めた後の人生を、ちゃんと自分で選びたい人。";
      }

      function buildResult(userPreference) {
        const destinationsResult = getTopDestinations(userPreference);
        return {
          preference: userPreference,
          first: destinationsResult.first,
          second: destinationsResult.second,
          all: destinationsResult.all,
          reasons: getTopReasons(destinationsResult.first.destination, userPreference, 3),
          secondReasons: getTopReasons(destinationsResult.second.destination, userPreference, 2),
          cautions: getCautions(destinationsResult.first.destination, userPreference),
          values: getPersonalitySummary(userPreference),
          oneLiner: getPersonalityLine(userPreference),
          difference: getSecondDifference(destinationsResult.first.destination, destinationsResult.second.destination, userPreference)
        };
      }

      function renderInvestigationAndResult() {
        isTransitioning = true;
        const preference = calculatePreferences(userAnswers);
        pendingResult = buildResult(preference);
        renderInvestigation();
        const messages = [
          "会社への未練を確認中……",
          "家賃への欲望を分析中……",
          "都会への未練を測定中……",
          "日本地図を勝手に検索中……",
          "移住先、決まりました。"
        ];
        messages.forEach(function (message, index) {
          investigationTimers.push(window.setTimeout(function () {
            const subtitle = document.getElementById("iju-investigation-subtitle");
            const title = document.getElementById("iju-investigation-title");
            if (subtitle) subtitle.textContent = decodeEntities(message);
            if (index === messages.length - 1 && title) title.innerHTML = "発見しました！";
          }, index * 400));
        });
        investigationTimers.push(window.setTimeout(function () {
          isTransitioning = false;
          currentResult = pendingResult;
          renderResult(currentResult);
        }, 2050));
      }

      function renderDestinationCard(result, rank, primary) {
        const destination = result.destination;
        return '<article class="iju-destination-card ' + (primary ? 'iju-primary-destination' : 'iju-secondary-destination') + '" aria-label="' + escapeHtml(rank + ' ' + destination.name) + '">'
          + '<div class="iju-card-label-row"><span class="iju-card-rank">' + (primary ? '🥇' : '🥈') + ' ' + rank + '</span><span class="iju-card-region">' + escapeHtml(destination.region) + '</span></div>'
          + '<div class="iju-destination-heading"><span class="iju-destination-emoji" aria-hidden="true">' + destination.emoji + '</span><h2 class="iju-destination-name">' + escapeHtml(destination.name) + '</h2></div>'
          + '<div class="iju-score-line"><strong>' + result.score + '%</strong><small>移住相性</small></div>'
          + '<p class="iju-destination-catch">「' + escapeHtml(destination.catchCopy) + '」</p>'
          + '</article>';
      }

      function renderResult(result) {
        clearTimers();
        const first = result.first.destination;
        const second = result.second.destination;
        const debugPayload = {
          userPreference: result.preference,
          first: result.first,
          second: result.second,
          allDestinations: result.all.map(function (item) {
            return { name: item.destination.name, score: item.score, weightedSimilarity: item.weightedSimilarity, mismatchPenalty: item.mismatchPenalty };
          })
        };
        main.innerHTML = [
          '<section class="iju-screen iju-result-screen" aria-labelledby="iju-result-title">',
            '<div class="iju-result-header">',
              '<p class="iju-eyebrow">🎊 勝手に移住先が決まりました</p>',
              '<h1 id="iju-result-title">あなたの次の暮らし、<br>このへんです。</h1>',
              '<p>案内所が、気候・便利さ・自然・車・お金・人付き合いから勝手に選びました。</p>',
            '</div>',
            '<div id="iju-result-share-card" class="iju-result-snapshot" aria-label="診断結果カード">',
              renderDestinationCard(result.first, "第1候補", true),
              renderDestinationCard(result.second, "第2候補", false),
            '</div>',
            '<div class="iju-result-actions">',
              '<button type="button" class="iju-secondary-button" data-iju-action="share">𝕏 結果をシェア</button>',
              '<button type="button" class="iju-ghost-button" data-iju-action="save-image">▣ 結果画像を保存</button>',
            '</div>',
            '<p id="iju-result-status" class="iju-result-status" role="status"></p>',
            '<section class="iju-result-section" aria-labelledby="iju-why-title">',
              '<h2 id="iju-why-title" class="iju-section-heading">🧭 なぜあなたに合う？</h2>',
              '<ul class="iju-reason-list">' + result.reasons.map(function (reason) { return '<li>' + escapeHtml(reason) + '</li>'; }).join("") + '</ul>',
            '</section>',
            '<section class="iju-result-section" aria-labelledby="iju-lifestyle-title">',
              '<h2 id="iju-lifestyle-title" class="iju-section-heading">🌤 こんな毎日になりそう</h2>',
              '<div class="iju-lifestyle">' + first.lifestyle.map(function (line) { return '<p>' + escapeHtml(line) + '</p>'; }).join("") + '</div>',
            '</section>',
            '<section class="iju-result-section iju-caution-section" aria-labelledby="iju-caution-title">',
              '<h2 id="iju-caution-title" class="iju-section-heading">⚠️ ちょっと待った</h2>',
              '<p class="iju-second-intro">いいことだけでは決めません。ここは、暮らす前に確認したいポイントです。</p>',
              '<ul class="iju-caution-list">' + result.cautions.map(function (caution) { return '<li>' + escapeHtml(caution) + '</li>'; }).join("") + '</ul>',
            '</section>',
            '<section class="iju-result-section" aria-labelledby="iju-second-title">',
              '<h2 id="iju-second-title" class="iju-section-heading">🥈 第2候補をのぞく</h2>',
              '<p class="iju-second-intro">同じ価値観から導かれた、ちょっと違う人生です。</p>',
              '<ul class="iju-small-reason-list">' + result.secondReasons.map(function (reason) { return '<li>' + escapeHtml(reason) + '</li>'; }).join("") + '</ul>',
              '<p class="iju-difference-line">第1候補より「' + escapeHtml(result.difference) + '」を重視するなら、こっち。</p>',
            '</section>',
            '<section class="iju-result-section" aria-labelledby="iju-values-title">',
              '<h2 id="iju-values-title" class="iju-section-heading">🔍 案内所が勝手に分析したあなた</h2>',
              '<div class="iju-bars">' + result.values.map(function (item) {
                return '<div class="iju-bar-item"><div class="iju-bar-label"><span>' + item.icon + ' ' + escapeHtml(item.label) + '</span><span>' + item.percent + '%</span></div><div class="iju-bar-track" aria-label="' + escapeHtml(item.label) + ' ' + item.percent + '%"><span style="width:' + item.percent + '%"></span></div></div>';
              }).join("") + '</div>',
            '</section>',
            '<section class="iju-result-section" aria-labelledby="iju-one-liner-title">',
              '<h2 id="iju-one-liner-title" class="iju-section-heading">💬 あなたを一言で言うと……</h2>',
              '<p class="iju-one-liner">' + escapeHtml(result.oneLiner) + '</p>',
            '</section>',
            DEBUG_MODE ? '<details class="iju-debug"><summary>DEBUG_MODE: 診断データを表示</summary><pre>' + escapeHtml(JSON.stringify(debugPayload, null, 2)) + '</pre></details>' : '',
            '<div class="iju-restart-wrap">',
              '<button type="button" class="iju-primary-button" data-iju-action="restart">🔄 もう一度、人生をやり直す</button>',
              '<p>回答を完全にリセットして、タイトル画面へ戻ります。</p>',
            '</div>',
          '</section>'
        ].join("");
        scrollToTop();
      }

      function showGuideComment(questionIndex) {
        const comments = {
          5: "案内所「なるほど。家賃にはうるさいタイプですね。」",
          11: "案内所「だいぶ行き先が絞れてきました。」",
          16: "案内所「ほぼ決まりました。会社に戻るなら今のうちです。」"
        };
        if (!comments[questionIndex]) return;
        if (toastTimer) window.clearTimeout(toastTimer);
        const toast = document.createElement("div");
        toast.className = "iju-guide-toast";
        toast.setAttribute("role", "status");
        toast.textContent = decodeEntities(comments[questionIndex]);
        app.appendChild(toast);
        toastTimer = window.setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 950);
      }

      function startDiagnosis() {
        clearTimers();
        userAnswers = [];
        currentQuestion = 0;
        currentResult = null;
        pendingResult = null;
        isTransitioning = false;
        renderQuestion();
      }

      function handleAnswer(answerIndex) {
        if (isTransitioning) return;
        const question = questions[currentQuestion];
        if (!question || !question.answers[answerIndex]) return;
        userAnswers[currentQuestion] = answerIndex;
        const answeredQuestion = currentQuestion;
        if (currentQuestion < questions.length - 1) {
          currentQuestion += 1;
          renderQuestion();
          showGuideComment(answeredQuestion);
        } else {
          renderInvestigationAndResult();
        }
      }

      function goBack() {
        if (isTransitioning) return;
        if (currentQuestion > 0) {
          currentQuestion -= 1;
          renderQuestion();
          return;
        }
        restartDiagnosis();
      }

      function restartDiagnosis() {
        clearTimers();
        userAnswers = [];
        currentQuestion = 0;
        isTransitioning = false;
        pendingResult = null;
        currentResult = null;
        renderHome();
        scrollToTop();
      }

      function resolvedShareUrl() {
        if (SHARE_URL && SHARE_URL.indexOf("example.com") === -1) return SHARE_URL;
        try {
          return window.location.href.split("#")[0];
        } catch (error) {
          return "";
        }
      }

      function buildShareText(result) {
        return "「" + APP_TITLE + "」で診断したら、\n🥇第1候補：" + decodeEntities(result.first.destination.name) + "（" + result.first.score + "%）\n🥈第2候補：" + decodeEntities(result.second.destination.name) + "（" + result.second.score + "%）\n\n会社辞めたら" + decodeEntities(result.first.destination.name) + "行けってことらしい😂\n#移住場所勝手に案内所";
      }

      function shareResult() {
        if (!currentResult) return;
        const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(buildShareText(currentResult)) + "&url=" + encodeURIComponent(resolvedShareUrl());
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        const status = document.getElementById("iju-result-status");
        if (!popup && status) status.textContent = "シェア画面を開けませんでした。ブラウザのポップアップ設定をご確認ください。";
      }

      function canvasRoundRect(context, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
      }

      function canvasWrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
        const lines = [];
        let line = "";
        Array.from(decodeEntities(text)).forEach(function (character) {
          const next = line + character;
          if (line && context.measureText(next).width > maxWidth) {
            lines.push(line);
            line = character;
          } else {
            line = next;
          }
        });
        if (line) lines.push(line);
        lines.slice(0, maxLines || lines.length).forEach(function (item, index) {
          context.fillText(item, x, y + index * lineHeight);
        });
      }

      function saveResultImage() {
        if (!currentResult) return;
        const status = document.getElementById("iju-result-status");
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1320;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable");

          const first = currentResult.first.destination;
          const second = currentResult.second.destination;
          const gradient = context.createLinearGradient(0, 0, 1080, 1320);
          gradient.addColorStop(0, "#e84738");
          gradient.addColorStop(.72, "#c93232");
          gradient.addColorStop(1, "#9e2b30");
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);

          context.fillStyle = "#ffd447";
          context.beginPath();
          context.arc(80, 35, 180, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "rgba(255, 212, 71, .65)";
          context.beginPath();
          context.arc(1060, 1280, 190, 0, Math.PI * 2);
          context.fill();

          context.textAlign = "center";
          context.fillStyle = "#242323";
          context.font = "900 31px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(APP_TITLE, 540, 96);
          context.fillStyle = "#ffffff";
          context.font = "900 30px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText("🎊 勝手に移住先が決まりました", 540, 161);

          canvasRoundRect(context, 65, 205, 950, 520, 30);
          context.fillStyle = "#fffaf0";
          context.fill();
          context.strokeStyle = "#242323";
          context.lineWidth = 7;
          context.stroke();
          context.fillStyle = "#242323";
          context.font = "900 26px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText("🥇 第1候補", 540, 258);
          context.font = "900 104px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(decodeEntities(first.emoji), 540, 390);
          context.font = "1000 65px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(decodeEntities(first.name), 540, 480);
          context.fillStyle = "#e84738";
          context.font = "1000 54px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(currentResult.first.score + "%", 540, 555);
          context.fillStyle = "#242323";
          context.font = "800 27px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          canvasWrapText(context, decodeEntities(first.catchCopy), 540, 625, 820, 40, 2);

          canvasRoundRect(context, 115, 770, 850, 280, 24);
          context.fillStyle = "#ffffff";
          context.fill();
          context.strokeStyle = "#242323";
          context.lineWidth = 6;
          context.stroke();
          context.fillStyle = "#242323";
          context.font = "900 24px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText("🥈 第2候補", 540, 820);
          context.font = "900 72px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(decodeEntities(second.emoji), 540, 905);
          context.font = "1000 46px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(decodeEntities(second.name), 540, 970);
          context.fillStyle = "#315f92";
          context.font = "900 32px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText(currentResult.second.score + "%  相性", 540, 1020);

          context.fillStyle = "#ffffff";
          context.font = "900 26px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          canvasWrapText(context, decodeEntities(currentResult.oneLiner), 540, 1132, 820, 38, 2);
          context.font = "800 23px -apple-system, BlinkMacSystemFont, 'Yu Gothic', sans-serif";
          context.fillText("#移住場所勝手に案内所", 540, 1255);

          const download = function (href) {
            const link = document.createElement("a");
            link.href = href;
            link.download = "移住場所勝手に案内所-" + first.name + ".png";
            document.body.appendChild(link);
            link.click();
            link.remove();
            if (href.indexOf("blob:") === 0) window.setTimeout(function () { URL.revokeObjectURL(href); }, 1200);
            if (status) status.textContent = "結果画像を保存しました。";
          };

          if (canvas.toBlob) {
            canvas.toBlob(function (blob) {
              if (!blob) throw new Error("Image conversion failed");
              download(URL.createObjectURL(blob));
            }, "image/png");
          } else {
            download(canvas.toDataURL("image/png"));
          }
        } catch (error) {
          if (status) status.textContent = "画像保存はこのブラウザでは利用できません。結果カードをスクリーンショットしてください。";
        }
      }

      app.addEventListener("click", function (event) {
        const target = event.target.closest ? event.target.closest("[data-iju-action]") : null;
        if (!target || !app.contains(target)) return;
        const action = target.getAttribute("data-iju-action");
        if (action === "start") startDiagnosis();
        if (action === "answer") handleAnswer(Number(target.getAttribute("data-iju-answer")));
        if (action === "back") goBack();
        if (action === "share") shareResult();
        if (action === "save-image") saveResultImage();
        if (action === "restart") restartDiagnosis();
      });

      /* 外部のアクセス解析やテストから参照できる最小限のAPIです。 */
      window.IjuMoveDiagnosis = {
        config: { SHARE_URL: SHARE_URL, DEBUG_MODE: DEBUG_MODE },
        questions: questions,
        destinations: destinations,
        calculatePreferences: calculatePreferences,
        calculateDestinationScore: calculateDestinationScore,
        calculateMismatchPenalty: calculateMismatchPenalty,
        getTopDestinations: getTopDestinations,
        getPersonalitySummary: getPersonalitySummary,
        renderQuestion: renderQuestion,
        renderResult: renderResult,
        restartDiagnosis: restartDiagnosis,
        shareResult: shareResult,
        getResultForAnswers: function (answerIndexes) {
          return buildResult(calculatePreferences(answerIndexes));
        }
      };

      renderHome();
    }());

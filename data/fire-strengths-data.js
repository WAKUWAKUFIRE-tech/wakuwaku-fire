const QUESTION_VERSION = "1.0";
const ALGORITHM_VERSION = "1.0";
const TRAIT_APPEARANCE_COUNT = 6;

const TRAITS = Object.freeze([
  { id: "freedom", name: "自由追求", description: "自分の時間と選択権を自分で持ちたい。", core: "自分で決めたい。", domainId: "freedom_design" },
  { id: "margin", name: "余白享受", description: "何もしなくても満足できる。", core: "何もしなくても幸せ。", domainId: "freedom_design" },
  { id: "self_design", name: "自律設計", description: "自由な人生にも自分なりの秩序を作る。", core: "自由を自分で整える。", domainId: "freedom_design" },
  { id: "security", name: "安定防衛", description: "資産・生活・将来の安全余裕を重視する。", core: "安心を確保したい。", domainId: "asset_design" },
  { id: "experience", name: "体験投資", description: "お金を経験と思い出へ変えることを重視する。", core: "お金を思い出に変える。", domainId: "asset_design" },
  { id: "optimize", name: "最適化", description: "同じ満足なら、より少ないコスト・時間で実現したい。", core: "ムダなく豊かに暮らす。", domainId: "asset_design" },
  { id: "challenge", name: "挑戦開拓", description: "未知のこと、新しい世界へ踏み出したい。", core: "新しい世界を広げる。", domainId: "self_realization" },
  { id: "growth", name: "成長探究", description: "一つのことを深め、上達し続けたい。", core: "上達し続けたい。", domainId: "self_realization" },
  { id: "play", name: "遊楽享受", description: "役に立つかどうかに関係なく、楽しいことを楽しめる。", core: "楽しいことを楽しむ。", domainId: "self_realization" },
  { id: "work_release", name: "労働解放", description: "生活のために働く義務から離れることを重視する。", core: "生活のための労働から離れる。", domainId: "work_relation" },
  { id: "income", name: "収入創造", description: "FIRE後も自分でお金を生み出すことを楽しめる。", core: "自分でお金を生み出す。", domainId: "work_relation" },
  { id: "social", name: "社会接続", description: "社会の中に自分の役割を持つことを重視する。", core: "社会に役割を持つ。", domainId: "work_relation" },
  { id: "community", name: "仲間共創", description: "人生の楽しさを人と共有したい。", core: "楽しさを人と共有する。", domainId: "life_value" },
  { id: "solo", name: "単独充足", description: "一人でも十分に満たされる。", core: "一人でも満たされる。", domainId: "life_value" },
  { id: "now", name: "今充実", description: "未来のために現在を犠牲にしすぎない。", core: "人生を先送りしない。", domainId: "life_value" }
].map((trait) => Object.freeze(trait)));

const DOMAINS = Object.freeze([
  { id: "freedom_design", name: "自由設計", traitIds: ["freedom", "margin", "self_design"] },
  { id: "asset_design", name: "資産設計", traitIds: ["security", "experience", "optimize"] },
  { id: "self_realization", name: "自己実現", traitIds: ["challenge", "growth", "play"] },
  { id: "work_relation", name: "労働関係", traitIds: ["work_release", "income", "social"] },
  { id: "life_value", name: "人生価値", traitIds: ["community", "solo", "now"] }
].map((domain) => Object.freeze({ ...domain, traitIds: Object.freeze(domain.traitIds) })));

function makeQuestion(id, a, b, aTrait, bTrait, prompt = "") {
  return Object.freeze({
    id,
    prompt,
    options: Object.freeze([
      Object.freeze({ id: "A", text: a, traitId: aTrait }),
      Object.freeze({ id: "B", text: b, traitId: bTrait })
    ])
  });
}

const QUESTIONS = Object.freeze([
  makeQuestion(1, "小さくても自分で稼げる仕組みを作ってみる", "せっかく自由になったので、趣味や遊びを思い切り楽しむ", "income", "play"),
  makeQuestion(2, "一人で好きな場所へ行き、好きなことをして過ごす", "ひとつの分野を本気で学んで、かなり上達したい", "solo", "growth"),
  makeQuestion(3, "今しかできない旅行や経験に積極的に使う", "使える余裕があっても、できるだけ働かずに済む状態を長く守る", "experience", "work_release"),
  makeQuestion(4, "仲間を集めて、みんなで何かやる", "自分の商品やサービスを作って収益化してみる", "community", "income"),
  makeQuestion(5, "誰かの役に立てる活動や役割を持つ", "今までやったことのない世界へ飛び込む", "social", "challenge"),
  makeQuestion(6, "予定や義務をできるだけなくした生活", "自由だけど、自分なりの生活リズムはきっちり作る生活", "work_release", "self_design"),
  makeQuestion(7, "あえて予定を入れず、気分のまま過ごす", "時間やお金の使い方を改善できるところを探す", "margin", "optimize"),
  makeQuestion(8, "多少地味でも、資産がほぼ減らない暮らし", "資産は少し減っても、遊びや趣味をかなり楽しむ暮らし", "security", "play"),
  makeQuestion(9, "一緒に遊んだり話したりできる仲間がいつもいる", "人付き合いの予定も仕事もなく、完全に自分の時間がある", "community", "work_release"),
  makeQuestion(10, "まず生活リズムや1週間の過ごし方を整える", "まず今までできなかったことを一つ始める", "self_design", "challenge"),
  makeQuestion(11, "家族旅行や特別な経験に使う", "大きく使わず、自分だけの自由な時間を増やすために残す", "experience", "solo"),
  makeQuestion(12, "何か小さな収入になることを始める", "あえて何もしない時間として残す", "income", "margin"),
  makeQuestion(13, "美味しいものを食べたり、遊びに行ったりする", "もっと少ないお金や時間で同じ満足を得る方法を考える", "play", "optimize"),
  makeQuestion(14, "便利なサービスや楽しい経験には積極的にお金を使う", "お金よりも、生活習慣や日々のペースを整えることを重視する", "experience", "self_design"),
  makeQuestion(15, "何をしても何もしなくてもいい「予定ゼロ」", "生活のための仕事を一切しなくていい「仕事ゼロ」", "margin", "work_release", "毎日予定ゼロと、毎日仕事ゼロ。\nどちらがより魅力的？"),
  makeQuestion(16, "誘われても断れるくらい、自分の時間を自由に決められる", "多少予定が増えても、一緒に楽しめる仲間がたくさんいる", "freedom", "community"),
  makeQuestion(17, "一人で好きなことを好きなペースでやる", "未経験のことを次々試してみる", "solo", "challenge"),
  makeQuestion(18, "予算・移動・宿をうまく組み合わせて最高効率の旅を考える", "多少非効率でも、みんなが一緒に楽しめることを優先する", "optimize", "community"),
  makeQuestion(19, "まず資産や支出を確認して安全性を高める", "人や社会とのつながりを増やして居場所を作る", "security", "social"),
  makeQuestion(20, "新しい事業・活動・挑戦のために使う", "ずっと憧れていた旅や経験に使う", "challenge", "experience"),
  makeQuestion(21, "誰かを誘って一緒に何かする", "何も決めず、その時の気分で過ごす", "community", "margin"),
  makeQuestion(22, "生活の中に習慣として組み込む", "一つのスキルを本気で伸ばすために使う", "self_design", "growth"),
  makeQuestion(23, "資産が減っても今やる", "今は我慢して、もっと資産が増えてからやる", "now", "security", "「今しかできないこと」に300万円必要。"),
  makeQuestion(24, "固定費や時間のムダを徹底的に減らす", "効率が多少悪くても、自分がしたいことを自分で選べる状態を守る", "optimize", "freedom"),
  makeQuestion(25, "気分に合わせて一人で自由に暮らす", "一人でも、起床・運動・食事などのリズムを整える", "solo", "self_design"),
  makeQuestion(26, "多少リスクを取ってでも新しい人生へ進む", "もう少し余裕を作ってから動く", "challenge", "security"),
  makeQuestion(27, "健康的で整った生活習慣", "「あの時やっておいてよかった」と思える今の経験", "self_design", "now"),
  makeQuestion(28, "ひとつのことを極める", "生活全体をもっと効率よく快適にする", "growth", "optimize"),
  makeQuestion(29, "もう収入のために働かなくてもいい状態", "働くかどうかより、一人で好きなように過ごせる状態", "work_release", "solo"),
  makeQuestion(30, "かなり余裕のある資産額まで待つ", "最低限の安全性があるなら、自由な時間を早く取りに行く", "security", "freedom"),
  makeQuestion(31, "最高。何もしなくても気楽に過ごせる", "最高。一人で好きな場所や趣味を楽しむ", "margin", "solo"),
  makeQuestion(32, "生活を工夫して支出を100万円減らす", "好きな方法で年間100万円稼ぐ", "optimize", "income"),
  makeQuestion(33, "若く元気な今だからこそ、時間を惜しまず楽しむ", "今だからこそ、お金を使って特別な経験を増やす", "now", "experience"),
  makeQuestion(34, "人の役に立つ活動を見つける", "やりたかった趣味や娯楽をやり尽くす", "social", "play"),
  makeQuestion(35, "ひとつのことをかなり高いレベルまで極める", "人と出会い、一緒にいろいろな経験をする", "growth", "community"),
  makeQuestion(36, "やりたい遊びを予定いっぱいに詰める", "予定を決めず、その日の気分だけで動く", "play", "freedom"),
  makeQuestion(37, "小さな仕事や事業で収入を増やす", "支出を抑えて安全余裕を守る", "income", "security"),
  makeQuestion(38, "何かを達成しなくても、その状態自体を楽しむ", "仕事はしなくても、学習や上達には時間を使う", "work_release", "growth"),
  makeQuestion(39, "純粋に楽しいことをもっと増やす", "「いつか」ではなく、やりたいことを今やる", "play", "now"),
  makeQuestion(40, "誰にも指図されず、自分のやり方で好きなことをする", "誰かの役に立ち、自分の役割を感じられることをする", "freedom", "social"),
  makeQuestion(41, "面白そうなら、とりあえず始める", "始めるかどうかより、「今やらなかったら後悔するか」で決める", "challenge", "now"),
  makeQuestion(42, "人や社会に関われる活動へ使う", "家族旅行や一生残る経験へ使う", "social", "experience"),
  makeQuestion(43, "何か一つ、本気で上達する", "何もしない日が多くても、それを楽しむ", "growth", "margin"),
  makeQuestion(44, "「いつかやろう」と言い続けて人生が過ぎること", "誰とも関わらず、自分の役割がなくなること", "now", "social", "自由になった今、一番避けたいのは？"),
  makeQuestion(45, "収入が減っても、働く日時・場所・内容は完全に自分で決めたい", "多少制約があっても、面白ければ収入を生み出す活動を続けたい", "freedom", "income", "FIRE後も自由に働けるなら？")
]);

export { QUESTION_VERSION, ALGORITHM_VERSION, TRAIT_APPEARANCE_COUNT, TRAITS, DOMAINS, QUESTIONS };

function freezeType(type) {
  return Object.freeze({
    ...type,
    support: Object.freeze(type.support),
    details: Object.freeze({
      intro: Object.freeze(type.details.intro),
      strengths: Object.freeze(type.details.strengths),
      caution: Object.freeze(type.details.caution),
      life: type.details.life
    }),
    recommendations: Object.freeze(type.recommendations),
    links: Object.freeze(type.links || [])
  });
}

const FIRE_TYPES = Object.freeze([
  freezeType({
    id: "adventure",
    name: "冒険開拓FIRE",
    main: "challenge",
    support: ["freedom", "now"],
    phrase: "自由になったんやから、知らん世界に行こう。",
    caption: "自由になったら、新しい世界へ飛び込みたい人。",
    summary: "FIREをゴールではなく、人生の第二章を始めるスタート地点として楽しみたいタイプです。興味を持ったことを自分で調べ、試し、選択肢を増やしていくことで充実度が上がりやすいでしょう。",
    details: {
      intro: [
        "あなたにとってFIREは、のんびり休むためだけのものではありません。",
        "会社や決められた生活から自由になった先で、",
        "「これまでできなかったことをやりたい」\n「知らない場所へ行きたい」\n「面白そうなことは、とりあえず試してみたい」",
        "そんな気持ちが強くなるタイプです。",
        "FIREはあなたにとって「ゴール」というより、人生の第二章を始めるためのスタート地点。",
        "同じ毎日を繰り返すよりも、新しい趣味、新しい土地、新しい人間関係、新しい活動へ飛び込むことで人生の充実度が上がりやすいでしょう。"
      ],
      strengths: [
        "最大の強みは、自由を行動に変えられること。",
        "FIREして時間ができても、「暇やな」で止まりにくい。",
        "興味を持ったら自分で調べ、試し、人生の選択肢をどんどん増やしていけます。",
        "変化への抵抗も比較的小さく、普通なら躊躇するようなことにも一歩踏み出せるのが魅力です。"
      ],
      caution: [
        "新しいことが好きなぶん、ひとつのことを深める前に次へ移ってしまうことがあります。",
        "また、自由を大事にしすぎると、\n「予定が入るのが嫌」\n「人に合わせるのが嫌」\n「少しでも義務になるとやめたくなる」\nという方向へ傾くことも。",
        "FIRE後の人生をもっと豊かにするなら、「新しいこと」と「続けること」の両方を持つのがおすすめです。"
      ],
      life: "長期旅行、多拠点生活、新しい趣味、発信、起業、イベント参加、ノマド的な暮らしなど。"
    },
    recommendations: ["長期旅行", "多拠点生活", "新規事業", "新しい趣味", "発信"],
    alert: "新しいものを追い続け、何も深まらなくなることに注意。",
    links: [{ label: "FIREワールドツアー", href: "../ワールドツアー/" }, { label: "海外FIRE移住診断", href: "../fire-migration-world/" }]
  }),
  freezeType({
    id: "fortress",
    name: "安心要塞FIRE",
    main: "security",
    support: ["optimize", "self_design"],
    phrase: "自由を楽しむために、まず安心を作る。",
    caption: "安心を整えてから、自由を思い切り楽しみたい人。",
    summary: "資産や生活の土台が整ってこそ、心から自由を楽しめるタイプです。計画性を活かして、長く続けられるFIRE生活をつくることと相性が良いでしょう。",
    details: {
      intro: [
        "あなたにとってFIREは、勢いだけで会社を辞めるものではありません。",
        "資産はいくら必要か。\n年間支出はいくらか。\n暴落しても大丈夫か。\n老後までお金は足りるか。",
        "そうした土台が整ってこそ、心から自由を楽しめるタイプです。",
        "「お金が減っていくのが怖くて、FIREしたのに毎日不安」",
        "そんな状態になるくらいなら、少し余裕を持って準備しておきたい。",
        "これは弱気なのではありません。",
        "あなたは、安心を作る能力そのものが強みです。"
      ],
      strengths: [
        "計画性があり、FIRE後の破綻リスクを小さくしやすいタイプです。",
        "資産運用、固定費、税金、保険、生活習慣などを整え、長く続けられるFIRE生活を作るのが得意。",
        "自由になった後も生活が崩れにくいでしょう。"
      ],
      caution: [
        "最大の罠は、安心を求めすぎて自由を先送りすること。",
        "「あと1000万円」\n「もう1年働こう」\n「もう少し相場が落ち着いてから」",
        "と安全ラインを引き上げ続けると、いつまで経ってもFIREできない可能性があります。",
        "安心は目的ではなく、人生を楽しむための土台です。"
      ],
      life: "王道FIRE、Lean FIRE、インデックス投資中心、地方移住、固定費を抑えた安定型FIREなど。"
    },
    recommendations: ["王道FIRE", "Lean FIRE", "インデックス中心", "地方暮らし", "固定費の低い生活"],
    alert: "安全を求め続けて、自由を先送りしすぎない。",
    links: [{ label: "FIRE研究室", href: "../FIRE研究室/" }, { label: "FIRE準備の記事", href: "../articles/fire-preparation/" }]
  }),
  freezeType({
    id: "leisurely",
    name: "悠々自適FIRE",
    main: "solo",
    support: ["margin", "work_release"],
    phrase: "何者にもならなくていい。それも自由。",
    caption: "何もしない自由まで、ちゃんと楽しめる人。",
    summary: "予定や成果がなくても、自分の時間そのものを味わえるタイプです。朝の散歩や読書のような何気ない一日にも満足しやすく、静かで自分らしいFIRE生活と相性が良いでしょう。",
    details: {
      intro: [
        "あなたはFIRE後に、無理に予定を詰めたり、何か大きな目標を作ったりしなくても比較的満足できるタイプです。",
        "朝ゆっくり起きる。\n散歩する。\nコーヒーを飲む。\nゲームをする。\n本を読む。\n昼寝する。",
        "そんな何気ない一日でも、",
        "「今日は何もできなかった」",
        "ではなく、",
        "「今日も自由だったな」",
        "と思える。",
        "これはFIRE生活ではかなり大きな才能です。"
      ],
      strengths: [
        "暇を恐れにくいこと。",
        "FIRE後に起きやすい「毎日日曜日問題」に比較的強く、常に成果や予定がなくても満足できます。",
        "誰かに認めてもらわなくても、自分の時間そのものを楽しめます。"
      ],
      caution: [
        "のんびりできる力が強すぎると、\n運動しない。\n外に出ない。\n人に会わない。\n新しい刺激がない。\nという方向へ進む可能性があります。",
        "完全に予定ゼロにするのではなく、時々新しい刺激を入れるだけでも生活はより豊かになります。"
      ],
      life: "完全FIRE、趣味中心、静かな地方暮らし、一人時間、読書、散歩、ゲーム、家庭中心など。"
    },
    recommendations: ["完全FIRE", "趣味中心", "静かな地方生活", "読書", "散歩", "ゲーム"],
    alert: "快適すぎて、生活の刺激や社会接点まで消さない。",
    links: [{ label: "FIRE後の退屈を考える記事", href: "../articles/fire-after-boredom/" }, { label: "FIRE QUEST", href: "../my-fire-life/" }]
  }),
  freezeType({
    id: "creator",
    name: "起業クリエイターFIRE",
    main: "income",
    support: ["challenge", "growth"],
    phrase: "生活費のためじゃなく、面白いから稼ぐ。",
    caption: "自由時間を、新しい価値づくりに使いたい人。",
    summary: "働かなくなることだけでなく、自分のアイデアを試せる時間を手に入れたいタイプです。自由を守りながらつくる、個人事業や発信活動と相性が良いでしょう。",
    details: {
      intro: [
        "FIREしたはずなのに、気づけばまた何かを始めている。",
        "それがあなたです。",
        "ただし、会社員に戻りたいわけではありません。",
        "誰かに命令されて働くのではなく、",
        "「自分で作ってみたい」\n「試してみたい」\n「どこまで伸ばせるか見てみたい」",
        "という気持ちが強いタイプです。",
        "ブログ、YouTube、アプリ、サービス、商品、コミュニティ。",
        "あなたにとってFIREは、働かなくなるためだけではなく、自分のアイデアを試せる時間を手に入れることでもあります。"
      ],
      strengths: [
        "資産だけに依存せず、新しい収入源を作れる可能性があります。",
        "会社員時代なら時間がなくてできなかった挑戦も、FIRE後ならじっくり試せる。",
        "「自分が作ったものに価値が生まれた」という感覚に喜びを感じやすいでしょう。"
      ],
      caution: [
        "一番ありがちな罠は、会社を辞めたのに会社員時代より働くこと。",
        "アクセス数、売上、登録者、利益。",
        "数字が伸び始めると楽しくなり、気づけば休日もなくなる可能性があります。",
        "自由を守りながら作るのが、このタイプの理想です。"
      ],
      life: "起業、YouTube、ブログ、アプリ開発、個人事業、クリエイター活動、オンラインサービスなど。"
    },
    recommendations: ["起業", "YouTube", "ブログ", "アプリ開発", "個人事業"],
    alert: "FIREしたのに会社員時代以上に働かない。",
    links: [{ label: "YouTube・発信の記事", href: "../articles/fire-youtube-live/" }, { label: "FIREコラム", href: "../articles/" }]
  }),
  freezeType({
    id: "enjoy_life",
    name: "人生満喫FIRE",
    main: "play",
    support: ["now", "experience"],
    phrase: "資産額より、人生の思い出残高。",
    caption: "自由になったら、ちゃんと人生を楽しみたい人。",
    summary: "お金を旅行や家族との時間、趣味や特別な経験へ変えることで満足度が上がりやすいタイプです。今しかできない楽しみと、未来の安心をどちらも大切にできるとさらに強くなります。",
    details: {
      intro: [
        "あなたにとってお金は、ただ増やして眺めるものではありません。",
        "旅行。\n美味しいもの。\n趣味。\n家族との時間。\nイベント。\n一度しかできない経験。",
        "お金をこうしたものへ変えることで、人生の満足度が上がるタイプです。",
        "FIREしたのに、",
        "「資産が減るのが怖いから何もしない」",
        "という生活には違和感を持ちやすいでしょう。"
      ],
      strengths: [
        "最大の強みは、人生を先送りしにくいこと。",
        "「老後にやろう」\n「もっとお金が増えたらやろう」",
        "と言っているうちに時間がなくなるリスクを感覚的に理解しています。",
        "元気な今。\n子どもが小さい今。\n友人と遊べる今。",
        "その時期にしかできないことへ価値を置けます。"
      ],
      caution: [
        "人生を楽しむ力が強い一方で、",
        "「何とかなるやろ」",
        "と将来資金を楽観視しすぎる可能性があります。",
        "大きな経験と何気ない日常、両方を楽しめるようになると非常に強いタイプです。"
      ],
      life: "旅行、趣味、美食、家族イベント、ライブ、スポーツ、体験型活動など。"
    },
    recommendations: ["旅行", "趣味", "家族時間", "美食", "イベント"],
    alert: "「今を楽しむ」と「未来を無視する」を混同しない。",
    links: [{ label: "お金の使い方の記事", href: "../articles/fire-happiness-spending/" }, { label: "FIRE後の暮らしの記事", href: "../articles/fire-after-10-days/" }]
  }),
  freezeType({
    id: "community",
    name: "仲間共創FIRE",
    main: "community",
    support: ["social", "play"],
    phrase: "自由は、一緒に笑える人がいるともっと楽しい。",
    caption: "自由な時間を、大切な人と共有したい人。",
    summary: "何をするかだけでなく、誰とするかで幸福度が高まりやすいタイプです。人とのつながりを思い出へ変えながら、一人で満たされる時間も少し持つとバランスが整います。",
    details: {
      intro: [
        "あなたにとってFIRE後の幸福を大きく左右するのは、",
        "「何をするか」",
        "だけではなく、",
        "「誰とするか」です。",
        "面白いことがあれば誰かに話したい。",
        "旅行なら誰かと行きたい。",
        "美味しいものを食べたら共有したい。",
        "人と一緒に経験することで楽しさが増幅するタイプです。"
      ],
      strengths: [
        "FIRE後に孤立しにくく、自然と人とのつながりを作れます。",
        "コミュニティ、友人、家族などとの関係を通して、自由な時間をたくさんの思い出へ変えられるでしょう。"
      ],
      caution: [
        "人との予定を大切にするあまり、自由だったはずのカレンダーが予定で埋まることがあります。",
        "「誰か一緒じゃないと楽しめない」状態にならないよう、一人で満たされる時間も少し持っておくと安定します。"
      ],
      life: "コミュニティ活動、オフ会、グループ旅行、家族中心、趣味サークル、共同プロジェクトなど。"
    },
    recommendations: ["コミュニティ", "オフ会", "グループ旅行", "家族中心", "趣味サークル"],
    alert: "人との予定で自由時間を埋め尽くさない。",
    links: [{ label: "FIREコミュニティの記事", href: "../articles/fire-community/" }, { label: "コミュニティの居場所の記事", href: "../articles/fire-community-place/" }]
  }),
  freezeType({
    id: "craftsman",
    name: "探究職人FIRE",
    main: "growth",
    support: ["self_design", "solo"],
    phrase: "時間があるなら、好きなことをどこまでも深く。",
    caption: "自由時間で、好きなものをどこまでも深めたい人。",
    summary: "自由時間を一つのテーマへじっくり使い、上達している感覚そのものを楽しみたいタイプです。成果だけでなく、何も生まれない時間の価値も残すと、より豊かな探究になります。",
    details: {
      intro: [
        "FIREして自由時間が増えたとき、",
        "「何して遊ぼう？」",
        "より、",
        "「これをもっと極めたい」",
        "と考えやすいタイプです。",
        "料理、楽器、スポーツ、投資、プログラミング、語学、創作、研究。",
        "ジャンルは何でも構いません。",
        "誰かに褒められなくても、上達している感覚そのものが楽しい。"
      ],
      strengths: [
        "長い自由時間を、深い充実へ変えられます。",
        "会社員時代なら細切れだった時間を、一つのテーマへ何年も使える。",
        "これはFIREだからこそ得られる非常に贅沢な生き方です。"
      ],
      caution: [
        "遊びまで努力になりやすいのが、このタイプの罠。",
        "ゲームでも記録。\n運動でも記録。\n趣味でも目標。",
        "「今日は成長していない」だけで焦らないこと。",
        "成果のない時間にも価値があります。"
      ],
      life: "研究、読書、資格、スポーツ、創作、楽器、プログラミングなど。"
    },
    recommendations: ["研究", "読書", "スポーツ", "創作", "楽器", "プログラミング"],
    alert: "趣味にまで成果を求めすぎない。",
    links: [{ label: "FIREの6つの学び", href: "../articles/fire-6-lessons/" }, { label: "FIREコラム", href: "../articles/" }]
  }),
  freezeType({
    id: "side_fire",
    name: "ゆるサイドFIRE",
    main: "freedom",
    support: ["income", "security"],
    phrase: "全部辞めなくていい。自由が増えればええ。",
    caption: "少し働きながら、大きな自由を手に入れたい人。",
    summary: "働くか働かないかを二択にせず、好きな仕事や小さな事業を残しながら自由を確保したいタイプです。働く時間の上限を先に決めることで、この柔軟さを活かしやすくなります。",
    details: {
      intro: [
        "あなたはFIREを、",
        "「働くか、働かないか」",
        "の二択では考えません。",
        "週5日働く必要はない。",
        "でも完全に収入ゼロにする必要もない。",
        "週2日だけ働く。\n好きな仕事だけする。\n暇な時だけ稼ぐ。\n小さな事業を持つ。",
        "そうやって、少し働きながら大きな自由を確保するスタイルと相性が良いタイプです。"
      ],
      strengths: [
        "FIREに必要な資産額を下げやすく、資産が減る不安も小さくできます。",
        "さらに社会との接点や生活リズムも残せるため、完全FIREで起こりやすい孤独や暇の問題も回避しやすい。"
      ],
      caution: [
        "「少しだけ働く」",
        "つもりだったのに、仕事が増えること。",
        "働く時間の上限を先に決めておくと、このタイプの良さを最大限に活かせます。"
      ],
      life: "週2〜3勤務、フリーランス、スポットワーク、配達、副業、小さな事業など。"
    },
    recommendations: ["週2〜3勤務", "フリーランス", "スポットワーク", "配達", "小さな事業"],
    alert: "「少し働く」が再びフルタイム化しないようにする。",
    links: [{ label: "サイドFIREの日々", href: "../articles/sidefire-day/" }, { label: "サイドFIREの記事", href: "../articles/sidefire-6000/" }]
  }),
  freezeType({
    id: "traveler",
    name: "自由旅人FIRE",
    main: "experience",
    support: ["freedom", "solo"],
    phrase: "人生に、決まった住所はいらない。",
    caption: "場所にも時間にも縛られず、経験を集めたい人。",
    summary: "好きな場所へ、好きな時期に動けることそのものに大きな魅力を感じるタイプです。旅の自由と、戻れる拠点や人とのつながりを組み合わせると、より長く楽しめるでしょう。",
    details: {
      intro: [
        "あなたが求めている自由は、単に仕事がないことではありません。",
        "好きな場所へ行ける。\n好きな時期に移動できる。\n平日の昼に出かけられる。\n気に入った街なら長く滞在できる。",
        "人生を固定されないことそのものに大きな魅力を感じるタイプです。",
        "必ずしも世界一周する必要はありません。",
        "重要なのは、「どこで、いつ、どう生きるか」を自分で選べることです。"
      ],
      strengths: [
        "環境を変えることへの抵抗が比較的小さく、自由を実際の経験へ変えるのが得意です。"
      ],
      caution: [
        "自由を優先しすぎると、生活基盤や人間関係が薄くなる可能性があります。",
        "自由に動ける拠点を一つ持つだけでも、旅の楽しさは安定します。"
      ],
      life: "世界旅行、国内旅行、多拠点生活、ノマド、一人旅、長期滞在、季節移住など。"
    },
    recommendations: ["世界旅行", "国内旅行", "多拠点", "ノマド", "一人旅", "長期滞在"],
    alert: "自由を求めるあまり、拠点や人間関係を失いすぎない。",
    links: [{ label: "FIREワールドツアー", href: "../ワールドツアー/" }, { label: "国内FIRE移住診断", href: "../fire-migration-japan/" }, { label: "海外FIRE移住診断", href: "../fire-migration-world/" }]
  }),
  freezeType({
    id: "contribution",
    name: "社会貢献FIRE",
    main: "social",
    support: ["community", "growth"],
    phrase: "自由になった時間を、誰かのプラスに。",
    caption: "自由になった時間を、誰かの役に立てたい人。",
    summary: "働かなくていいだけでは物足りず、社会の中に役割を持つことで充実しやすいタイプです。自分の時間を周囲へ還元しながら、抱え込みすぎない範囲で関わるのがおすすめです。",
    details: {
      intro: [
        "FIREしたあと、",
        "「働かなくていい」",
        "だけでは少し物足りない可能性があります。",
        "誰かに教える。\n困っている人を助ける。\nコミュニティを運営する。\n地域活動をする。\n子どもに時間を使う。",
        "社会の中に自分の役割があることで充実しやすいタイプです。",
        "お金を稼ぐ必要はありません。",
        "「自分がここにいることで、少し何かが良くなった」",
        "という感覚が重要です。"
      ],
      strengths: [
        "会社の肩書きを失っても、新しい役割を作りやすいタイプです。",
        "自由な時間を自分だけでなく、周囲にも還元できます。"
      ],
      caution: [
        "人に必要とされることが嬉しいあまり、また義務を抱え込みすぎる可能性があります。",
        "「やらなければならない活動」ではなく、「やりたい活動」を選ぶこと。"
      ],
      life: "ボランティア、地域活動、コミュニティ運営、教育、メンター、子育て、NPO的活動など。"
    },
    recommendations: ["ボランティア", "地域活動", "コミュニティ運営", "教育", "メンター"],
    alert: "必要とされることに依存して義務を抱えすぎない。",
    links: [{ label: "FIREコミュニティの記事", href: "../articles/fire-community/" }, { label: "FIRE後の居場所の記事", href: "../articles/fire-community-place/" }]
  }),
  freezeType({
    id: "minimal",
    name: "ミニマル最適化FIRE",
    main: "optimize",
    support: ["margin", "freedom"],
    phrase: "増やすより、減らすと自由になる。",
    caption: "人生を軽くして、少ないコストで自由を広げたい人。",
    summary: "もっと稼ぐだけでなく、必要なお金や持ち物、予定を減らして自由を広げたいタイプです。コスパだけではなく、少ないお金で人生を豊かにする視点も大切にできます。",
    details: {
      intro: [
        "多くの人は、",
        "もっと稼げば自由になれる。",
        "と考えます。",
        "でもあなたは、",
        "「そもそも必要なお金を減らせばいい」",
        "という発想を持ちやすいタイプです。",
        "固定費。\n所有物。\n大きな家。\n車。\n無駄な契約。\n予定。",
        "人生から不要なものを減らすほど、自由が増えていく。",
        "FIREは単なる資産形成ではなく、人生全体の最適化です。"
      ],
      strengths: [
        "比較的少ない資産でも満足度の高い生活を作りやすい。",
        "FIRE必要額そのものを下げられるため、早期FIREとの相性も良いでしょう。"
      ],
      caution: [
        "最適化が楽しくなりすぎると、人生がすべてコスパになります。",
        "節約は目的ではありません。",
        "少ないお金で人生を豊かにすることが目的です。"
      ],
      life: "Lean FIRE、ミニマリスト生活、地方移住、小さな住居、固定費の低い暮らしなど。"
    },
    recommendations: ["Lean FIRE", "ミニマリスト", "地方移住", "小さな住居", "固定費削減"],
    alert: "節約を目的にして、人生の経験まで削らない。",
    links: [{ label: "家計を整えるFIRE記事", href: "../articles/fire-household/" }, { label: "国内FIRE移住診断", href: "../fire-migration-japan/" }]
  }),
  freezeType({
    id: "full_release",
    name: "完全解放FIRE",
    main: "work_release",
    support: ["margin", "now"],
    phrase: "何もしなくていい。それを手に入れるためのFIRE。",
    caption: "何もしなくてもいい自由そのものを味わいたい人。",
    summary: "生活のために働かなければならない義務から離れ、何もしない日も自分のものとして楽しみたいタイプです。義務を減らしながらも、やりたい時だけ動けるものをいくつか残すと心地よく続きます。",
    details: {
      intro: [
        "FIREしたら起業しよう。\n新しいことを始めよう。\n社会貢献しよう。",
        "そんなことを言われても、",
        "「いや、別に何もしなくてもよくない？」",
        "と思える。",
        "あなたにとってFIRE最大の価値は、",
        "生活のために働かなければならない義務がなくなること。",
        "今日何もしなくてもいい。",
        "明日も予定を入れなくてもいい。",
        "その状態そのものに大きな幸福を感じるタイプです。"
      ],
      strengths: [
        "FIREの自由を非常に純粋な形で楽しめます。",
        "「何か生産的なことをしなければ」",
        "という会社員的な価値観から抜けやすく、自分の時間を自分のものとして取り戻せます。"
      ],
      caution: [
        "義務を減らすことと、人生そのものを縮小することは別です。",
        "仕事をなくし、\n人付き合いもなくし、\n運動もなくし、\n外出もなくす。",
        "そこまで行くと、自由というより停滞になる可能性があります。",
        "「やりたい時だけやるもの」をいくつか持っておくと、より長く楽しめます。"
      ],
      life: "完全FIRE、趣味中心、家庭中心、平日自由、のんびり暮らすスタイルなど。"
    },
    recommendations: ["完全FIRE", "趣味中心", "家庭中心", "平日自由", "のんびり生活"],
    alert: "義務を減らすことと、人生そのものを縮小することを混同しない。",
    links: [{ label: "FIRE後の退屈を考える記事", href: "../articles/fire-after-boredom/" }, { label: "ワクワクFIREの遊び場", href: "../#contents" }]
  })
]);

const TRAIT_BY_ID = Object.freeze(Object.fromEntries(TRAITS.map((trait) => [trait.id, trait])));
const DOMAIN_BY_ID = Object.freeze(Object.fromEntries(DOMAINS.map((domain) => [domain.id, domain])));
const TYPE_BY_ID = Object.freeze(Object.fromEntries(FIRE_TYPES.map((type) => [type.id, type])));

export { FIRE_TYPES, TRAIT_BY_ID, DOMAIN_BY_ID, TYPE_BY_ID };

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function getStrengthLabel(score) {
  if (score >= 5) return "非常に強い";
  if (score >= 4) return "強い";
  if (score >= 2.5) return "中程度";
  return "控えめ";
}

function getRarityLabel(percentage, totalResults) {
  if (totalResults < 20) return "まだデータ収集中です";
  if (percentage >= 20) return "かなり多い";
  if (percentage >= 10) return "比較的多い";
  if (percentage >= 5) return "ややレア";
  return "レア";
}

function normalizedResponseTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return clamp(Math.round(number), 0, 3600000);
}

function compareTraitEntries(left, right, answers) {
  const scoreDifference = right.finalScore - left.finalScore;
  if (Math.abs(scoreDifference) > 0.000001) return scoreDifference;

  const directQuestion = QUESTIONS.find((question) => {
    const traitIds = question.options.map((option) => option.traitId);
    return traitIds.includes(left.id) && traitIds.includes(right.id);
  });
  if (directQuestion) {
    const selectedOption = directQuestion.options[answers[directQuestion.id - 1] === "B" ? 1 : 0];
    if (selectedOption.traitId === left.id) return -1;
    if (selectedOption.traitId === right.id) return 1;
  }

  if (right.baseWins !== left.baseWins) return right.baseWins - left.baseWins;
  if (Math.abs(right.opponentAdjustment - left.opponentAdjustment) > 0.000001) {
    return right.opponentAdjustment - left.opponentAdjustment;
  }
  if (right.instantWins !== left.instantWins) return right.instantWins - left.instantWins;
  return left.order - right.order;
}

function calculateTypeScore(type, traitScores) {
  return (
    (traitScores[type.main]?.finalScore || 0) * 0.5 +
    (traitScores[type.support[0]]?.finalScore || 0) * 0.25 +
    (traitScores[type.support[1]]?.finalScore || 0) * 0.25
  );
}

function calculateFireStrengthResult(answers = [], responseTimes = []) {
  const normalizedAnswers = QUESTIONS.map((question, index) => answers[index] === "B" ? "B" : "A");
  const rawResponseTimes = QUESTIONS.map((question, index) => normalizedResponseTime(responseTimes[index]));
  const analysisTimes = rawResponseTimes.map((time) => clamp(time, 0, 120000));
  const responseTimeMedianMs = median(analysisTimes);
  const medianForRatio = Math.max(1, responseTimeMedianMs);
  const baseWins = Object.fromEntries(TRAITS.map((trait) => [trait.id, 0]));
  const speedAdjustments = Object.fromEntries(TRAITS.map((trait) => [trait.id, 0]));
  const instantWins = Object.fromEntries(TRAITS.map((trait) => [trait.id, 0]));

  const answerDetails = QUESTIONS.map((question, index) => {
    const selectedOption = question.options[normalizedAnswers[index] === "B" ? 1 : 0];
    const opponent = question.options[normalizedAnswers[index] === "B" ? 0 : 1];
    const time = analysisTimes[index];
    baseWins[selectedOption.traitId] += 1;
    const ratio = time / medianForRatio;
    let speedBonus = 0;
    if (ratio < 0.5) speedBonus = 0.05;
    else if (ratio < 0.8) speedBonus = 0.025;
    speedAdjustments[selectedOption.traitId] += speedBonus;
    if (time >= 350 && ratio < 0.8) instantWins[selectedOption.traitId] += 1;
    return Object.freeze({
      questionId: question.id,
      choice: normalizedAnswers[index],
      chosenTraitId: selectedOption.traitId,
      chosenTraitName: TRAIT_BY_ID[selectedOption.traitId].name,
      responseTimeMs: rawResponseTimes[index],
      analysisTimeMs: time
    });
  });

  // Opponent strength is based on the completed response profile, not the order in which answers were clicked.
  // Rebuild the opponent correction after all base wins are known.
  const finalOpponentAdjustments = Object.fromEntries(TRAITS.map((trait) => [trait.id, 0]));
  QUESTIONS.forEach((question, index) => {
    const selectedOption = question.options[normalizedAnswers[index] === "B" ? 1 : 0];
    const opponent = question.options[normalizedAnswers[index] === "B" ? 0 : 1];
    finalOpponentAdjustments[selectedOption.traitId] += ((baseWins[opponent.traitId] / TRAIT_APPEARANCE_COUNT) - 0.5) * 0.1;
  });

  const unsortedTraitScores = Object.fromEntries(TRAITS.map((trait, order) => {
    const opponentAdjustment = finalOpponentAdjustments[trait.id];
    const speedAdjustment = speedAdjustments[trait.id];
    const wins = baseWins[trait.id];
    return [trait.id, {
      id: trait.id,
      name: trait.name,
      description: trait.description,
      core: trait.core,
      domainId: trait.domainId,
      baseWins: wins,
      winRate: wins / TRAIT_APPEARANCE_COUNT,
      opponentAdjustment,
      speedAdjustment,
      instantWins: instantWins[trait.id],
      finalScore: wins * (1 + opponentAdjustment) * (1 + speedAdjustment),
      order
    }];
  }));

  const rankedTraits = Object.values(unsortedTraitScores)
    .sort((left, right) => compareTraitEntries(left, right, normalizedAnswers))
    .map((trait, index) => Object.freeze({ ...trait, rank: index + 1, strengthLabel: getStrengthLabel(trait.finalScore) }));
  const traitScores = Object.fromEntries(rankedTraits.map((trait) => [trait.id, trait]));
  const topTraits = rankedTraits.slice(0, 5);
  const topTraitIds = new Set(topTraits.map((trait) => trait.id));

  const typeScores = FIRE_TYPES.map((type, order) => {
    const score = calculateTypeScore(type, traitScores);
    const topFiveCount = [type.main, ...type.support].filter((traitId) => topTraitIds.has(traitId)).length;
    const mainRank = traitScores[type.main].rank;
    return { id: type.id, name: type.name, score, topFiveCount, mainRank, order };
  }).sort((left, right) => (
    right.topFiveCount - left.topFiveCount ||
    right.score - left.score ||
    left.mainRank - right.mainRank ||
    left.order - right.order
  )).map((type, index) => Object.freeze({ ...type, rank: index + 1 }));
  const fireType = typeScores[0];
  const fireTypeDefinition = TYPE_BY_ID[fireType.id];

  const domains = DOMAINS.map((domain) => {
    const score = domain.traitIds.reduce((sum, traitId) => sum + traitScores[traitId].finalScore, 0) / domain.traitIds.length;
    return Object.freeze({ id: domain.id, name: domain.name, score });
  });
  const meanScore = rankedTraits.reduce((sum, trait) => sum + trait.finalScore, 0) / rankedTraits.length;
  const standout = topTraits[0].finalScore >= meanScore + 1.5 ? topTraits[0] : null;
  const slowQuestions = answerDetails.slice().sort((left, right) => right.analysisTimeMs - left.analysisTimeMs || left.questionId - right.questionId).slice(0, 3);
  const fastQuestions = answerDetails
    .filter((answer) => answer.analysisTimeMs >= 350)
    .sort((left, right) => left.analysisTimeMs - right.analysisTimeMs || left.questionId - right.questionId)
    .slice(0, 3);
  const lowestTrait = rankedTraits[rankedTraits.length - 1];

  return Object.freeze({
    algorithmVersion: ALGORITHM_VERSION,
    questionVersion: QUESTION_VERSION,
    answers: Object.freeze(normalizedAnswers),
    responseTimes: Object.freeze(rawResponseTimes),
    responseTimeMedianMs,
    traitScores: Object.freeze(traitScores),
    rankedTraits: Object.freeze(rankedTraits),
    topTraits: Object.freeze(topTraits),
    domainScores: Object.freeze(domains),
    typeScores: Object.freeze(typeScores),
    fireType: Object.freeze({ ...fireTypeDefinition, score: fireType.score, rank: fireType.rank }),
    standout,
    lowestTrait,
    slowQuestions: Object.freeze(slowQuestions),
    fastQuestions: Object.freeze(fastQuestions),
    answerDetails: Object.freeze(answerDetails)
  });
}

export { clamp, median, getStrengthLabel, getRarityLabel, calculateTypeScore, calculateFireStrengthResult };

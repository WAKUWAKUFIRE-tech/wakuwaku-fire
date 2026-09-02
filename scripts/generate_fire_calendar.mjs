import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "data", "fire-calendar");

const MONTHS = [
  { name: "1月", season: "新しい年の空気が残る月。始めることより、今年の時間をどこへ置くかを選びます。", hint: "今年の余白を先に決める" },
  { name: "2月", season: "寒さの中で暮らしを整える月。守りたいものが見えると、お金の使い方も変わります。", hint: "守りたいものを基準にする" },
  { name: "3月", season: "卒業や異動など、節目を感じる月。過去の正解を少し手放して、次の季節を考えます。", hint: "区切りを次の一歩に変える" },
  { name: "4月", season: "新生活が始まる月。働き方や住む場所を、あたりまえから選び直せる時期です。", hint: "あたりまえを一度見直す" },
  { name: "5月", season: "外へ出たくなる月。旅や遊びに使う時間も、人生の大切な資産として眺めます。", hint: "使う時間も資産に数える" },
  { name: "6月", season: "雨の日が増える月。家で過ごす時間を整えると、少ない予定でも満足度が上がります。", hint: "家時間の満足度を上げる" },
  { name: "7月", season: "夏の予定が動き出す月。予定を詰め込みすぎず、何もしない日もカレンダーに残します。", hint: "楽しみを予定表に残す" },
  { name: "8月", season: "帰省や休暇で人との距離を感じる月。誰とどこで過ごしたいかを、数字以外でも考えます。", hint: "一緒に過ごしたい人を思い出す" },
  { name: "9月", season: "季節が切り替わる月。防災や暮らしの小さな見直しが、未来の安心につながります。", hint: "未来の安心を小さく準備する" },
  { name: "10月", season: "過ごしやすく、学びや趣味を始めやすい月。興味に使うお金と時間を前向きに捉えます。", hint: "好奇心に予算をつける" },
  { name: "11月", season: "年末が近づき、働き方を振り返る月。今年の頑張りを責めず、来年の選択肢を増やします。", hint: "頑張りを選択肢に変える" },
  { name: "12月", season: "一年を締めくくる月。残高だけでなく、笑った回数や自由にできた時間も棚卸しします。", hint: "幸福も一年分数えてみる" }
];

const CATEGORY_META = {
  "FIRE": { icon: "🔥", link: "/articles/" },
  "投資": { icon: "📈", link: "/articles/" },
  "資産形成": { icon: "🏦", link: "/articles/" },
  "お金": { icon: "💰", link: "/articles/" },
  "働き方": { icon: "🧑‍💻", link: "/articles/" },
  "人生": { icon: "🌱", link: "/articles/" },
  "幸福": { icon: "😊", link: "/articles/" },
  "時間": { icon: "⏰", link: "/articles/" },
  "自由": { icon: "🕊️", link: "/articles/" },
  "家族": { icon: "👨‍👩‍👧", link: "/articles/" },
  "健康": { icon: "🌿", link: "/articles/" },
  "人間関係": { icon: "🤝", link: "/articles/" },
  "旅行": { icon: "✈️", link: "/fire-migration-world/" },
  "遊び": { icon: "🎮", link: "/risk-runner/" },
  "学び": { icon: "📚", link: "/articles/" },
  "挑戦": { icon: "🚀", link: "/articles/" },
  "節約": { icon: "🧺", link: "/articles/" },
  "制度": { icon: "🧾", link: "/articles/" },
  "老後": { icon: "🌅", link: "/articles/" },
  "趣味": { icon: "🎨", link: "/risk-runner/" }
};

const CATEGORY_CYCLE = [
  "FIRE", "投資", "人生", "働き方", "幸福", "お金", "資産形成", "時間",
  "自由", "家族", "健康", "人間関係", "旅行", "遊び", "学び", "挑戦",
  "節約", "制度", "老後", "趣味", "FIRE", "投資", "資産形成", "お金",
  "働き方", "人生", "幸福", "FIRE", "自由", "投資", "家族"
];

const LENSES = [
  { title: "今年やりたいことを一つ選ぶ", short: "予定を増やす前に、心が動く一つを選びます。", quote: "FIREは空白を増やすことではなく、選びたい時間を取り戻すこと", action: "今年やりたいことを1つだけメモする。", knowledge: "やりたいことを一度にたくさん決めると、最初の一歩がぼやけます。ひとつに絞ると、必要なお金や時間も具体的に見えてきます。" },
  { title: "財布の中を軽くする", short: "持ち物と支出を少し整理して、今の自分に必要なものを見つけます。", quote: "お金の整理は、我慢のためではなく大切なものを見つけるためにある", action: "財布やスマホ決済の履歴から、もう使っていないものを1つ確認する。", knowledge: "固定費は一度見直すと、その後も効果が続きます。ただし、安心や楽しさまで削る必要はありません。" },
  { title: "時間の使い道を眺める", short: "一日の中で、気づくと消えている時間に目を向けます。", quote: "自由は予定がないことではなく、自分で選んだ予定があること", action: "今日の時間を「楽しい・必要・なんとなく」に3分だけ分けてみる。", knowledge: "資産額と同じように、時間にも使い道があります。記録するだけで、無意識の習慣が見えやすくなります。" },
  { title: "FIREの理由を言葉にする", short: "会社を辞めたい気持ちの奥にある、本当の願いを探します。", quote: "FIREのゴールは退職ではなく、退職後に何を大切にするか", action: "「なぜFIREしたい？」に、数字以外の答えを1行書く。", knowledge: "自由になりたい、家族と過ごしたい、好きなことをしたい。理由が違えば、必要な準備やペースも変わります。" },
  { title: "仕事の得意を棚卸しする", short: "今の仕事で身についた、持ち運べる力を探します。", quote: "働き方の選択肢が増えるほど、FIREへの道は一つではなくなる", action: "人から頼られたことを3つ書き出す。", knowledge: "収入源を増やすときは、資格だけでなく経験・人柄・小さな実績も資産になります。まずは見える化から始められます。" },
  { title: "小さなぜいたくを味わう", short: "未来のためだけでなく、今日の満足にもお金を使います。", quote: "人生最大化には、心が軽くなる支出もきちんと含まれる", action: "罪悪感なく楽しめる小さなぜいたくを1つ選ぶ。", knowledge: "支出は金額だけでなく、満足がどれくらい続いたかで振り返れます。自分に効く使い方を知ると、無駄遣いも減ります。" },
  { title: "投資アプリを閉じてみる", short: "値動きを追わない時間をつくり、投資との距離を整えます。", quote: "資産を育てることと、毎日値段を見ることは同じではない", action: "今日は投資アプリを開かない時間を1時間つくる。", knowledge: "長期投資では短期の値動きが生活の判断を左右しない仕組みが大切です。見る頻度も自分で決められます。" },
  { title: "家族の好きな場所を聞く", short: "一人で考えるFIREから、一緒に楽しむ暮らしへ視点を広げます。", quote: "FIRE後の景色は、資産額だけでなく誰と見るかで変わる", action: "家族や大切な人に、行ってみたい場所を1つ聞く。", knowledge: "暮らしの希望を早めに話すと、住まい・働き方・支出の優先順位を合わせやすくなります。" },
  { title: "子どもの頃の遊びを思い出す", short: "役に立つかどうかをいったん忘れて、夢中だったことを振り返ります。", quote: "遊びはFIRE後の余暇ではなく、自分を知るための手がかり", action: "子どもの頃に好きだった遊びを1つ、今できる形に置き換える。", knowledge: "昔の好みには、競争より制作、室内より冒険など、自分が心地よく感じる条件が隠れています。" },
  { title: "自由の条件を三つ挙げる", short: "「自由になりたい」を、暮らしの具体的な条件に変換します。", quote: "自由は大きな言葉だから、日々の条件に翻訳すると近づきやすい", action: "自由を感じるために必要な条件を3つ書く。", knowledge: "場所・時間・人間関係・お金など、自由の中身は人によって違います。条件が見えると、選択肢を比べられます。" },
  { title: "使っていないサブスクを探す", short: "節約を目的にせず、今の楽しさに貢献しているサービスを確認します。", quote: "節約は暮らしを小さくする作業ではなく、好きなものへ席を譲る作業", action: "サブスクの一覧を開き、今月も使いたいものに印をつける。", knowledge: "少額の固定費でも、年単位で見るとまとまった金額になります。残すサービスが明確なら、解約も納得して行えます。" },
  { title: "知らないことを一つ調べる", short: "気になっていた制度や投資用語を、短時間だけ正しく確認します。", quote: "学ぶことは不安を増やすためではなく、自分で選ぶ材料を増やすため", action: "気になっていた言葉を1つ、公式サイトや一次情報で調べる。", knowledge: "分からないままの不安は大きく見えます。用語の意味と、自分に関係する範囲だけを切り分けると学びやすくなります。" },
  { title: "体の声を聞く", short: "資産の計画と同じくらい、今日の体調を大事な情報として扱います。", quote: "長く楽しむための健康は、FIRE計画の外側ではなく土台にある", action: "水分をとり、肩や背中を1分だけ伸ばす。", knowledge: "大きな健康目標より、睡眠・食事・散歩など小さな行動のほうが続けやすいことがあります。無理のない範囲で十分です。" },
  { title: "ありがとうを一つ伝える", short: "人とのつながりを、忙しさの後回しにしない日にします。", quote: "自由な時間は、一人で使うだけでなく誰かに渡すこともできる", action: "お世話になっている人へ、短い「ありがとう」を送る。", knowledge: "FIRE後の満足度には、活動や居場所だけでなく人とのつながりも関係します。連絡は短くても関係を温めます。" },
  { title: "行きたい街を地図で見る", short: "住んでみたい場所を、家賃だけでなく空気や歩きやすさでも想像します。", quote: "住む場所を選ぶことは、毎日の時間の流れを選ぶこと", action: "行きたい街を1つ地図で開き、気になる場所を2つ保存する。", knowledge: "移住を考えるときは、交通・医療・買い物・気候などを現地の最新情報で確かめることが大切です。" },
  { title: "資産の目的を一つ決める", short: "残高を増やすことの先にある、守りたい時間や体験を見つけます。", quote: "資産は目的地ではなく、選びたい暮らしへ渡るための道具", action: "資産で守りたいものを1つ、「時間」「安心」など一語で書く。", knowledge: "同じ金額でも、生活防衛資金・教育・旅行など目的が違えば置き場所や使う時期も変わります。" },
  { title: "小さな挑戦を予約する", short: "大きな決断ではなく、少しだけ未知の予定を先にカレンダーへ入れます。", quote: "FIREは挑戦を終えることではなく、挑戦を自分のペースに戻すこと", action: "10分でできる新しい行動を1つ、今週の予定に入れる。", knowledge: "挑戦は規模より、始めるハードルの低さが継続を左右します。小さく試してから広げても構いません。" },
  { title: "老後の不安を分解する", short: "漠然とした心配を、住まい・医療・収入などの項目に分けます。", quote: "不安は数字で脅すものではなく、準備できる大きさに分けるもの", action: "老後の不安を一つだけ紙に書き、確認する情報を一つ決める。", knowledge: "将来の制度や費用は変わる可能性があります。公的機関の最新情報を確認し、必要なら専門家にも相談しましょう。" },
  { title: "好きな音を聴く", short: "効率から離れて、気分が少し上向く音に時間を渡します。", quote: "FIRE後の時間には、成果を求めない楽しさも置いていい", action: "好きな曲を1曲、画面を見ずに聴く。", knowledge: "休息は何もしないことだけではありません。気持ちを切り替えられる行動を自分の回復メニューにしておくと便利です。" },
  { title: "お金の置き場所を確認する", short: "何に使うお金かを見直し、目的と置き場所が合っているか眺めます。", quote: "お金の仕組みは、未来の自分を迷わせないための案内板", action: "生活費・近い予定・将来用のお金を、ざっくり3つに分けて見る。", knowledge: "使う時期が違う資金を同じ目線で管理すると、値動きや不足が気になりやすくなります。目的ごとに分けるだけでも整理になります。" },
  { title: "FIRE後の朝を想像する", short: "退職日ではなく、その翌朝に何をしたいかを具体的に描きます。", quote: "FIREの設計図は、会社を辞める日より普通の朝に表れる", action: "FIRE後の理想の朝を、起きる時間から3行で書く。", knowledge: "大きな目標は、日常の風景に落とすと本当に欲しいものが見えます。朝の過ごし方は暮らしの満足度に直結します。" },
  { title: "買わない日をゲームにする", short: "我慢の記録ではなく、手持ちのもので楽しむ小さなゲームにします。", quote: "節約も遊びに変えれば、自分に合う暮らしの工夫が見つかる", action: "家にあるものだけで楽しめることを1つ選ぶ。", knowledge: "買わない日が合わない人もいます。楽しみを削りすぎず、買う日と買わない日を自分で選ぶことが大切です。" },
  { title: "働く理由を更新する", short: "収入だけでなく、成長・仲間・社会との接点など仕事の意味を眺めます。", quote: "働くことも辞めることも、人生を選ぶための手段であって正解そのものではない", action: "今の仕事から受け取っているものを、収入以外に1つ書く。", knowledge: "働き方を考えるときは、嫌なことを減らす視点と、残したい価値を守る視点を両方持てます。" },
  { title: "幸福の証拠を集める", short: "大きな成功ではなく、今日すでにあった小さな満足を見つけます。", quote: "幸福は資産表に載らないけれど、人生のリターンとして確かに残る", action: "今日よかったことを3つ、短い言葉で記録する。", knowledge: "満足した出来事を言葉にすると、自分にとっての幸福の条件が見えやすくなります。翌日の予定にも活かせます。" },
  { title: "何もしない時間を守る", short: "予定を入れないことを、さぼりではなく回復の予定として扱います。", quote: "何もしない時間は、次に選びたいことを見つけるための余白", action: "スマホを置いて、5分だけ何もしない。", knowledge: "休む時間まで予定で埋めると、自由になっても疲れが残ります。回復の方法も自分の暮らしに合わせて選びましょう。" },
  { title: "家の中の好きな場所を作る", short: "お金を大きくかけず、毎日戻りたくなる一角を整えます。", quote: "FIREは遠くへ行く自由だけでなく、今いる場所を好きにする自由でもある", action: "椅子の周りなど、1平方メートルだけ整える。", knowledge: "住環境の満足度は、広さだけでなく光・動線・好きなものの見え方にも左右されます。小さな改善から試せます。" },
  { title: "未来の自分へ質問する", short: "今の選択を、数年後の自分がどう感じるか静かに聞いてみます。", quote: "長期計画は未来を縛るためでなく、今日の選択を軽くするためにある", action: "未来の自分に「何を残してくれてありがとう？」と問いかける。", knowledge: "将来の希望は変わっても構いません。定期的に問い直すことで、計画を現実の暮らしに合わせて更新できます。" },
  { title: "誰かと笑う予定を入れる", short: "効率のよい予定ではなく、あとから思い出せる時間を優先します。", quote: "人生の豊かさは、使った金額より一緒に笑った場面で思い出される", action: "友人や家族と話す・遊ぶ予定を1つ決める。", knowledge: "人との予定は後回しにされがちですが、先に日程を決めると実現しやすくなります。短時間の交流でも十分です。" },
  { title: "旅の理由を決める", short: "観光地を埋める前に、旅で感じたいことを一つ選びます。", quote: "旅は消費するイベントではなく、自分の世界を広げる時間の使い方", action: "次に行きたい場所と、そこで感じたいことを1行で書く。", knowledge: "旅の満足度は、訪問数だけでなく移動の余白や目的との相性でも変わります。詰め込みすぎない旅も立派な選択です。" },
  { title: "学びを楽しみに変える", short: "役に立つかどうかを急がず、知りたい気持ちからテーマを選びます。", quote: "学びは収入のためだけでなく、世界を面白く見るための遊びにもなる", action: "読みたい本や見たい講座を1つ、楽しみとして保存する。", knowledge: "学びの入口は、専門書でなくても構いません。興味が続く題材から始めると、結果的に理解が深まりやすくなります。" },
  { title: "小さな安心を準備する", short: "災害や体調不良など、もしもの時に助かる準備を一つだけ進めます。", quote: "安心は不安を消す魔法ではなく、困ったときの選択肢を増やす準備", action: "連絡先・ライト・常備薬など、気になる備えを1つ確認する。", knowledge: "防災や生活の備えは、地域や家族構成で必要なものが変わります。自治体や公的機関の情報も確認してください。" },
  { title: "自分のペースを認める", short: "誰かの資産額や進み方と比べず、今日の自分の速度を確かめます。", quote: "FIREは競争のゴールではなく、自分の人生に合う速度を選ぶこと", action: "比べて苦しくなる情報から、今日は10分離れる。", knowledge: "金融市場やSNSには、速さを競わせる情報が流れます。自分の目的と時間軸に必要な情報だけを選んで構いません。" }
];

const SPECIAL_DAYS = {
  "01-01": { title: "元日｜今年の自由を設計する", event: "元日", sourceType: "国民の祝日", description: "一年の始まりを迎える日です", sourceNote: "日本の国民の祝日。", category: "人生", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "02-11": { title: "建国記念の日｜これからの暮らしを考える", event: "建国記念の日", sourceType: "国民の祝日", description: "建国をしのび、国を愛する心を養う日です", sourceNote: "日本の国民の祝日。", category: "人生", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "02-20": { title: "世界社会正義の日｜機会の公平を考える", event: "世界社会正義の日", sourceType: "国際デー", description: "社会正義の大切さを考える国際デーです", sourceNote: "国連が定める国際デー。", category: "人間関係", source: { label: "国際連合「World Day of Social Justice」", url: "https://www.un.org/en/observances/world-day-social-justice" } },
  "02-23": { title: "天皇誕生日｜穏やかな日常を味わう", event: "天皇誕生日", sourceType: "国民の祝日", description: "天皇の誕生日を祝う日です", sourceNote: "日本の国民の祝日。", category: "幸福", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "02-29": { title: "うるう日｜4年に一度の余白を楽しむ", event: "うるう日", sourceType: "暦のしくみ／独自テーマ", description: "暦と季節のずれを調整するために置かれる日です", sourceNote: "うるう年の暦を入口にしたワクワクFIRE独自テーマです。", category: "時間" },
  "03-08": { title: "国際女性デー｜選択肢を広げる", event: "国際女性デー", sourceType: "国際デー", description: "女性の権利と平等について考える国際デーです", sourceNote: "国連が定める国際デー。", category: "自由", source: { label: "国際連合「International Women's Day」", url: "https://www.un.org/en/observances/womens-day" } },
  "03-20": { title: "国際幸福デー｜自分の幸せを測り直す", event: "国際幸福デー", sourceType: "国際デー", description: "幸福とウェルビーイングの大切さを考える国際デーです", sourceNote: "国連が定める国際デー。", category: "幸福", source: { label: "国際連合「International Day of Happiness」", url: "https://www.un.org/en/observances/international-day-of-happiness" } },
  "03-21": { title: "世界詩歌の日｜数字にならない豊かさ", event: "世界詩歌の日", sourceType: "国際デー", description: "詩や言葉の文化的な力を考える日です", sourceNote: "ユネスコが掲げる国際デー。", category: "趣味", source: { label: "国際連合「World Poetry Day」", url: "https://www.un.org/en/observances/world-poetry-day" } },
  "04-02": { title: "世界自閉症啓発デー｜違いを知り、暮らしを選ぶ", event: "世界自閉症啓発デー", sourceType: "国際デー", description: "自閉症への理解を深める国際デーです", sourceNote: "国連が定める国際デー。", category: "人間関係", source: { label: "国際連合「World Autism Awareness Day」", url: "https://www.un.org/en/observances/autism-awareness-day" } },
  "04-07": { title: "世界保健デー｜健康を計画の中心に置く", event: "世界保健デー", sourceType: "国際デー", description: "健康について考える世界保健機関の記念日です", sourceNote: "世界保健機関（WHO）が定める日。", category: "健康", source: { label: "WHO「World Health Day」", url: "https://www.who.int/campaigns/world-health-day" } },
  "04-23": { title: "世界図書・著作権デー｜一冊から世界を広げる", event: "世界図書・著作権デー", sourceType: "国際デー", description: "本と読書、著作権の大切さを考える日です", sourceNote: "ユネスコが掲げる国際デー。", category: "学び", source: { label: "UNESCO「World Book and Copyright Day」", url: "https://www.unesco.org/en/days/world-book-and-copyright" } },
  "04-29": { title: "昭和の日｜過去から暮らしを学ぶ", event: "昭和の日", sourceType: "国民の祝日", description: "激動の日々を経た昭和の時代を顧み、国の将来を思う日です", sourceNote: "日本の国民の祝日。", category: "人生", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "05-03": { title: "憲法記念日｜自分の権利と自由を知る", event: "憲法記念日", sourceType: "国民の祝日", description: "日本国憲法の施行を記念し、国の成長を期する日です", sourceNote: "日本の国民の祝日。", category: "自由", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "05-04": { title: "みどりの日｜自然の中で時間を使う", event: "みどりの日", sourceType: "国民の祝日", description: "自然に親しみ、その恩恵に感謝する日です", sourceNote: "日本の国民の祝日。", category: "健康", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "05-05": { title: "こどもの日｜遊ぶ時間を守る", event: "こどもの日", sourceType: "国民の祝日", description: "こどもの人格を重んじ、幸福を願う日です", sourceNote: "日本の国民の祝日。", category: "家族", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "05-15": { title: "国際家族デー｜一緒に過ごす時間を考える", event: "国際家族デー", sourceType: "国際デー", description: "家族に関わる課題について考える国際デーです", sourceNote: "国連が定める国際デー。", category: "家族", source: { label: "国際連合「International Day of Families」", url: "https://www.un.org/en/observances/international-day-of-families" } },
  "05-31": { title: "世界禁煙デー｜健康と自由のために選ぶ", event: "世界禁煙デー", sourceType: "国際デー", description: "たばこの健康への影響と、健康を守る環境について考える日です", sourceNote: "世界保健機関（WHO）が定める日。", category: "健康", source: { label: "WHO「World No Tobacco Day」", url: "https://www.who.int/campaigns/world-no-tobacco-day" } },
  "06-05": { title: "世界環境デー｜未来の暮らしを想像する", event: "世界環境デー", sourceType: "国際デー", description: "環境を守る行動を世界で考える日です", sourceNote: "国連が定める国際デー。", category: "人生", source: { label: "国際連合「World Environment Day」", url: "https://www.un.org/en/observances/world-environment-day" } },
  "06-21": { title: "国際ヨガデー｜呼吸に戻る", event: "国際ヨガデー", sourceType: "国際デー", description: "ヨガがもたらす心身の健康への効果を考える国際デーです", sourceNote: "国連が定める国際デー。", category: "健康", source: { label: "国際連合「International Day of Yoga」", url: "https://www.un.org/en/observances/international-day-yoga" } },
  "07-30": { title: "国際フレンドシップデー｜仲間と自由を分け合う", event: "国際フレンドシップデー", sourceType: "国際デー", description: "友情が平和や相互理解につながることを考える日です", sourceNote: "国連が定める国際デー。", category: "人間関係", source: { label: "国際連合「International Day of Friendship」", url: "https://www.un.org/en/observances/friendship-day" } },
  "08-11": { title: "山の日｜自然の中で暮らしを想像する", event: "山の日", sourceType: "国民の祝日", description: "山に親しむ機会を得て、山の恩恵に感謝する日です", sourceNote: "日本の国民の祝日。", category: "旅行", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "08-12": { title: "国際青少年デー｜未来の選択肢を増やす", event: "国際青少年デー", sourceType: "国際デー", description: "若者が社会で果たす役割を考える国際デーです", sourceNote: "国連が定める国際デー。", category: "挑戦", source: { label: "国際連合「International Youth Day」", url: "https://www.un.org/en/observances/international-youth-day" } },
  "09-01": { title: "防災の日｜安心を小さく準備する", event: "防災の日", sourceType: "日本の記念日", description: "防災について考え、備えを確認する日です", sourceNote: "日本の防災を考える日。", category: "制度" },
  "09-08": { title: "国際識字デー｜知る力を味方にする", event: "国際識字デー", sourceType: "国際デー", description: "読み書きの大切さと学ぶ機会について考える日です", sourceNote: "ユネスコが掲げる国際デー。", category: "学び", source: { label: "UNESCO「International Literacy Day」", url: "https://www.unesco.org/en/days/literacy-day" } },
  "09-21": { title: "国際平和デー｜穏やかな時間を選ぶ", event: "国際平和デー", sourceType: "国際デー", description: "世界の平和について考える日です", sourceNote: "国連が定める国際デー。", category: "自由", source: { label: "国際連合「International Day of Peace」", url: "https://www.un.org/en/observances/international-day-peace" } },
  "10-10": { title: "世界メンタルヘルスデー｜心の余白を守る", event: "世界メンタルヘルスデー", sourceType: "国際デー", description: "心の健康への理解を深める日です", sourceNote: "世界保健機関（WHO）が掲げる日。", category: "幸福", source: { label: "WHO「World Mental Health Day」", url: "https://www.who.int/campaigns/world-mental-health-day" } },
  "10-16": { title: "世界食料デー｜食べる幸福を見直す", event: "世界食料デー", sourceType: "国際デー", description: "食料と飢餓について世界で考える日です", sourceNote: "国連食糧農業機関（FAO）が掲げる日。", category: "幸福", source: { label: "FAO「World Food Day」", url: "https://www.fao.org/world-food-day/en" } },
  "11-03": { title: "文化の日｜好きなものを深める", event: "文化の日", sourceType: "国民の祝日", description: "自由と平和を愛し、文化をすすめる日です", sourceNote: "日本の国民の祝日。", category: "趣味", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "11-19": { title: "世界トイレデー｜見えない仕組みに気づく", event: "世界トイレデー", sourceType: "国際デー", description: "安全な水と衛生の大切さを考える日です", sourceNote: "国連が定める国際デー。", category: "制度", source: { label: "国際連合「World Toilet Day」", url: "https://www.un.org/en/observances/world-toilet-day" } },
  "11-23": { title: "勤労感謝の日｜働く意味を見つめる", event: "勤労感謝の日", sourceType: "国民の祝日", description: "勤労をたっとび、生産を祝い、国民たがいに感謝する日です", sourceNote: "日本の国民の祝日。", category: "働き方", source: { label: "内閣府「国民の祝日について」", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" } },
  "12-03": { title: "国際障害者デー｜誰もが選べる暮らしを考える", event: "国際障害者デー", sourceType: "国際デー", description: "障害のある人の権利と包摂について考える日です", sourceNote: "国連が定める国際デー。", category: "自由", source: { label: "国際連合「International Day of Persons with Disabilities」", url: "https://www.un.org/en/observances/day-persons-disabilities" } },
  "12-10": { title: "人権デー｜自分と誰かの自由を考える", event: "人権デー", sourceType: "国際デー", description: "すべての人の権利と自由について考える日です", sourceNote: "国連が定める国際デー。", category: "自由", source: { label: "国際連合「Human Rights Day」", url: "https://www.un.org/en/observances/human-rights-day" } },
  "12-31": { title: "大みそか｜今年の幸福を棚卸しする", event: "大みそか", sourceType: "季節の節目／独自テーマ", description: "一年の最後の日です", sourceNote: "年末の節目を入口にしたワクワクFIRE独自テーマです。", category: "幸福" }
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(month, day) {
  return pad(month) + "-" + pad(day);
}

function relatedLinks(category) {
  const primary = CATEGORY_META[category]?.link || "/articles/";
  const links = [primary];
  if (category === "旅行") links.push("/fire-migration-japan/");
  if (category === "遊び" || category === "趣味") links.push("/#contents");
  if (category === "移住") links.push("/fire-migration-world/");
  return [...new Set(links)];
}

function makeEntry(monthNumber, day, ordinal) {
  const key = dateKey(monthNumber, day);
  const month = MONTHS[monthNumber - 1];
  const lens = LENSES[(day - 1) % LENSES.length];
  const special = SPECIAL_DAYS[key];
  const category = special?.category || CATEGORY_CYCLE[(ordinal - 1) % CATEGORY_CYCLE.length];
  const categoryMeta = CATEGORY_META[category];
  const title = special?.title || [
    month.name + "、" + lens.title + "を試す日",
    month.name + "の「" + lens.title + "」",
    month.name + "に「" + lens.title + "」を考える",
    "FIREの視点で「" + month.name + "の" + lens.title + "」"
  ][(day - 1) % 4];
  const originalEvent = special?.event || "ワクワクFIRE独自テーマ";
  const sourceType = special?.sourceType || "ワクワクFIRE独自テーマ";
  const sourceNote = special?.sourceNote || "公式記念日ではなく、ワクワクFIREが日付ごとに提案する独自テーマです。";
  const shortText = special
    ? "今日は" + special.event + "を入口に、" + lens.short
    : month.name + "の空気に合わせて、" + lens.short;
  const fireMessage = "今日は" + month.name + "。" + lens.quote + "。" + category + "の視点で、" + month.hint + "。";
  const dayContext = special
    ? "今日は" + special.event + "です。" + special.description + "。この話題をきっかけに、「" + lens.title + "」を自分の暮らしへ引き寄せて考えます。"
    : "今日は" + month.name + "。" + month.season + "この日のテーマは「" + lens.title + "」です。公式の記念日を示すものではなく、ワクワクFIREが日付ごとに提案する独自テーマとして、今の自分に合う選択を探します。";
  const fireConnection = "FIREは資産を増やすことだけでなく、自分の時間と選択肢をどう使うかを考える生き方です。" + lens.short + category + "という入口から眺めると、" + month.hint + "ためのヒントが見つかります。";
  const knowledge = lens.knowledge + "大切なのは、他人の正解をそのまま持ち込まず、自分の暮らしに合う大きさで試すことです。";
  const body = dayContext + "\n\n" + fireConnection + "\n\n" + knowledge;
  return {
    id: key,
    date: key,
    title,
    category,
    categoryIcon: categoryMeta.icon,
    sourceType,
    originalEvent,
    sourceNote,
    shortText,
    fireMessage,
    dayContext,
    fireConnection,
    knowledge,
    body,
    action: lens.action,
    relatedLinks: relatedLinks(category),
    sources: special?.source ? [special.source] : []
  };
}

const entries = [];
const monthlyEntries = {};
let ordinal = 0;
const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

for (let month = 1; month <= 12; month += 1) {
  monthlyEntries[pad(month)] = [];
  for (let day = 1; day <= daysPerMonth[month - 1]; day += 1) {
    ordinal += 1;
    const entry = makeEntry(month, day, ordinal);
    entries.push(entry);
    monthlyEntries[pad(month)].push(entry);
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
for (const [month, monthEntries] of Object.entries(monthlyEntries)) {
  await fs.writeFile(path.join(OUTPUT_DIR, month + ".json"), JSON.stringify(monthEntries, null, 2) + "\n", "utf8");
}

const index = {
  schemaVersion: 1,
  description: "ワクワクFIRE 365日 FIREカレンダーの軽量インデックス。詳細本文は月別JSONに分離しています。",
  entries: entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    title: entry.title,
    category: entry.category,
    categoryIcon: entry.categoryIcon,
    sourceType: entry.sourceType,
    shortText: entry.shortText
  }))
};
await fs.writeFile(path.join(OUTPUT_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ generated: true, entries: entries.length, files: Object.keys(monthlyEntries).length + 1 }, null, 2));

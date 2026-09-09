import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sections = {
  animal: `<!-- ADSENSE-CONTENT-VALUE:animal:START -->
<section class="content-value" aria-labelledby="animal-value-title">
  <h2 id="animal-value-title">この診断で見つけるもの</h2>
  <p>動物FIRE診断は、資産額や年齢ではなく、お金との距離感と自由時間の使い方を12問で眺めるミニ診断です。結果では、貯める安心を大切にするのか、誰かと楽しむ時間を優先するのかなど、FIRE後の暮らしを考える手がかりを動物のイメージで紹介します。</p>
  <h3>遊び方とFIREとのつながり</h3>
  <p>質問は全12問、所要時間は約2分です。迷ったら「今の自分ならどちらを選ぶか」で直感的に答えてください。診断結果を正解にせず、平日の理想の過ごし方や、残したい支出を一つ言葉にしてみると、FIREを退職日だけでなく、その後の時間まで含めて考えられます。</p>
  <h3>このページを作った理由</h3>
  <p>お金の計算から始めると、FIREが遠い計画に見えることがあります。まずは好きな過ごし方を軽く知り、そこから必要なお金と時間を逆算できる入口を用意したくて、この動物のたとえを使いました。診断後は、気になった価値観を暮らしの小さな実験に変えて楽しんでください。</p>
  <h3>こんな人におすすめ</h3>
  <p>FIREに興味はあるけれど、いきなり資産額の計算を始めるのは重いと感じる人、家族や友人と楽しく価値観を比べたい人に向いています。</p>
  <p class="content-value__note">もう少し深く整理したい人は、<a href="../fire-strengths/">FIREストレングス診断</a>で価値観を比べたり、<a href="../articles/life-after-fire/">FIRE後の時間の使い方を考えるコラム</a>を読んだりできます。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:animal:END -->
`,
  japan: `<!-- ADSENSE-CONTENT-VALUE:japan:START -->
<section class="content-value" aria-labelledby="japan-value-title">
  <h2 id="japan-value-title">場所を変えると、時間の形も変わる</h2>
  <p>国内FIRE移住診断は、都会の便利さ、自然、海や山、気候、車、人との距離感など、18個の質問から暮らしの好みを整理する案内所です。結果は日本の候補地を一つのぞいてみるきっかけ。候補を決めつけるのではなく、次に調べる条件を見つけられます。</p>
  <h3>遊び方とFIREとの関係</h3>
  <p>「会社を辞めて移住する」ボタンから質問に答えると、相性のよさそうな場所へ進みます。家賃だけでなく、車の必要性、医療や買い物、気候、会いたい人との距離も含めて結果を眺めてください。FIREの資産計画は、どこでどんな一日を送るかによって必要な費用も自由時間も変わるからです。</p>
  <h3>この案内所を作った理由</h3>
  <p>資産額の目標だけでは、FIRE後の景色を想像しにくいことがあります。日本の中にも、海辺で過ごす、山の近くで趣味を続ける、便利な街で人と会うなど、違う選択肢があります。少しふざけた案内所で候補地をのぞき、現地の情報を調べる一歩につなげてほしいと考えました。</p>
  <h3>こんな人におすすめ</h3>
  <p>退職後の住まいをまだ決めていない人、旅行の延長で暮らしの候補地を探したい人、生活費以外の条件も含めて移住を考えたい人に向いています。</p>
  <p class="content-value__note">結果を見たら、候補地の公式情報や現地の下見で確かめましょう。<a href="../fire-migration-world/">海外版の案内所</a>や、毎日のテーマから暮らしを考える<a href="../fire-calendar/">365日FIREカレンダー</a>も関連します。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:japan:END -->
`,
  world: `<!-- ADSENSE-CONTENT-VALUE:world:START -->
<section class="content-value" aria-labelledby="world-value-title">
  <h2 id="world-value-title">国を選ぶ前に、暮らしの条件を言葉にする</h2>
  <p>海外FIRE移住診断は、生活費、気候、海や自然、医療、ビザ、日本との距離など、海外で暮らすときに気になる24の軸を質問にした案内所です。第1候補と第2候補を眺めながら、「何を優先したいか」「何なら妥協できるか」を整理できます。</p>
  <h3>遊び方とFIREとの関係</h3>
  <p>質問に答えると、あなたの条件に近い海外の候補地が表示されます。結果は移住先の断定ではありません。現地の家賃、税金、保険、治安、滞在資格などを公的情報で調べ、FIRE後に使いたい時間と費用を具体化するためのスタート地点です。</p>
  <h3>この診断を作った理由</h3>
  <p>「海外で暮らしたい」という気持ちは、国名より先に、暖かさ、歩ける街、海との距離、家族に会える安心などの条件として現れます。条件から旅を始めることで、資産形成を我慢の表にせず、どんな一日を選びたいかから考えられるようにしました。</p>
  <h3>こんな人におすすめ</h3>
  <p>海外暮らしに憧れはあるけれど国名だけでは決められない人、旅と移住を同じ条件で比べてみたい人、FIRE後の生活費と距離感を具体化したい人に向いています。</p>
  <p class="content-value__note">候補地を旅の計画へ広げるなら、<a href="../ワールドツアー/">FIREワールドツアー</a>で行き先を選ぶ物語を遊んだり、<a href="../fire-migration-japan/">国内版の移住診断</a>と比べたりできます。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:world:END -->
`,
  strengths: `<!-- ADSENSE-CONTENT-VALUE:strengths:START -->
<section class="content-value" aria-labelledby="strengths-value-title">
  <h2 id="strengths-value-title">結果を、FIRE後の設計図に変える</h2>
  <p>FIREストレングス診断は、45問の二択から、今の自分が大切にしたい15資質と5領域を可視化し、12種類のタイプとして紹介する価値観診断です。診断でできるのは、向き不向きを決めることではなく、自由・安心・遊び・挑戦・働き方のどこに心が動くかを自分の言葉で振り返ることです。</p>
  <h3>遊び方とFIREとのつながり</h3>
  <p>呼ばれたい名前を入力し、二択を45問、考えすぎずに選びます。結果画面では資質TOP5、タイプの特徴、迷った質問、暮らしのアイデアを順番に確認できます。数字の目標に価値観を重ねると、必要な資産だけでなく、残したい仕事や始めたい趣味もFIRE計画に入れられます。</p>
  <h3>この診断を作った理由</h3>
  <p>FIREの話は「いつ辞められるか」に集中しがちですが、辞めた翌朝をどう過ごしたいかは人によって違います。二択という軽い遊びでその違いを見えるようにし、診断結果を家族との会話や、次の休日の小さな実験につなげてほしいと考えました。</p>
  <h3>こんな人におすすめ</h3>
  <p>貯蓄額の話だけではFIRE後のイメージが湧かない人、働き方や趣味の優先順位を整理したい人、診断結果を家族との会話のきっかけにしたい人に向いています。</p>
  <p class="content-value__note">診断後は<a href="./stats.html">みんなの結果</a>で傾向を眺め、<a href="../my-fire-life/">FIRE QUEST</a>で読んだコラムや遊びの足あとを残せます。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:strengths:END -->
`,
  stats: `<!-- ADSENSE-CONTENT-VALUE:stats:START -->
<section class="content-value" aria-labelledby="stats-value-title">
  <h2 id="stats-value-title">この集計ページの読み方</h2>
  <p>ここに表示するのは、FIREストレングス診断を完了した人の結果を匿名で集計したものです。12タイプの人数や、各診断で1位になった資質の傾向を眺められます。人数の多さは優劣や正しさを示しません。回答数が少ない時期は、数字が大きく動くこともあります。</p>
  <h3>このページがFIREとつながる理由</h3>
  <p>一人で考えると「みんなは何を大切にしているのだろう」と迷うことがあります。匿名の傾向を参考にしながら、自分の結果との差や共通点を会話のきっかけにできます。FIRE後の時間の使い方には一つの正解がないことを、タイプの広がりから感じてください。</p>
  <h3>見た後にできること</h3>
  <p>気になる資質が見つかったら、<a href="./">45問の診断</a>で自分の結果を確かめてみましょう。結果を暮らしに落とし込むヒントは、<a href="../articles/life-after-fire/">FIRE後の時間を考えるコラム</a>でも紹介しています。</p>
  <h3>こんな人におすすめ</h3>
  <p>自分の結果を全体の傾向と照らし合わせたい人、FIRE後の価値観に正解がないことを知りたい人、友人とタイプの違いを話してみたい人に向いています。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:stats:END -->
`,
  myLife: `<!-- ADSENSE-CONTENT-VALUE:my-life:START -->
<section class="content-value" aria-labelledby="my-life-value-title">
  <h2 id="my-life-value-title">FIRE QUESTとは</h2>
  <p>FIRE QUESTは、ワクワクFIREの記事を読んだり、診断やゲームを遊んだりした時間を、この端末に記録する「冒険の書」です。経験値、レベル、バッジ、訪問や読了の足あとを通じて、資産額だけでは見えない学びと楽しみの積み重ねを振り返れます。</p>
  <h3>遊び方とFIREとの関係</h3>
  <p>ニックネームを決めたら、気になるコラムを読み、毎日ページへ戻り、FIREカードを1枚引いてみてください。データはブラウザ内に保存され、ファイルへの書き出しと復元もできます。FIRE後の自由時間をどう過ごしたいかは、計画表だけでなく、実際に試したことの記録からも見えてきます。</p>
  <h3>このページを作った理由</h3>
  <p>FIREを目指す途中は、残高の変化だけを成果にしやすいものです。読んだ、考えた、誰かと話した、遊んだという小さな行動も未来の暮らしをつくる材料として残せるように、ゲームのような記録画面にしました。全部集める必要はなく、次の寄り道を一つ選ぶために使ってください。</p>
  <h3>こんな人におすすめ</h3>
  <p>FIREの準備を続ける力を見える形で残したい人、読書や診断を一度きりで終わらせず次の行動につなげたい人、家族と遊びの記録を共有したい人に向いています。</p>
  <p class="content-value__note">最初の寄り道には<a href="../fire-strengths/">FIREストレングス診断</a>や、今日のテーマを選べる<a href="../fire-calendar/">365日FIREカレンダー</a>がおすすめです。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:my-life:END -->
`,
  calendar: `<!-- ADSENSE-CONTENT-VALUE:calendar:START -->
<section class="content-value" aria-labelledby="calendar-value-title">
  <h2 id="calendar-value-title">このカレンダーの読み方</h2>
  <p>365日FIREカレンダーは、記念日や季節の話題を入口に、その日のテーマ、FIREとのつながり、今日できる小さな行動を読むページです。日本時間の今日を開くことも、月別リストから過去の日付を選ぶこともできます。毎日同じ結論を出すのではなく、違う角度で暮らしを眺めるための読み物です。</p>
  <h3>FIREとのつながり</h3>
  <p>FIREは資産を増やすことだけでなく、時間・健康・人間関係・趣味をどこへ置くかを選ぶことでもあります。カレンダーでは、支出を見直す日も、何もしない日も、旅や学びを楽しむ日も同じように扱います。今日の問いを一つだけ、家計や予定表に置き換えてみてください。</p>
  <h3>作った理由とおすすめの人</h3>
  <p>大きな計画を立てる余裕がない日でも、短い問いなら暮らしに置けます。FIREを考え始めた人、数字の話に疲れた人、毎日の楽しみを増やしたい人に向いています。答えを急がず、気になった一日を保存して後から読み返す使い方もできます。</p>
  <p class="content-value__note">住む場所や旅の条件を考えたくなったら、<a href="../fire-migration-japan/">国内移住診断</a>や<a href="../fire-migration-world/">海外移住診断</a>にも寄り道できます。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:calendar:END -->
`
};

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), "utf8");
}

async function write(relativePath, content) {
  await fs.writeFile(path.join(ROOT, relativePath), content, "utf8");
}

function insertOnce(html, marker, section, needle, placement = "before") {
  if (html.includes(marker)) return html;
  const index = placement === "after" ? html.indexOf(needle) + needle.length : html.indexOf(needle);
  if (index < (placement === "after" ? needle.length : 0)) throw new Error(`挿入位置が見つかりません: ${marker}`);
  return html.slice(0, index) + section + html.slice(index);
}

async function updateInfoPage(relativePath, key, noticeNeedle) {
  let html = await read(relativePath);
  html = insertOnce(html, `ADSENSE-CONTENT-VALUE:${key}:START`, sections[key], noticeNeedle);
  await write(relativePath, html);
}

async function updateMainPage(relativePath, key, markerKey = key) {
  let html = await read(relativePath);
  const mainClose = html.lastIndexOf("</main>");
  if (mainClose < 0) throw new Error(`mainが見つかりません: ${relativePath}`);
  if (!html.includes(`ADSENSE-CONTENT-VALUE:${markerKey}:START`)) html = html.slice(0, mainClose) + sections[key] + html.slice(mainClose);
  await write(relativePath, html);
}

await updateInfoPage("fire-animal-test/index.html", "animal", '<p class="diagnosis-page__notice"');
await updateInfoPage("fire-migration-japan/index.html", "japan", '<p class="diagnosis-page__notice"');
await updateInfoPage("fire-migration-world/index.html", "world", '<p class="diagnosis-page__notice"');

let strengths = await read("fire-strengths/index.html");
if (!strengths.includes("ADSENSE-CONTENT-VALUE:strengths:START")) {
  const infoStart = strengths.indexOf('<section class="diagnosis-page__info fs-seo-info"');
  const infoClose = strengths.indexOf("</section>", infoStart);
  if (infoStart < 0 || infoClose < 0) throw new Error("FIREストレングスの説明欄が見つかりません");
  strengths = strengths.slice(0, infoClose) + sections.strengths + strengths.slice(infoClose);
  await write("fire-strengths/index.html", strengths);
}

await updateMainPage("fire-strengths/stats.html", "stats");
await updateMainPage("my-fire-life/index.html", "myLife", "my-life");
await updateMainPage("fire-calendar/index.html", "calendar");

let worldTour = await read("ワールドツアー/index.html");
if (!worldTour.includes("ADSENSE-CONTENT-VALUE:world-tour:START")) {
  const worldTourSection = `<!-- ADSENSE-CONTENT-VALUE:world-tour:START -->
<section class="content-value world-tour-value" aria-labelledby="world-tour-value-title">
  <h2 id="world-tour-value-title">世界を旅するテキストアドベンチャー</h2>
  <p>FIREワールドツアーは、自由になった後に行ってみたい国や街を、マルとシバくんと一緒に選ぶ短い旅のゲームです。表示される場面で行き先や過ごし方を選び、旅先の空気と「どんな時間を使いたいか」を想像します。</p>
  <h3>遊び方</h3>
  <p>最初から順番に読み進め、気になる選択肢をタップしてください。正解やスコアを競うゲームではなく、選んだ道によって旅の景色が変わる読み物です。気になった場所は、ゲームの外で費用・季節・滞在条件を調べるメモにできます。</p>
  <h3>FIREとのつながり</h3>
  <p>FIRE後の自由は、退職日から始まる空白ではありません。旅、学び、誰かとの時間をどのくらい持ちたいかを先に想像すると、必要なお金と働き方の選択肢が具体的になります。このゲームは、資産計算の前に「使いたい時間」を見つけるための入口です。</p>
  <h3>この旅を作った理由</h3>
  <p>世界一周のような大きな夢も、最初は一つの行き先を選ぶところから始まります。画面の中で寄り道を楽しみながら、現実の休日や将来の旅に持ち帰れる好奇心を残したくて作りました。</p>
  <h3>こんな人におすすめ</h3>
  <p>旅行の行き先を考えるだけで気分が上がる人、FIRE後に使いたい時間を先に想像したい人、短い物語を家族や友人と一緒に楽しみたい人に向いています。</p>
  <p class="content-value__note">移住の条件をもう少し整理したい人は<a href="../fire-migration-world/">海外FIRE移住診断</a>へ、毎日の小さな問いを楽しみたい人は<a href="../fire-calendar/">365日FIREカレンダー</a>へどうぞ。</p>
</section>
<!-- ADSENSE-CONTENT-VALUE:world-tour:END -->
`;
  const scriptNeedle = '<script type="module" crossorigin';
  const scriptIndex = worldTour.indexOf(scriptNeedle);
  if (scriptIndex < 0) throw new Error("ワールドツアーの起動スクリプトが見つかりません");
  worldTour = worldTour.slice(0, scriptIndex) + worldTourSection + worldTour.slice(scriptIndex);
}
if (!worldTour.includes('href="./content-value.css"')) {
  worldTour = worldTour.replace('</head>', '    <link rel="stylesheet" href="./content-value.css" />\n  </head>');
}
await write("ワールドツアー/index.html", worldTour);

console.log(JSON.stringify({ updated: [
  "fire-animal-test/index.html",
  "fire-migration-japan/index.html",
  "fire-migration-world/index.html",
  "fire-strengths/index.html",
  "fire-strengths/stats.html",
  "my-fire-life/index.html",
  "fire-calendar/index.html",
  "ワールドツアー/index.html"
] }, null, 2));

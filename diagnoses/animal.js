
(function(){
  "use strict";

  var AFIRE_CONFIG={
    communityUrl:"https://community.camp-fire.jp/projects/view/778625",
    appTitle:"動物FIRE診断&#65372;あなたのFIREタイプを12問で診断",
    siteUrl:""
  };
  var AFIRE_TYPE_ORDER=["sloth","squirrel","cheetah","ant","cat","dolphin","eagle","turtle"];
  var AFIRE_TYPES={
    sloth:{emoji:"🦥",name:"ナマケモノFIRE",catchphrase:"働かないためなら&#12289;本気を出す&#12290;",ecology:"必要なものを見極め&#12289;余白のある暮らしをじっくり味わうタイプ&#12290;",strengths:["固定費を下げるのが得意","自分のペースを守れる","時間の価値をよく知っている"],cautions:["準備を先延ばしにしすぎない","人とのつながりも少しずつ保つ"],compatible:"squirrel",companionLine:"コツコツ備えるリスFIREとは&#12289;安心感のある組み合わせ&#12290;"},
    squirrel:{emoji:"🐿&#65039;",name:"リスFIRE",catchphrase:"小さな備えを&#12289;未来の自由に変える&#12290;",ecology:"どんぐりを一つずつ集めるように&#12289;資産と安心を着実に積み上げるタイプ&#12290;",strengths:["長期的な計画を立てられる","節約と資産形成を続けられる","リスクを冷静に見られる"],cautions:["貯めること自体が目的にならない","今の楽しみも予算に入れる"],compatible:"turtle",companionLine:"慎重なカメFIREとなら&#12289;守りの強いFIRE設計ができそう&#12290;"},
    cheetah:{emoji:"🐆",name:"チーターFIRE",catchphrase:"自由は&#12289;早くつかみに行く&#12290;",ecology:"スピード感と行動力で&#12289;働き方や暮らしを大胆に変えていくタイプ&#12290;",strengths:["決断と行動が速い","チャンスを逃さない","変化への適応力が高い"],cautions:["生活防衛資金を削りすぎない","勢いだけで大きな判断をしない"],compatible:"eagle",companionLine:"挑戦を楽しむワシFIREとは&#12289;次の一手を生みやすい組み合わせ&#12290;"},
    ant:{emoji:"🐜",name:"アリFIRE",catchphrase:"働き方を整えながら&#12289;自由へ進む&#12290;",ecology:"完全に仕事をなくすより&#12289;好きな仕事や小さな収入と自由を両立するタイプ&#12290;",strengths:["現実的な収入設計ができる","継続力がある","人や社会との接点を大切にできる"],cautions:["働き続けることを義務にしない","休む計画も先に作る"],compatible:"dolphin",companionLine:"人との時間を楽しむイルカFIREとは&#12289;豊かな日常を作れそう&#12290;"},
    cat:{emoji:"🐈",name:"ネコFIRE",catchphrase:"気分と心地よさを&#12289;人生の主導権に&#12290;",ecology:"好きな場所で好きなことを&#12289;無理のないリズムで楽しみたいタイプ&#12290;",strengths:["自分の価値観に正直","心地よい環境を選べる","無理な競争から距離を置ける"],cautions:["孤立しすぎない仕組みを作る","気分任せにならない最低限のルールを持つ"],compatible:"sloth",companionLine:"余白を愛するナマケモノFIREとは&#12289;居心地のよい仲間になれそう&#12290;"},
    dolphin:{emoji:"🐬",name:"イルカFIRE",catchphrase:"大切な人との時間こそ&#12289;最高のリターン&#12290;",ecology:"お金や自由を&#12289;家族&#12539;友人&#12539;仲間との体験に変えていくタイプ&#12290;",strengths:["人との関係を育てられる","幸福の使い道がはっきりしている","周囲を明るくできる"],cautions:["人付き合いの出費を無制限にしない","一人の時間も大事にする"],compatible:"ant",companionLine:"現実的なアリFIREとなら&#12289;楽しい暮らしを持続しやすい&#12290;"},
    eagle:{emoji:"🦅",name:"ワシFIRE",catchphrase:"自由の先に&#12289;まだ見ぬ挑戦がある&#12290;",ecology:"FIREをゴールではなく&#12289;新しい事業や学びに飛び立つための翼と考えるタイプ&#12290;",strengths:["大きな構想を描ける","未知のことに挑戦できる","人を巻き込む力がある"],cautions:["挑戦の資金と生活資金を分ける","休むことも前進の一部にする"],compatible:"cheetah",companionLine:"スピードのあるチーターFIREとは&#12289;挑戦を加速できる組み合わせ&#12290;"},
    turtle:{emoji:"🐢",name:"カメFIRE",catchphrase:"ゆっくりでも&#12289;確かな安心を積み上げる&#12290;",ecology:"安全な道を選び&#12289;納得できるまで計算しながら自由を目指すタイプ&#12290;",strengths:["リスク管理が丁寧","長期戦に強い","不安を数字にして整理できる"],cautions:["完璧な安心を待ち続けない","できたことを定期的に認める"],compatible:"squirrel",companionLine:"堅実なリスFIREとは&#12289;安心をさらに厚くできる組み合わせ&#12290;"}
  };
  function afireAnswer(text,points){return{text:text,points:points};}
  var AFIRE_QUESTIONS=[
    {text:"もし明日から働かなくていいなら&#12289;まず何をする&#65311;",answers:[afireAnswer("とにかく寝て&#12289;ゆっくりする",{sloth:2,cat:1}),afireAnswer("新しいことを始める",{eagle:2,cheetah:1}),afireAnswer("家族や友人と過ごす",{dolphin:2}),afireAnswer("計画を見直して&#12289;より安心できる形にする",{turtle:2,squirrel:1})]},
    {text:"資産の8割が貯まったとしたら&#12289;どうする&#65311;",answers:[afireAnswer("もう十分&#12290;仕事を辞める",{cheetah:2}),afireAnswer("残りも貯めてからにする",{squirrel:2}),afireAnswer("少しだけ働きながら暮らす",{ant:2}),afireAnswer("目標額をもう一度&#12289;安全側に見直す",{turtle:2})]},
    {text:"FIRE後の理想の一日は&#65311;",answers:[afireAnswer("予定を入れず&#12289;気の向くまま過ごす",{sloth:2}),afireAnswer("新しい挑戦に取り組む",{eagle:2}),afireAnswer("家族や友人と出かける",{dolphin:2}),afireAnswer("好きな場所で自分のペースを守る",{cat:2})]},
    {text:"毎月5万円ほど生活費が足りないと分かったら&#65311;",answers:[afireAnswer("住む場所や固定費を見直す",{sloth:2,squirrel:1}),afireAnswer("月5万円分だけ働く",{ant:2}),afireAnswer("副業や小さなビジネスを始める",{eagle:2,cheetah:1}),afireAnswer("十分な予備資金ができるまで待つ",{turtle:2})]},
    {text:"投資資産が大きく下落したときの反応は&#65311;",answers:[afireAnswer("慌てず&#12289;回復を待つ",{squirrel:2}),afireAnswer("必要なら働いて補う",{ant:2}),afireAnswer("不安なので&#12289;もっと安全な形にする",{turtle:2}),afireAnswer("長い目で見れば何とかなる",{cheetah:2})]},
    {text:"FIRE後の平日の過ごし方で一番近いのは&#65311;",answers:[afireAnswer("特に予定を決めない",{sloth:2}),afireAnswer("数時間だけ仕事をする",{ant:2}),afireAnswer("友人や家族と会う",{dolphin:2}),afireAnswer("自分のプロジェクトを進める",{eagle:2})]},
    {text:"FIREから一番得たいものは&#65311;",answers:[afireAnswer("自由な時間",{sloth:2}),afireAnswer("誰にも急かされない自分のペース",{cat:2}),afireAnswer("大切な人との時間",{dolphin:2}),afireAnswer("新しい人生や挑戦",{eagle:2})]},
    {text:"いつFIREしたい&#65311;",answers:[afireAnswer("できるだけ早く&#12290;必要なら後で働く",{cheetah:2,ant:1}),afireAnswer("十分な資産ができてから",{squirrel:2,turtle:1}),afireAnswer("好きな仕事は続けながら",{ant:2}),afireAnswer("自分が納得したタイミングで",{cat:2})]},
    {text:"一人で過ごす時間が増えたら&#65311;",answers:[afireAnswer("最高&#12290;ずっと一人でも平気",{cat:2,sloth:1}),afireAnswer("仲間や家族と過ごしたくなる",{dolphin:2}),afireAnswer("新しい活動や趣味を始める",{eagle:2}),afireAnswer("少し働いて&#12289;人との接点を保つ",{ant:2})]},
    {text:"さらに1,000万円あれば&#12289;もっと安心できると思う&#65311;",answers:[afireAnswer("もちろん&#12290;貯めておきたい",{turtle:2,squirrel:1}),afireAnswer("何年も働くくらいなら&#12289;今の方がいい",{cheetah:2}),afireAnswer("500万円を貯めて&#12289;残りは副収入を作る",{ant:2}),afireAnswer("金額より&#12289;心地よく暮らせるかが大切",{cat:2})]},
    {text:"FIREした人が集まる交流会があったら&#65311;",answers:[afireAnswer("ぜひ行きたい",{dolphin:2}),afireAnswer("気分が乗ったら行く",{cat:2}),afireAnswer("家でゆっくりしていたい",{sloth:2}),afireAnswer("面白い人に会い&#12289;新しいことを始めたい",{eagle:2})]},
    {text:"一番近い考え方は&#65311;",answers:[afireAnswer("人生は短い&#12290;できるだけ早く自由になりたい",{cheetah:2}),afireAnswer("自由も大事だけど&#12289;お金の安心も必要",{turtle:2}),afireAnswer("少し働きながら自由に暮らすのがよい",{ant:2}),afireAnswer("資産をコツコツ積み上げれば&#12289;自由は近づく",{squirrel:2})]}
  ];

  var root=document.getElementById("animal-fire-app");
  var main=document.getElementById("afire-main");
  var state={answers:[],questionIndex:0,resultKey:null,timer:null};
  function decodeEntities(value){
    return String(value).replace(/&#(\d+);/g,function(full,code){var number=Number(code);return number>=0&&number<=1114111?String.fromCodePoint(number):full;});
  }
  function escapeHtml(value){
    var text=decodeEntities(value);
    return text.replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});
  }
  function clearTimer(){if(state.timer){window.clearTimeout(state.timer);state.timer=null;}}
  function renderHome(){
    clearTimer();
    main.innerHTML='<section class="afire-card afire-home"><div class="afire-animal-mark">🦥🐿&#65039;🐆</div><h2>あなたは&#12289;どの動物FIRE&#65311;</h2><p>お金との向き合い方&#12289;自由の使い方&#12289;理想の暮らし方から&#12289;あなたのFIREタイプを探します&#12290;</p><div class="afire-note">全12問&#12539;所要時間は約2分&#12290;正解はありません&#12290;直感で一番近い答えを選んでください&#12290;</div><button class="afire-primary" type="button" data-action="start">診断をはじめる &#8594;</button></section>';
    main.querySelector('[data-action="start"]').addEventListener("click",function(){state.answers=[];state.questionIndex=0;renderQuestion();});
  }
  function renderQuestion(){
    clearTimer();
    var q=AFIRE_QUESTIONS[state.questionIndex];
    var progress=Math.round((state.questionIndex/AFIRE_QUESTIONS.length)*100);
    var answers=q.answers.map(function(answer,index){return '<button class="afire-answer" type="button" data-answer="'+index+'"><span class="afire-letter">'+String.fromCharCode(65+index)+'</span><span class="afire-answer-text">'+escapeHtml(answer.text)+'</span></button>';}).join("");
    main.innerHTML='<section class="afire-card"><div class="afire-progress" aria-label="進捗"><span style="width:'+progress+'%"></span></div><div class="afire-question-meta"><span>QUESTION '+String(state.questionIndex+1).padStart(2,"0")+'</span><span>'+String(state.questionIndex+1)+' / '+AFIRE_QUESTIONS.length+'</span></div><h2 class="afire-question">'+escapeHtml(q.text)+'</h2><div class="afire-answers">'+answers+'</div></section>';
    Array.prototype.forEach.call(main.querySelectorAll("[data-answer]"),function(button){button.addEventListener("click",function(){var selected=q.answers[Number(button.getAttribute("data-answer"))];state.answers.push(selected.points);if(state.questionIndex<AFIRE_QUESTIONS.length-1){state.questionIndex+=1;renderQuestion();}else{state.resultKey=calculateResult(state.answers);renderInvestigation();}});});
  }
  function calculateScores(answers){
    var scores={};AFIRE_TYPE_ORDER.forEach(function(key){scores[key]=0;});
    answers.forEach(function(points){Object.keys(points||{}).forEach(function(key){scores[key]=(scores[key]||0)+points[key];});});
    return scores;
  }
  function calculateResult(answers){
    var scores=calculateScores(answers),topScore=-Infinity,tied=[];
    AFIRE_TYPE_ORDER.forEach(function(key){
      if(scores[key]>topScore){topScore=scores[key];tied=[key];}
      else if(scores[key]===topScore){tied.push(key);}
    });
    if(tied.length===1){return tied[0];}
    var strongCounts={};
    tied.forEach(function(key){strongCounts[key]=answers.reduce(function(total,points){return total+(points&&points[key]===2?1:0);},0);});
    tied.sort(function(a,b){
      if(strongCounts[a]!==strongCounts[b]){return strongCounts[b]-strongCounts[a];}
      var tieQuestions=[11,7,1];
      for(var i=0;i<tieQuestions.length;i++){
        var index=tieQuestions[i],aStrong=answers[index]&&answers[index][a]===2?1:0,bStrong=answers[index]&&answers[index][b]===2?1:0;
        if(aStrong!==bStrong){return bStrong-aStrong;}
      }
      return AFIRE_TYPE_ORDER.indexOf(a)-AFIRE_TYPE_ORDER.indexOf(b);
    });
    return tied[0];
  }
  function renderInvestigation(){
    main.innerHTML='<section class="afire-card afire-investigation"><div class="afire-orbit"></div><h2>あなたのFIREタイプを分析中&#8230;</h2><p>答えの傾向を動物たちに照らし合わせています&#12290;</p></section>';
    state.timer=window.setTimeout(function(){renderResult(state.resultKey);},1100);
  }
  function renderResult(key){
    clearTimer();
    var type=AFIRE_TYPES[key],partner=AFIRE_TYPES[type.compatible];
    var strengths=type.strengths.map(function(item){return '<span class="afire-pill">'+escapeHtml(item)+'</span>';}).join("");
    var cautions=type.cautions.map(function(item){return '<span class="afire-pill">'+escapeHtml(item)+'</span>';}).join("");
    main.innerHTML='<section class="afire-card afire-result"><p class="afire-result-label">YOUR FIRE TYPE</p><div class="afire-result-emoji">'+type.emoji+'</div><h2>'+escapeHtml(type.name)+'</h2><p class="afire-catchphrase">&#12300;'+escapeHtml(type.catchphrase)+'&#12301;</p><div class="afire-result-section"><h3>生態</h3><p>'+escapeHtml(type.ecology)+'</p></div><div class="afire-result-section"><h3>あなたの強み</h3><div class="afire-pills">'+strengths+'</div></div><div class="afire-result-section"><h3>気をつけたいこと</h3><div class="afire-pills">'+cautions+'</div></div><div class="afire-result-section"><h3>相性のよい仲間</h3><p>'+partner.emoji+' '+escapeHtml(partner.name)+'<br>'+escapeHtml(type.companionLine)+'</p></div><div class="wakuwaku-ranking-slot" data-ranking-slot></div><div class="afire-actions"><button class="afire-secondary afire-share" type="button" data-action="share">𝕏 結果をシェア</button><button class="afire-secondary" type="button" data-action="save">画像として保存</button><button class="afire-secondary" type="button" data-action="restart">もう一度診断する</button></div></section>';
    if (window.WakuwakuRanking) {
      window.WakuwakuRanking.mount({
        slot: main.querySelector('[data-ranking-slot]'),
        type: "animal",
        resultId: key,
        title: "みんなの動物FIREランキング",
        intro: "動物FIRE診断を受けたみんなの結果です。",
        currentMessage: "あなたと同じ",
        limit: 8,
        labelForId: function (resultId) {
          var item = AFIRE_TYPES[resultId];
          return item ? { label: decodeEntities(item.name), icon: decodeEntities(item.emoji) } : { label: resultId };
        }
      });
    }
    main.querySelector('[data-action="share"]').addEventListener("click",function(){shareResult(type);});
    main.querySelector('[data-action="save"]').addEventListener("click",function(){saveResultImage(type);});
    main.querySelector('[data-action="restart"]').addEventListener("click",function(){state.answers=[];state.questionIndex=0;state.resultKey=null;renderHome();});
  }
  function shareResult(type){
    var url=AFIRE_CONFIG.siteUrl||window.location.href;
    var text="私は「"+decodeEntities(type.name)+"」でした！ #動物FIRE診断";
    window.open("https://twitter.com/intent/tweet?text="+encodeURIComponent(text)+"&url="+encodeURIComponent(url),"_blank","noopener");
  }
  function saveResultImage(type){
    var canvas=document.createElement("canvas"),ctx=canvas.getContext("2d"),width=1200,height=760;
    canvas.width=width;canvas.height=height;ctx.fillStyle="#fff8ee";ctx.fillRect(0,0,width,height);ctx.fillStyle="#263d3a";ctx.textAlign="center";ctx.font="bold 42px sans-serif";ctx.fillText("動物FIRE診断",width/2,100);ctx.font="120px sans-serif";ctx.fillText(decodeEntities(type.emoji),width/2,285);ctx.fillStyle="#bb5027";ctx.font="bold 52px sans-serif";ctx.fillText(decodeEntities(type.name),width/2,400);ctx.fillStyle="#56666b";ctx.font="28px sans-serif";ctx.fillText(decodeEntities(type.catchphrase),width/2,470);ctx.font="22px sans-serif";ctx.fillText("12問でわかる、あなたのFIREスタイル",width/2,620);var link=document.createElement("a");link.download="animal-fire-result.png";link.href=canvas.toDataURL("image/png");link.click();
  }
  window.AnimalFireDiagnosis={config:AFIRE_CONFIG,types:AFIRE_TYPES,questions:AFIRE_QUESTIONS,calculateScores:calculateScores,calculateResult:calculateResult,renderHome:renderHome};
  window.afireCalculateResultForAnswers=calculateResult;
  window.afireRenderResult=function(key){renderResult(key);};
  window.afireSaveResultImage=saveResultImage;
  renderHome();
})();

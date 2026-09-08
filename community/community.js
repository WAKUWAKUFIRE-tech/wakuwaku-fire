// Expired cached content must not be presented as this week's activity, even offline.
for(const holder of document.querySelectorAll('[data-week-ends]')) if(Date.parse(holder.dataset.weekEnds)<Date.now()-7*86400000){holder.replaceChildren();const p=document.createElement('p');p.textContent='今週のお便りは準備中です。';holder.append(p);}
fetch('/data/community-weekly.json', {cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
 const week=Array.isArray(data.weeks)&&data.weeks.find(w=>new Date(`${w.endDate}T23:59:59+09:00`).getTime()>=Date.now()-7*86400000&&new Date(`${w.startDate}T00:00:00+09:00`).getTime()<=Date.now());
 for(const holder of document.querySelectorAll('[data-weekly-current]')){
  const compact=!!holder.closest('.community-teaser');holder.replaceChildren();
  const paragraph=document.createElement('p');
  if(!week){paragraph.textContent='今週のお便りは準備中です。';holder.append(paragraph);continue;}
  paragraph.className='community-note';paragraph.textContent=`${week.startDate.replaceAll('-','/')} 〜 ${week.endDate.replaceAll('-','/')}`;holder.append(paragraph);
  const list=document.createElement('ul');
  for(const item of week.items.slice(0,compact?3:5)){const li=document.createElement('li');if(compact)li.textContent=item.title;else{const h=document.createElement('h3');h.textContent=item.title;const p=document.createElement('p');p.textContent=item.body;li.append(h,p);}list.append(li);}holder.append(list);
 }
}).catch(()=>{/* Static, validated content remains available offline. */});
for(const el of document.querySelectorAll('[data-event-ends]')) if(Date.parse(el.dataset.eventEnds)<=Date.now()){el.replaceChildren();const p=document.createElement('p');p.textContent='次回の秘密基地開放DAYは準備中です。';el.append(p);}

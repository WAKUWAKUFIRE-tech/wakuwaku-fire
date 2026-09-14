import { getExpToNextLevel, loadState, recordReigniteVisit, saveState } from '../data/fire-life.js?v=12';

// RE:IGNITEへの訪問は、FIRE QUESTの「記事を読むEXP」と分けて日付単位で記録します。
try {
  const state = loadState();
  const reward = recordReigniteVisit(state);

  if (reward.isNewDay) {
    const savedState = saveState(state);
    const message = reward.levelUp
      ? `FIRE QUEST LEVEL UP！ Lv.${reward.level}（RE:IGNITE +5 EXP）`
      : `RE:IGNITEを再点火。FIRE QUESTに+5 EXP。次のLvまであと${getExpToNextLevel(savedState.totalExp)} EXP`;
    const notice = document.querySelector('#notice');

    if (notice) {
      notice.textContent = message;
      window.setTimeout(() => {
        if (notice.textContent === message) notice.textContent = '';
      }, 6000);
    }

    window.dispatchEvent(new CustomEvent('wakuwaku:fire-life-updated', {
      detail: { state: savedState, source: 'reignite' },
    }));
  }
} catch {
  // FIRE QUESTの保存領域が使えない場合も、RE:IGNITE本体の利用は止めません。
}

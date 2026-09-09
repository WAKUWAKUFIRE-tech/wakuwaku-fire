import { activeRankings } from "./config/external-ranking.js";

const slot = document.querySelector('[data-ranking-support]');
if (slot) {
  const rankings = activeRankings();
  if (rankings.length) {
    const title = document.createElement('h2');
    title.textContent = '🔥 ワクワクFIREを応援する';
    const text = document.createElement('p');
    text.textContent = 'クリックでFIREランキングの応援になります。';
    slot.append(title, text);
    rankings.forEach(({name, url}) => {
      const link = document.createElement('a');
      link.className = 'growth-button';
      link.href = url;
      link.textContent = `${name}｜FIREランキングを見る`;
      slot.append(link);
    });
    slot.hidden = false;
  }
}
document.querySelector('[data-copy-article]')?.addEventListener('click', async () => {
  const url = document.querySelector('link[rel="canonical"]').href;
  const status = document.querySelector('[data-copy-status]');
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = 'リンクをコピーしました';
  } catch {
    status.textContent = '下のURLを選択してコピーしてください';
    const input = document.querySelector('[data-copy-fallback]');
    input.hidden = false;
    input.value = url;
    input.focus();
    input.select();
  }
});

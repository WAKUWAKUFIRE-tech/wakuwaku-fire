const WORLD_STAGE_THRESHOLDS = Object.freeze([0, 3, 5, 10, 20, 30, 50, 100]);
const DEFAULT_PEOPLE_IDS = new Set(['person-mother', 'person-father', 'person-friend', 'person-parent']);
const CELEBRATION_TYPES = Object.freeze(['fireworks', 'stars', 'embers', 'ring', 'shooting-star', 'particles']);
const CELEBRATION_MESSAGES = Object.freeze([
  '人生に、ひとつ楽しみが増えました。',
  '未来の予定が、ひとつ増えました。',
  'またひとつ、やりたいことを思い出しました。',
  '人生が、少しだけ明るくなりました。',
  '未来に火がひとつ灯りました。',
  'その「やりたい」を忘れないで。',
  '今日、未来がひとつ増えました。',
  'まだまだ人生は面白くできます。',
]);
const INTRO_KEY = 'wakuwaku.life-world-intro-seen';

export function getWorldStage(totalItems) {
  const total = Number.isFinite(Number(totalItems)) ? Math.max(0, Math.floor(Number(totalItems))) : 0;
  let stage = 0;
  WORLD_STAGE_THRESHOLDS.forEach((threshold, index) => { if (total >= threshold) stage = index; });
  return stage;
}

export function countWorldItems(state) {
  if (!state || typeof state !== 'object') return 0;
  const buckets = Array.isArray(state.bucketList) ? state.bucketList.length : 0;
  const events = Array.isArray(state.events) ? state.events.length : 0;
  const logs = Array.isArray(state.logs) ? state.logs.length : 0;
  const people = Array.isArray(state.people) ? state.people.filter(person => person && !DEFAULT_PEOPLE_IDS.has(person.id)).length : 0;
  return buckets + events + logs + people;
}

function reducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function setVar(node, key, value) {
  node.style.setProperty(key, value);
  return node;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function createLifeWorld(host) {
  const noop = { sync() {}, celebrate() {}, maybeShowIntro() {} };
  if (!host) return noop;
  const stars = host.querySelector('.life-world-stars');
  const city = host.querySelector('.life-world-city-lights');
  const particles = host.querySelector('.life-world-particles');
  const birds = host.querySelector('.life-world-birds');
  const balloons = host.querySelector('.life-world-balloons');
  const effects = host.querySelector('.life-world-effects');
  const toast = document.createElement('div');
  toast.className = 'life-world-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  document.body.append(toast);
  const intro = document.getElementById('life-world-intro');
  let currentStage = null;
  let stageTimer = 0;
  let toastTimer = 0;
  let effectTimer = 0;

  const buildLayers = () => {
    if (stars && !stars.children.length) {
      for (let i = 0; i < 64; i += 1) {
        const star = document.createElement('i');
        star.className = 'world-star';
        setVar(star, '--x', `${randomBetween(3, 97).toFixed(2)}%`);
        setVar(star, '--y', `${randomBetween(5, 62).toFixed(2)}%`);
        setVar(star, '--size', `${randomBetween(1, 3.2).toFixed(2)}px`);
        setVar(star, '--delay', `${randomBetween(-7, 0).toFixed(2)}s`);
        stars.append(star);
      }
    }
    if (city && !city.children.length) {
      for (let i = 0; i < 20; i += 1) {
        const light = document.createElement('i');
        light.className = 'world-city-light';
        setVar(light, '--x', `${(i * 5.15 + randomBetween(0, 3)).toFixed(2)}%`);
        setVar(light, '--y', `${randomBetween(56, 76).toFixed(2)}%`);
        setVar(light, '--delay', `${randomBetween(-5, 0).toFixed(2)}s`);
        city.append(light);
      }
    }
    if (particles && !particles.children.length) {
      for (let i = 0; i < 14; i += 1) {
        const particle = document.createElement('i');
        particle.className = 'world-particle';
        setVar(particle, '--x', `${randomBetween(8, 92).toFixed(2)}%`);
        setVar(particle, '--y', `${randomBetween(58, 88).toFixed(2)}%`);
        setVar(particle, '--delay', `${randomBetween(-8, 0).toFixed(2)}s`);
        setVar(particle, '--duration', `${randomBetween(7, 13).toFixed(2)}s`);
        particles.append(particle);
      }
    }
    if (birds && !birds.children.length) {
      for (let i = 0; i < 8; i += 1) {
        const bird = document.createElement('i');
        bird.className = 'world-bird';
        bird.textContent = '⌁';
        setVar(bird, '--x', `${randomBetween(8, 90).toFixed(2)}%`);
        setVar(bird, '--y', `${randomBetween(34, 62).toFixed(2)}%`);
        setVar(bird, '--delay', `${randomBetween(-12, 0).toFixed(2)}s`);
        birds.append(bird);
      }
    }
    if (balloons && !balloons.children.length) {
      for (let i = 0; i < 3; i += 1) {
        const balloon = document.createElement('i');
        balloon.className = 'world-balloon';
        setVar(balloon, '--x', `${[16, 51, 82][i]}%`);
        setVar(balloon, '--y', `${[31, 24, 38][i]}%`);
        setVar(balloon, '--delay', `${[-4, -8, -12][i]}s`);
        balloons.append(balloon);
      }
    }
  };
  buildLayers();

  const showToast = (message, duration = 1500) => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => { if (!toast.classList.contains('is-visible')) toast.hidden = true; }, 260);
    }, duration);
  };

  const clearEffect = () => {
    clearTimeout(effectTimer);
    if (effects) effects.replaceChildren();
  };

  const triggerStageTransition = () => {
    clearTimeout(stageTimer);
    host.classList.remove('is-stage-changing');
    if (reducedMotion()) return;
    requestAnimationFrame(() => host.classList.add('is-stage-changing'));
    stageTimer = window.setTimeout(() => host.classList.remove('is-stage-changing'), 1500);
  };

  const sync = (next, { animate = true } = {}) => {
    const total = countWorldItems(next), stage = getWorldStage(total);
    host.dataset.total = String(total);
    host.dataset.stage = String(stage);
    if (currentStage === null) currentStage = stage;
    else if (stage !== currentStage) { currentStage = stage; if (animate) triggerStageTransition(); }
  };

  const createCelebration = (type, anchor) => {
    if (!effects) return null;
    const effect = document.createElement('div');
    effect.className = `life-celebration life-celebration-${type}`;
    let x = 50, y = 56;
    if (anchor?.getBoundingClientRect) {
      const rect = anchor.getBoundingClientRect();
      if (rect.width || rect.height) { x = ((rect.left + rect.width / 2) / Math.max(1, window.innerWidth)) * 100; y = ((rect.top + rect.height / 2) / Math.max(1, window.innerHeight)) * 100; }
    }
    setVar(effect, '--celebration-x', `${Math.min(94, Math.max(6, x)).toFixed(2)}%`);
    setVar(effect, '--celebration-y', `${Math.min(84, Math.max(16, y)).toFixed(2)}%`);
    if (['stars', 'embers', 'particles'].includes(type)) {
      const count = type === 'embers' ? 8 : 7;
      for (let i = 0; i < count; i += 1) {
        const piece = document.createElement('i');
        piece.className = `celebration-piece celebration-piece-${i + 1}`;
        setVar(piece, '--angle', `${randomBetween(-160, -20).toFixed(1)}deg`);
        setVar(piece, '--distance', `${randomBetween(28, 78).toFixed(1)}px`);
        setVar(piece, '--delay', `${randomBetween(0, .18).toFixed(2)}s`);
        effect.append(piece);
      }
    }
    return effect;
  };

  const celebrate = ({ source = 'item', anchor = null } = {}) => {
    if (document.visibilityState !== 'visible') return;
    const message = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
    showToast(message);
    if (reducedMotion()) return;
    clearEffect();
    const type = CELEBRATION_TYPES[Math.floor(Math.random() * CELEBRATION_TYPES.length)];
    const effect = createCelebration(type, anchor);
    if (!effect) return;
    effect.dataset.source = source;
    effects.append(effect);
    effectTimer = window.setTimeout(clearEffect, 1400);
  };

  const maybeShowIntro = () => {
    if (!intro || intro.dataset.dismissed === 'true') return;
    let seen = false;
    try { seen = window.localStorage.getItem(INTRO_KEY) === '1'; } catch { /* Storage is optional. */ }
    if (seen) return;
    intro.hidden = false;
    const button = intro.querySelector('button');
    const dismiss = () => {
      intro.hidden = true;
      intro.dataset.dismissed = 'true';
      try { window.localStorage.setItem(INTRO_KEY, '1'); } catch { /* Storage is optional. */ }
    };
    button?.addEventListener('click', dismiss, { once: true });
  };

  const pauseWhenHidden = () => document.body.classList.toggle('life-world-paused', document.visibilityState !== 'visible');
  document.addEventListener('visibilitychange', pauseWhenHidden);
  pauseWhenHidden();
  return { sync, celebrate, maybeShowIntro };
}


const WORLD_STAGE_THRESHOLDS = Object.freeze([0, 3, 5, 10, 20, 30, 50, 100]);
const DEFAULT_PEOPLE_IDS = new Set(['person-mother', 'person-father', 'person-friend', 'person-parent']);
const COMMON_TYPES = Object.freeze(['celebration-burst', 'ember-ignition', 'golden-ascent']);
const RARE_TYPES = Object.freeze(['shooting-star-show', 'star-bloom']);
const SUPER_RARE_TYPES = Object.freeze(['grand-fireworks', 'combo']);
const CELEBRATION_MESSAGES = Object.freeze([
  '人生に、ひとつ楽しみが増えました。',
  '未来に火が、ひとつ灯った。',
  'またひとつ、ワクワクを思い出した。',
  'その「やりたい」、ちゃんと残しておこう。',
  'まだまだ人生は面白くなる。',
  '今日、未来が少し明るくなった。',
  'その願い、ちゃんと生きてる。',
  '次の楽しみが、増えました。',
]);
const STAGE_UP_MESSAGES = Object.freeze([
  '新しい景色が解放されました。',
  '世界に、またひとつ灯りが戻った。',
  '人生の火が、さらに大きくなった。',
  'RE:IGNITE STAGE UP',
]);
const INTRO_KEY = 'wakuwaku.life-world-intro-seen';
const GOLD = ['#ffe16e', '#ffd166', '#ffb347', '#fff7d1', '#e65b3b'];

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function drawStar(ctx, x, y, radius, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = rotation - Math.PI / 2 + i * Math.PI / 4;
    const length = i % 2 ? radius * .36 : radius;
    const px = x + Math.cos(angle) * length;
    const py = y + Math.sin(angle) * length;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function createLifeWorld(host) {
  const noop = { sync() {}, celebrate() {}, maybeShowIntro() {} };
  if (!host) return noop;
  const stars = host.querySelector('.life-world-stars');
  const city = host.querySelector('.life-world-city-lights');
  const particlesLayer = host.querySelector('.life-world-particles');
  const birds = host.querySelector('.life-world-birds');
  const balloons = host.querySelector('.life-world-balloons');
  const effects = host.querySelector('.life-world-effects');
  // The world stays behind the app, while temporary celebrations are portaled
  // above it so they cannot be hidden by the page stacking context.
  if (effects) {
    document.body.append(effects);
    effects.classList.add('is-portal');
    effects.setAttribute('aria-hidden', 'true');
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'life-world-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext?.('2d');
  let width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  let height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  let dpr = 1;
  let qualityScale = 1;
  let baseQualityScale = 1;
  let slowFrameStreak = 0;
  const resizeCanvas = () => {
    width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const compactViewport = width <= 700 || height <= 600;
    dpr = Math.min(compactViewport ? 1.25 : 1.5, Math.max(1, window.devicePixelRatio || 1));
    baseQualityScale = compactViewport ? .56 : (width * height > 1100000 ? .7 : .84);
    qualityScale = baseQualityScale;
    host.dataset.fxQuality = baseQualityScale < .76 ? 'light' : 'full';
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCanvas();

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
  let pendingStageUp = false;

  const particles = [];
  const rockets = [];
  const rings = [];
  const streaks = [];
  let raf = 0;
  let active = false;
  let startedAt = 0;
  let lastFrame = 0;
  let finishAt = 0;
  let origin = { x: width * .5, y: height * .52 };
  let effectType = '';
  let effectReduced = false;
  let effectHuge = false;

  const countForQuality = count => Math.max(1, Math.round(count * (effectReduced ? Math.min(.42, qualityScale) : qualityScale)));

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
    if (particlesLayer && !particlesLayer.children.length) {
      for (let i = 0; i < 14; i += 1) {
        const particle = document.createElement('i');
        particle.className = 'world-particle';
        setVar(particle, '--x', `${randomBetween(8, 92).toFixed(2)}%`);
        setVar(particle, '--y', `${randomBetween(58, 88).toFixed(2)}%`);
        setVar(particle, '--delay', `${randomBetween(-8, 0).toFixed(2)}s`);
        setVar(particle, '--duration', `${randomBetween(7, 13).toFixed(2)}s`);
        particlesLayer.append(particle);
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

  const showToast = (message, duration = 2200, stageUp = false, rarity = 'common') => {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.dataset.rarity = rarity;
    toast.classList.toggle('is-stage-up', stageUp);
    toast.classList.remove('is-visible');
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => { if (!toast.classList.contains('is-visible')) toast.hidden = true; }, 320);
    }, duration);
  };

  const clearEffect = () => {
    clearTimeout(effectTimer);
    if (effects) effects.replaceChildren();
    particles.length = 0; rockets.length = 0; rings.length = 0; streaks.length = 0;
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, width, height); }
    host.classList.remove('is-celebrating', 'is-stage-up');
  };

  const triggerStageTransition = () => {
    clearTimeout(stageTimer);
    host.classList.remove('is-stage-changing');
    if (reducedMotion()) return;
    requestAnimationFrame(() => host.classList.add('is-stage-changing'));
    stageTimer = window.setTimeout(() => host.classList.remove('is-stage-changing'), 1800);
  };

  const sync = (next, { animate = true } = {}) => {
    const total = countWorldItems(next), stage = getWorldStage(total);
    host.dataset.total = String(total);
    host.dataset.stage = String(stage);
    if (currentStage === null) currentStage = stage;
    else if (stage !== currentStage) {
      const rose = stage > currentStage;
      currentStage = stage;
      if (animate && rose) { pendingStageUp = true; triggerStageTransition(); }
    }
  };

  const pointFromAnchor = (anchor) => {
    let x = width * .5, y = height * .52;
    if (anchor?.getBoundingClientRect) {
      const rect = anchor.getBoundingClientRect();
      if (rect.width || rect.height) { x = rect.left + rect.width / 2; y = rect.top + rect.height / 2; }
    }
    return { x: clamp(x, 28, Math.max(28, width - 28)), y: clamp(y, 56, Math.max(56, height - 72)) };
  };

  const addParticle = (options = {}) => {
    const size = Number.isFinite(options.size) ? options.size : randomBetween(1.2, 3.8);
    const life = Number.isFinite(options.life) ? options.life : randomBetween(.8, 1.45);
    particles.push({
      x: options.x ?? origin.x, y: options.y ?? origin.y, px: options.x ?? origin.x, py: options.y ?? origin.y,
      vx: options.vx || 0, vy: options.vy || 0, gravity: options.gravity ?? 50, drag: options.drag ?? .985,
      age: -(options.delay || 0), life, size, color: options.color || pick(GOLD), shape: options.shape || 'dot',
      trail: options.trail || 0, wobble: options.wobble || 0, phase: randomBetween(0, Math.PI * 2), rotation: options.rotation || 0,
      glow: options.glow ?? Math.max(8, size * 4), twinkle: options.twinkle !== false,
    });
  };

  const addRadialParticles = (count, speedMin, speedMax, options = {}) => {
    const scaledCount = countForQuality(count);
    for (let i = 0; i < scaledCount; i += 1) {
      const angle = (Math.PI * 2 * i / scaledCount) + randomBetween(-.055, .055);
      const speed = randomBetween(speedMin, speedMax) * (effectReduced ? .42 : 1);
      addParticle({
        x: options.x ?? origin.x, y: options.y ?? origin.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: options.gravity ?? 48, drag: options.drag ?? .985,
        delay: randomBetween(0, options.delayMax ?? .16), life: randomBetween(options.lifeMin ?? 1.05, options.lifeMax ?? 1.7),
        size: randomBetween(options.sizeMin ?? 1.2, options.sizeMax ?? 4.4), color: pick(options.colors || GOLD),
        shape: options.shape || (Math.random() < .25 ? 'star' : 'dot'), trail: options.trail ?? 10, twinkle: true,
      });
    }
  };

  const addRing = (x, y, color = '#ffe16e', life = .95, size = 24) => rings.push({ x, y, age: 0, life, size, color });

  const explodeFirework = (x, y, huge = false) => {
    const scale = huge ? 1.35 : 1.16;
    addRing(x, y, '#ffe16e', huge ? 1.4 : 1.18, 54 * scale);
    addRing(x, y, '#e65b3b', huge ? 1.65 : 1.32, 28 * scale);
    addRing(x, y, '#fff7d1', huge ? 1.05 : .92, 9 * scale);
    const mainCount = effectReduced ? 18 : huge ? 108 : 76;
    addRadialParticles(mainCount, 105 * scale, 318 * scale, { x, y, gravity: 92, lifeMin: 1.12, lifeMax: huge ? 2.15 : 1.78, sizeMin: 2.2, sizeMax: huge ? 8.6 : 6.8, trail: 25, colors: ['#ffe16e', '#ffd166', '#ffb347', '#fff7d1', '#e65b3b'] });
    const microCount = effectReduced ? 8 : huge ? 56 : 34;
    addRadialParticles(microCount, 42 * scale, 176 * scale, { x, y, gravity: 118, delayMax: .48, lifeMin: .92, lifeMax: 1.72, sizeMin: 1.1, sizeMax: huge ? 3.8 : 3.2, trail: 12, colors: ['#fff7d1', '#ffe16e', '#ffb347'] });
  };

  const startGrandFireworks = (huge = false) => {
    const targetX = clamp(origin.x + randomBetween(-width * .14, width * .14), width * .18, width * .82);
    const targetY = clamp(origin.y - randomBetween(150, 270), 94, height * .48);
    rockets.push({ x: origin.x, y: Math.min(height - 84, origin.y + 72), px: origin.x, py: Math.min(height - 84, origin.y + 72), tx: targetX, ty: targetY, age: 0, delay: 0, life: effectReduced ? .38 : .58, color: '#ffe16e', huge });
    if (huge && !effectReduced) {
      const secondX = clamp(targetX + randomBetween(-width * .22, width * .22), width * .16, width * .84);
      rockets.push({ x: origin.x + randomBetween(-24, 24), y: Math.min(height - 84, origin.y + 78), px: origin.x, py: Math.min(height - 84, origin.y + 78), tx: secondX, ty: clamp(targetY + randomBetween(-32, 64), 105, height * .5), age: -.16, delay: .16, life: .62, color: '#ffb347', huge: false });
    }
  };

  const startCelebrationBurst = () => {
    addRing(origin.x, origin.y, '#ffe16e', 1.26, 44);
    addRing(origin.x, origin.y, '#e65b3b', 1.08, 24);
    addRing(origin.x, origin.y, '#fff7d1', .82, 8);
    addRadialParticles(effectReduced ? 14 : 62, 104, 304, { gravity: 34, lifeMin: .92, lifeMax: 1.62, sizeMin: 2.2, sizeMax: 7.2, trail: 23, colors: ['#ffe16e', '#ffd166', '#ffb347', '#fff7d1', '#e65b3b'] });
    addRadialParticles(effectReduced ? 5 : 26, 36, 126, { delayMax: .36, gravity: 26, lifeMin: 1.02, lifeMax: 1.58, sizeMin: 1.1, sizeMax: 3.4, trail: 10, colors: ['#fff7d1', '#ffe16e'] });
  };

  const startEmberIgnition = () => {
    addRing(origin.x, origin.y, '#e65b3b', .94, 32);
    addRing(origin.x, origin.y, '#ffe16e', .72, 12);
    const count = countForQuality(effectReduced ? 10 : 52);
    for (let i = 0; i < count; i += 1) {
      addParticle({ x: origin.x + randomBetween(-18, 18), y: origin.y + randomBetween(-8, 12), vx: randomBetween(-168, 168), vy: -randomBetween(110, 340), gravity: randomBetween(70, 155), drag: .985, delay: randomBetween(0, .28), life: randomBetween(.92, 1.65), size: randomBetween(2.5, 7), color: pick(['#e65b3b', '#ff8d3a', '#ffd166', '#ffe16e']), shape: 'ember', trail: 24, wobble: 30 });
    }
    if (!effectReduced) addRadialParticles(24, 24, 112, { gravity: 55, delayMax: .42, lifeMin: .75, lifeMax: 1.3, sizeMin: 1.1, sizeMax: 3.1, trail: 10, colors: ['#ffe16e', '#ffb347'] });
  };

  const startGoldenAscent = () => {
    addRing(origin.x, origin.y, '#ffe16e', .94, 28);
    addRing(origin.x, origin.y, '#fff7d1', .66, 9);
    const count = countForQuality(effectReduced ? 12 : 58);
    for (let i = 0; i < count; i += 1) {
      addParticle({ x: origin.x + randomBetween(-30, 30), y: origin.y + randomBetween(-8, 16), vx: randomBetween(-100, 100), vy: -randomBetween(92, 260), gravity: randomBetween(18, 58), drag: .99, delay: randomBetween(0, .26), life: randomBetween(1.08, 1.82), size: randomBetween(2, 6.5), color: pick(['#ffe16e', '#ffd166', '#fff7d1', '#ffb347']), shape: Math.random() < .3 ? 'star' : 'dot', trail: 18, wobble: randomBetween(14, 38) });
    }
  };

  const startStarBloom = () => {
    addRing(origin.x, origin.y, '#ffe16e', 1.3, 46);
    addRing(origin.x, origin.y, '#fff7d1', 1.42, 20);
    addRing(origin.x, origin.y, '#e65b3b', .96, 9);
    const count = countForQuality(effectReduced ? 12 : 44);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count + randomBetween(-.12, .12);
      const speed = randomBetween(38, 164) * (effectReduced ? .45 : 1);
      addParticle({ x: origin.x, y: origin.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 8, drag: .987, delay: randomBetween(0, .3), life: randomBetween(1.1, 1.86), size: randomBetween(3, 8), color: pick(['#fff7d1', '#ffe16e', '#ffd166']), shape: 'star', trail: 10, twinkle: true, rotation: angle });
    }
  };

  const startShootingStarShow = () => {
    const count = effectReduced ? 1 : (Math.random() < .35 ? 3 : 2);
    for (let i = 0; i < count; i += 1) {
      const startX = randomBetween(-width * .08, width * .65);
      const startY = randomBetween(height * .08, height * .34) + i * 24;
      streaks.push({ x: startX, y: startY, px: startX, py: startY, vx: randomBetween(390, 610), vy: randomBetween(170, 300), age: -i * .16, life: randomBetween(1.05, 1.48), color: i % 2 ? '#ffe16e' : '#fff7d1', trail: randomBetween(145, 230), done: false });
    }
    if (!effectReduced) startStarBloom();
  };

  const frame = (now) => {
    if (!active || !ctx) return;
    const rawDt = ((now - lastFrame) || 16) / 1000;
    if (rawDt > .032) slowFrameStreak += 1; else slowFrameStreak = Math.max(0, slowFrameStreak - 1);
    if (slowFrameStreak >= 3) qualityScale = Math.max(.48, qualityScale * .82);
    const nextQuality = qualityScale < .76 ? 'light' : 'full';
    if (host.dataset.fxQuality !== nextQuality) host.dataset.fxQuality = nextQuality;
    const dt = Math.min(.034, Math.max(.008, rawDt));
    lastFrame = now;
    const elapsed = (now - startedAt) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = qualityScale >= .78 && !effectReduced ? 'lighter' : 'source-over';
    const glowEnabled = qualityScale >= .76 && !effectReduced;

    const flashT = clamp(elapsed / (effectHuge ? .72 : .58), 0, 1);
    const flash = Math.sin(flashT * Math.PI) * (effectHuge ? .3 : .2);
    if (flash > 0 && qualityScale >= .62) { ctx.fillStyle = `rgba(255, 180, 74, ${flash * (qualityScale < .76 ? .72 : 1)})`; ctx.fillRect(0, 0, width, height); }
    if (elapsed < 1.45 && qualityScale >= .72) {
      const glow = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, Math.max(width, height) * .68);
      glow.addColorStop(0, `rgba(255, 239, 164, ${Math.max(0, (effectHuge ? .42 : .3) * (1 - elapsed / 1.45))})`); glow.addColorStop(.28, `rgba(255, 181, 66, ${Math.max(0, (effectHuge ? .22 : .14) * (1 - elapsed / 1.45))})`); glow.addColorStop(1, 'rgba(255, 174, 69, 0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    }

    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const rocket = rockets[i]; rocket.age += dt; if (rocket.age < rocket.delay) continue;
      const t = clamp((rocket.age - rocket.delay) / rocket.life, 0, 1); rocket.px = rocket.x; rocket.py = rocket.y;
      const eased = 1 - Math.pow(1 - t, 2.5); rocket.x = rocket.x + (rocket.tx - rocket.x) * eased; rocket.y = rocket.y + (rocket.ty - rocket.y) * eased;
      ctx.save(); ctx.globalAlpha = .98; ctx.strokeStyle = rocket.color; ctx.shadowColor = '#ffb347'; ctx.shadowBlur = glowEnabled ? (effectHuge ? 26 : 18) : 0; ctx.lineWidth = effectHuge ? 7 : 5;
      ctx.beginPath(); ctx.moveTo(rocket.px, rocket.py); ctx.lineTo(rocket.x, rocket.y); ctx.stroke(); ctx.fillStyle = '#fff7d1'; ctx.beginPath(); ctx.arc(rocket.x, rocket.y, effectHuge ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (t >= 1) { explodeFirework(rocket.tx, rocket.ty, rocket.huge); rockets.splice(i, 1); }
    }

    for (let i = streaks.length - 1; i >= 0; i -= 1) {
      const streak = streaks[i]; streak.age += dt; if (streak.age < 0) continue;
      const t = clamp(streak.age / streak.life, 0, 1); streak.px = streak.x; streak.py = streak.y; streak.x += streak.vx * dt; streak.y += streak.vy * dt;
      ctx.save(); ctx.globalAlpha = Math.sin(Math.min(1, t) * Math.PI) * .96;
      const gradient = ctx.createLinearGradient(streak.x - streak.trail, streak.y - streak.trail * .46, streak.x, streak.y); gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(.55, streak.color); gradient.addColorStop(1, '#fff7d1');
      ctx.strokeStyle = gradient; ctx.lineWidth = effectHuge ? 8 : 5; ctx.shadowColor = streak.color; ctx.shadowBlur = glowEnabled ? 22 : 0; ctx.beginPath(); ctx.moveTo(streak.x - streak.trail, streak.y - streak.trail * .46); ctx.lineTo(streak.x, streak.y); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff7d1'; ctx.shadowBlur = glowEnabled ? 16 : 0; ctx.beginPath(); ctx.arc(streak.x, streak.y, effectHuge ? 8 : 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      if (t >= 1) { for (let j = 0; j < (effectReduced ? 2 : 7); j += 1) addParticle({ x: streak.x, y: streak.y, vx: randomBetween(-30, 30), vy: randomBetween(-38, 38), gravity: 14, delay: randomBetween(0, .12), life: randomBetween(.5, .9), size: randomBetween(1, 2.8), color: streak.color, shape: 'star', trail: 4 }); streaks.splice(i, 1); }
    }

    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i]; ring.age += dt; const t = clamp(ring.age / ring.life, 0, 1);
      ctx.save(); ctx.globalAlpha = Math.sin((1 - t) * Math.PI) * .95; ctx.strokeStyle = ring.color; ctx.shadowColor = ring.color; ctx.shadowBlur = glowEnabled ? (effectHuge ? 32 : 20) : 0; ctx.lineWidth = effectHuge ? 8 : 5; ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.size + t * (effectHuge ? 340 : 280), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (t >= 1) rings.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]; p.age += dt; if (p.age < 0) continue; const t = p.age / p.life;
      if (t >= 1) { particles.splice(i, 1); continue; }
      p.px = p.x; p.py = p.y; p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.wobble) p.x += Math.sin(p.age * 6 + p.phase) * p.wobble * dt;
      const fade = t < .13 ? t / .13 : Math.pow(1 - t, .72); const twinkle = p.twinkle ? .68 + .32 * (0.5 + 0.5 * Math.sin(p.age * 18 + p.phase)) : 1;
      ctx.save(); ctx.globalAlpha = clamp(fade * twinkle, 0, 1);
      if (p.trail) { ctx.strokeStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = glowEnabled ? Math.min(14, p.glow) : 0; ctx.globalAlpha *= .38; ctx.lineWidth = Math.max(1, p.size * .65); ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.globalAlpha = clamp(fade * twinkle, 0, 1); }
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = glowEnabled && p.size >= 3.8 ? Math.min(18, p.glow * 1.25) : 0;
      if (p.shape === 'star') drawStar(ctx, p.x, p.y, p.size * (1 + .22 * Math.sin(p.age * 9 + p.phase)), p.rotation + p.age * .4);
      else if (p.shape === 'ember') { ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, 0, p.size * .55, p.size * 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
      if (p.size >= 4) { ctx.globalAlpha = clamp(fade * .62, 0, 1); ctx.fillStyle = '#fff7d1'; ctx.shadowColor = '#fff7d1'; ctx.shadowBlur = glowEnabled ? 12 : 0; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.1, p.size * .28), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    if (elapsed >= finishAt && !particles.length && !rockets.length && !rings.length && !streaks.length) { clearEffect(); return; }
    raf = requestAnimationFrame(frame);
  };

  const startCanvasCelebration = (type, anchor, { huge = false } = {}) => {
    if (!ctx) return false;
    clearEffect(); effectType = type; effectHuge = huge; effectReduced = reducedMotion(); slowFrameStreak = 0; qualityScale = baseQualityScale; origin = pointFromAnchor(anchor);
    startedAt = performance.now(); lastFrame = startedAt; finishAt = effectReduced ? 1.1 : huge ? 2.8 : 1.8; active = true;
    host.classList.add('is-celebrating'); if (huge) host.classList.add('is-stage-up');
    if (type === 'grand-fireworks') startGrandFireworks(huge);
    else if (type === 'combo') { startGrandFireworks(true); startShootingStarShow(); }
    else if (type === 'celebration-burst') startCelebrationBurst();
    else if (type === 'ember-ignition') startEmberIgnition();
    else if (type === 'golden-ascent') startGoldenAscent();
    else if (type === 'star-bloom') startStarBloom();
    else if (type === 'shooting-star-show') startShootingStarShow();
    raf = requestAnimationFrame(frame); effectTimer = window.setTimeout(clearEffect, Math.round((finishAt + .25) * 1000));
    return true;
  };

  // CSS fallback for browsers without a 2D canvas context.
  const createFallbackCelebration = (type, anchor) => {
    if (!effects) return null;
    const fallback = type === 'grand-fireworks' || type === 'combo' ? 'fireworks' : type === 'shooting-star-show' ? 'shooting-star' : type === 'star-bloom' ? 'stars' : type === 'ember-ignition' ? 'embers' : type === 'golden-ascent' ? 'particles' : 'ring';
    const effect = document.createElement('div'); effect.className = `life-celebration life-celebration-${fallback}`;
    let x = 50, y = 56;
    if (anchor?.getBoundingClientRect) { const rect = anchor.getBoundingClientRect(); if (rect.width || rect.height) { x = ((rect.left + rect.width / 2) / Math.max(1, width)) * 100; y = ((rect.top + rect.height / 2) / Math.max(1, height)) * 100; } }
    setVar(effect, '--celebration-x', `${clamp(x, 6, 94).toFixed(2)}%`); setVar(effect, '--celebration-y', `${clamp(y, 16, 84).toFixed(2)}%`);
    const count = fallback === 'embers' ? 24 : fallback === 'fireworks' ? 42 : 20;
    if (['stars', 'embers', 'particles'].includes(fallback)) for (let i = 0; i < count; i += 1) { const piece = document.createElement('i'); piece.className = `celebration-piece celebration-piece-${i + 1}`; setVar(piece, '--angle', `${randomBetween(-170, -10).toFixed(1)}deg`); setVar(piece, '--distance', `${randomBetween(34, 150).toFixed(1)}px`); setVar(piece, '--delay', `${randomBetween(0, .3).toFixed(2)}s`); effect.append(piece); }
    return effect;
  };

  const chooseType = (intensity = 'normal', stageUp = false) => {
    if (stageUp || intensity === 'huge') return pick(Math.random() < .72 ? ['grand-fireworks'] : SUPER_RARE_TYPES);
    const roll = Math.random();
    if (roll < .70) return pick(COMMON_TYPES);
    if (roll < .95) return pick(RARE_TYPES);
    return pick(SUPER_RARE_TYPES);
  };

  const celebrate = ({ source = 'item', anchor = null, intensity = 'normal' } = {}) => {
    if (document.visibilityState !== 'visible') return;
    const stageUp = pendingStageUp; pendingStageUp = false;
    const rarity = stageUp || intensity === 'huge' ? 'super-rare' : 'common';
    const message = stageUp ? pick(STAGE_UP_MESSAGES) : pick(CELEBRATION_MESSAGES);
    showToast(message, stageUp ? 3000 : 2400, stageUp, rarity);
    const type = chooseType(intensity, stageUp);
    if (startCanvasCelebration(type, anchor, { huge: stageUp || intensity === 'huge' })) return;
    clearEffect();
    const fallback = createFallbackCelebration(type, anchor);
    if (!fallback) return;
    fallback.dataset.source = source; effects.append(fallback);
    effectTimer = window.setTimeout(clearEffect, stageUp ? 2700 : 2200);
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

  const pauseWhenHidden = () => {
    const paused = document.visibilityState !== 'visible';
    document.body.classList.toggle('life-world-paused', paused);
    if (paused) clearEffect();
  };
  document.addEventListener('visibilitychange', pauseWhenHidden);
  window.addEventListener('resize', resizeCanvas, { passive: true });
  pauseWhenHidden();
  return { sync, celebrate, maybeShowIntro };
}

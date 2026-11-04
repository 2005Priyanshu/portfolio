/* =====================================================================
   PRIYANSHU SINGH — PORTFOLIO
   Starfield · pixel hero · scroll HUD · typewriter · 8-bit audio engine
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     PIXEL SPRITES  (16x16, palette-indexed)
     . = transparent  k = outline  s = skin  h = hair  t = shirt
     p = pants  b = boots  e = eye  a = accent
  ------------------------------------------------------------------ */
  const PAL = {
    k: '#0b0d17', s: '#f1c9a5', h: '#2b1d1a', t: '#7cf5c2', p: '#2d3561',
    b: '#1a1230', e: '#0b0d17', a: '#f2c14e', w: '#ffffff', g: '#ff6b9d'
  };

  const IDLE = [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhsssshh....',
    '....ssssssss....',
    '....sesssses....',
    '....ssssssss....',
    '.....ssssss.....',
    '....ttttttt.....',
    '...sttttttts....',
    '...stttatttts...',
    '...sttttttts....',
    '....ttttttt.....',
    '....ppp.ppp.....',
    '....ppp.ppp.....',
    '....bbb.bbb.....',
    '...bbbb.bbbb....'
  ];
  const WALK1 = [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhsssshh....',
    '....ssssssss....',
    '....sesssses....',
    '....ssssssss....',
    '.....ssssss.....',
    '....ttttttt.....',
    '...sttttttts....',
    '..s.tttatttt.s..',
    '....ttttttt.....',
    '....ttttttt.....',
    '...ppp...ppp....',
    '..ppp.....ppp...',
    '..bbb.....bbb...',
    '.bbbb.....bbbb..'
  ];
  const WALK2 = [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhsssshh....',
    '....ssssssss....',
    '....sesssses....',
    '....ssssssss....',
    '.....ssssss.....',
    '....ttttttt.....',
    '....tttttttts...',
    '...stttatttt....',
    '....ttttttt.....',
    '....ttttttt.....',
    '.....ppppp......',
    '.....ppppp......',
    '.....bbbbb......',
    '....bbbbbbb.....'
  ];
  // Alt portrait: same hero, with a headset + different shirt (designer mode)
  const PORTRAIT_ALT = IDLE.map((row, y) =>
    row.replace(/t/g, 'g').split('').map((c, x) => (y === 3 && (x === 3 || x === 12)) ? 'a' : c).join('')
  );

  function drawSprite(canvas, frame, flip = false) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 16, 16);
    ctx.save();
    if (flip) { ctx.translate(16, 0); ctx.scale(-1, 1); }
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = frame[y][x];
        if (c === '.') continue;
        ctx.fillStyle = PAL[c] || PAL.k;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  drawSprite($('#introSprite'), IDLE);
  drawSprite($('#portraitSprite'), IDLE);
  drawSprite($('#portraitSprite2'), PORTRAIT_ALT);

  /* ------------------------------------------------------------------
     STARFIELD (parallax, pixel stars)
  ------------------------------------------------------------------ */
  const starCanvas = $('#stars');
  const sctx = starCanvas.getContext('2d');
  let stars = [], W = 0, H = 0, dpr = 1;
  function resizeStars() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    starCanvas.width = W * dpr; starCanvas.height = H * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.floor((W * H) / 9000);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: Math.random() * 0.8 + 0.2,  // depth → parallax + brightness
      s: Math.random() < 0.12 ? 3 : 2,
      tw: Math.random() * Math.PI * 2,
      c: Math.random() < 0.08 ? '#f2c14e' : Math.random() < 0.08 ? '#7cf5c2' : '#ffffff'
    }));
  }
  let lastY = 0, scrollVel = 0;
  function renderStars(t) {
    sctx.clearRect(0, 0, W, H);
    const sy = scrollY;
    for (const st of stars) {
      const y = ((st.y - sy * st.z * 0.25) % H + H) % H;
      const a = 0.25 + st.z * 0.6 * (0.7 + 0.3 * Math.sin(t / 900 + st.tw));
      sctx.globalAlpha = a;
      sctx.fillStyle = st.c;
      sctx.fillRect(Math.round(st.x), Math.round(y), st.s, st.s);
    }
    sctx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(renderStars);
  }
  resizeStars(); addEventListener('resize', resizeStars);
  requestAnimationFrame(renderStars);

  /* ------------------------------------------------------------------
     8-BIT AUDIO ENGINE (Web Audio, procedurally sequenced)
     Each mood = {bpm, wave, bass[], lead[], pad[]}; -1 = rest.
     Notes are MIDI numbers. Switches happen on the next bar.
  ------------------------------------------------------------------ */
  const MOODS = {
    calm: {
      bpm: 92, wave: 'triangle', leadWave: 'square',
      bass: [45, -1, 45, -1, 50, -1, 50, -1, 52, -1, 52, -1, 48, -1, 48, -1],
      lead: [69, -1, 72, 76, -1, 72, -1, 69, 74, -1, 76, -1, 72, -1, -1, -1],
      pad: [57, 62],
      lead2: [-1, 64, -1, -1, 67, -1, 64, -1, -1, 62, -1, 67, -1, 64, -1, -1]
    },
    explore: {
      bpm: 112, wave: 'square', leadWave: 'square',
      bass: [43, 43, 50, 43, 46, 46, 53, 46, 48, 48, 55, 48, 46, 46, 53, 46],
      lead: [67, -1, 70, 72, -1, 74, -1, 72, 70, -1, 67, -1, 65, 67, -1, -1],
      pad: [55, 62],
      lead2: [-1, -1, 79, -1, -1, 77, -1, -1, -1, 79, -1, -1, 74, -1, 72, -1]
    },
    adventure: {
      bpm: 128, wave: 'square', leadWave: 'square',
      bass: [40, 40, 47, 40, 45, 45, 52, 45, 43, 43, 50, 43, 47, 47, 54, 47],
      lead: [64, 67, 71, -1, 69, -1, 67, -1, 71, 74, -1, 76, -1, 74, 71, -1],
      pad: [52, 59],
      lead2: [-1, -1, -1, 76, -1, 74, -1, -1, 79, -1, 78, -1, 76, -1, -1, -1]
    },
    build: {
      bpm: 120, wave: 'sawtooth', leadWave: 'square',
      bass: [38, -1, 38, 45, -1, 38, 41, -1, 43, -1, 43, 50, -1, 43, 41, -1],
      lead: [62, -1, 65, -1, 69, -1, 65, -1, 67, -1, 70, -1, 74, -1, 70, -1],
      pad: [50, 57],
      lead2: [-1, 74, -1, 72, -1, -1, 77, -1, -1, 74, -1, 72, -1, -1, 70, -1]
    },
    dream: {
      bpm: 84, wave: 'triangle', leadWave: 'triangle',
      bass: [41, -1, -1, -1, 48, -1, -1, -1, 46, -1, -1, -1, 43, -1, -1, -1],
      lead: [65, -1, 72, -1, 77, -1, 72, -1, 70, -1, 74, -1, 72, -1, 67, -1],
      pad: [53, 60],
      lead2: [-1, 77, -1, 79, -1, 84, -1, 79, -1, 77, -1, 74, -1, 72, -1, -1]
    },
    warm: {
      bpm: 96, wave: 'triangle', leadWave: 'square',
      bass: [45, -1, 52, -1, 50, -1, 57, -1, 47, -1, 54, -1, 52, -1, 59, -1],
      lead: [69, 72, 76, -1, 74, -1, 72, -1, 71, 74, 78, -1, 76, -1, 74, -1],
      pad: [57, 64],
      lead2: [-1, -1, -1, 81, -1, 79, -1, -1, -1, -1, -1, 83, -1, 81, -1, -1]
    }
  };

  const Audio8 = {
    ctx: null, master: null, music: null, sfx: null, pad: [], padGain: null,
    on: false, mood: 'calm', nextMood: 'calm', step: 0, nextTime: 0, timer: null,
    midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0;
      // gentle low-pass + soft compression keep the squares from being harsh
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      this.master.connect(lp).connect(comp).connect(this.ctx.destination);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.55; this.music.connect(this.master);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.5; this.sfx.connect(this.master);
      this.padGain = this.ctx.createGain(); this.padGain.gain.value = 0.045; this.padGain.connect(this.music);
      this.startPad();
    },
    startPad() {
      const m = MOODS[this.mood];
      this.pad.forEach(o => { try { o.stop(); } catch (e) {} });
      this.pad = m.pad.map((n, i) => {
        const o = this.ctx.createOscillator(); o.type = 'triangle';
        o.frequency.value = this.midi(n); o.detune.value = i ? 6 : -6;
        o.connect(this.padGain); o.start(); return o;
      });
    },
    retunePad() {
      const m = MOODS[this.mood]; const t = this.ctx.currentTime;
      this.pad.forEach((o, i) => o.frequency.setTargetAtTime(this.midi(m.pad[i]), t, 0.6));
    },
    tone({ freq, wave = 'square', t, dur = 0.12, vol = 0.18, dest, slide = 0, attack = 0.005 }) {
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = wave; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(dest || this.music);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(t, dur = 0.05, vol = 0.08) {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = this.ctx.createBufferSource(); s.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      s.connect(hp).connect(g).connect(this.music); s.start(t);
    },
    scheduleStep(t) {
      const m = MOODS[this.mood];
      const i = this.step % 16;
      const sixteenth = 60 / m.bpm / 4;
      // bass
      if (m.bass[i] >= 0) this.tone({ freq: this.midi(m.bass[i]), wave: m.wave, t, dur: sixteenth * 1.6, vol: 0.16 });
      // lead
      if (m.lead[i] >= 0) this.tone({ freq: this.midi(m.lead[i]), wave: m.leadWave, t, dur: sixteenth * 1.8, vol: 0.085 });
      // counter-melody (echo, quieter)
      if (m.lead2[i] >= 0) this.tone({ freq: this.midi(m.lead2[i]), wave: 'square', t: t + sixteenth * 0.5, dur: sixteenth * 1.4, vol: 0.045 });
      // drums: kick on 0/8, hat on odd steps, snare on 4/12 (not in dream/calm)
      if (i % 8 === 0) this.tone({ freq: 120, wave: 'sine', t, dur: 0.1, vol: 0.22, slide: -80 });
      if (i % 2 === 1) this.noise(t, 0.025, 0.035);
      if ((i === 4 || i === 12) && !['dream', 'calm'].includes(this.mood)) this.noise(t, 0.08, 0.09);
    },
    tick() {
      if (!this.on) return;
      const m = MOODS[this.mood];
      const sixteenth = 60 / m.bpm / 4;
      while (this.nextTime < this.ctx.currentTime + 0.15) {
        if (this.step % 16 === 0 && this.nextMood !== this.mood) {
          this.mood = this.nextMood; this.retunePad();
        }
        this.scheduleStep(this.nextTime);
        this.nextTime += sixteenth;
        this.step++;
      }
    },
    start() {
      this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.on = true;
      this.nextTime = this.ctx.currentTime + 0.05; this.step = 0;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6);
      clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 40);
    },
    stop() {
      if (!this.ctx) return;
      this.on = false; clearInterval(this.timer);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    },
    setMood(m) { if (MOODS[m]) this.nextMood = m; },
    // UI SFX
    blip() { if (!this.on) return; const t = this.ctx.currentTime; this.tone({ freq: 880, wave: 'square', t, dur: 0.05, vol: 0.06, dest: this.sfx }); },
    select() { if (!this.on) return; const t = this.ctx.currentTime; this.tone({ freq: 660, wave: 'square', t, dur: 0.06, vol: 0.09, dest: this.sfx }); this.tone({ freq: 990, wave: 'square', t: t + 0.06, dur: 0.1, vol: 0.09, dest: this.sfx }); },
    levelUp() { if (!this.on) return; const t = this.ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, wave: 'square', t: t + i * 0.07, dur: 0.14, vol: 0.08, dest: this.sfx })); }
  };

  /* ------------------------------------------------------------------
     INTRO / START
  ------------------------------------------------------------------ */
  const body = document.body; body.classList.add('locked');
  const intro = $('#intro'); const soundBtn = $('#soundBtn');

  function setSoundUI(on) {
    soundBtn.setAttribute('aria-pressed', String(on));
    $('.sound__text', soundBtn).textContent = on ? 'SOUND ON' : 'SOUND OFF';
  }
  function begin(withSound) {
    if (withSound) { Audio8.start(); Audio8.select(); setSoundUI(true); }
    intro.classList.add('hide');
    body.classList.remove('locked'); body.classList.add('started');
    setTimeout(() => { intro.remove(); }, 800);
    startTypewriters();
  }
  $('#startBtn').addEventListener('click', () => begin(true));
  $('#startMuteBtn').addEventListener('click', () => begin(false));
  addEventListener('keydown', e => { if (e.key === 'Enter' && document.contains(intro)) begin(true); }, { once: true });

  soundBtn.addEventListener('click', () => {
    if (Audio8.on) { Audio8.stop(); setSoundUI(false); }
    else { Audio8.start(); Audio8.select(); setSoundUI(true); }
  });

  // UI sfx hooks
  $$('a, button, .slots li').forEach(el => {
    el.addEventListener('mouseenter', () => Audio8.blip());
  });
  $$('a.btn, .hud__nav a').forEach(el => el.addEventListener('click', () => Audio8.select()));

  /* ------------------------------------------------------------------
     SCROLL: HUD level, XP bar, active nav, mood, sprite walking
  ------------------------------------------------------------------ */
  const levels = $$('.level');
  const hudLevel = $('#hudLevel'), hudName = $('#hudName'), xpFill = $('#xpFill');
  const navLinks = $$('.hud__nav a');
  const sprite = $('#hero-sprite');
  let currentLevel = null, frame = 0, walkTimer = 0, facing = 1, idleTimer = null;

  drawSprite(sprite, IDLE);

  function currentSection() {
    const mid = scrollY + innerHeight * 0.45;
    let cur = levels[0];
    for (const s of levels) if (s.offsetTop <= mid) cur = s;
    return cur;
  }
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    xpFill.style.width = (p * 100).toFixed(1) + '%';

    // sprite walks across the bottom with progress
    const travel = innerWidth - sprite.offsetWidth - 16;
    const dir = scrollY > lastY ? 1 : scrollY < lastY ? -1 : facing;
    if (dir !== facing) facing = dir;
    sprite.style.transform = `translateX(${8 + p * travel}px)`;
    if (Math.abs(scrollY - lastY) > 2) {
      walkTimer++;
      if (walkTimer % 3 === 0) { frame = (frame + 1) % 2; drawSprite(sprite, frame ? WALK1 : WALK2, facing < 0); }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => drawSprite(sprite, IDLE, facing < 0), 160);
    }
    lastY = scrollY;

    const sec = currentSection();
    if (sec !== currentLevel) {
      const wasSet = currentLevel !== null;
      currentLevel = sec;
      hudLevel.textContent = sec.dataset.level;
      hudName.textContent = sec.dataset.name;
      Audio8.setMood(sec.dataset.mood);
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + sec.id));
      if (wasSet && body.classList.contains('started')) Audio8.levelUp();
      hudLevel.animate([{ transform: 'scale(1.5)', color: '#fff' }, { transform: 'scale(1)' }], { duration: 300 });
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ------------------------------------------------------------------
     REVEAL ON SCROLL + COUNTERS
  ------------------------------------------------------------------ */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      $$('[data-count]', en.target).forEach(runCounter);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  function runCounter(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const target = +el.dataset.count; const t0 = performance.now(); const dur = 1400;
    const fmt = n => n.toLocaleString('en-IN');
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(target * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ------------------------------------------------------------------
     TYPEWRITER DIALOG (RPG style, with soft blips)
  ------------------------------------------------------------------ */
  function startTypewriters() {
    const tws = $$('.typewriter');
    const typeIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        typeIO.unobserve(en.target); typeText(en.target);
      });
    }, { threshold: 0.4 });
    tws.forEach(el => { el.textContent = ''; typeIO.observe(el); });
  }
  function typeText(el) {
    const text = el.dataset.text; let i = 0;
    if (reduceMotion) { el.textContent = text; el.classList.add('done'); return; }
    (function tick() {
      el.textContent = text.slice(0, ++i);
      if (i % 3 === 0 && Audio8.on && text[i - 1] !== ' ') {
        const t = Audio8.ctx.currentTime;
        Audio8.tone({ freq: 1200 + Math.random() * 300, wave: 'square', t, dur: 0.02, vol: 0.015, dest: Audio8.sfx });
      }
      if (i < text.length) setTimeout(tick, text[i - 1] === '.' ? 220 : 16);
      else el.classList.add('done');
    })();
  }

  /* ------------------------------------------------------------------
     KONAMI EASTER EGG → party mode
  ------------------------------------------------------------------ */
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    kIdx = e.key === KONAMI[kIdx] ? kIdx + 1 : 0;
    if (kIdx === KONAMI.length) {
      kIdx = 0; Audio8.levelUp();
      document.documentElement.style.setProperty('--accent', '#ff6b9d');
      document.documentElement.style.setProperty('--accent-2', '#7cf5c2');
      hudName.textContent = '★ PARTY MODE ★';
    }
  });
})();

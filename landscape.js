/* =====================================================================
   PAGE LANDSCAPE — a misty pine forest that carries the whole page.
   Scrolling moves time forward: the hero opens in daylight with the
   sun high, the middle of the page passes through golden hour and a
   sunset behind the hills, and the end of the page is night with
   stars, a moon and fireflies. Birds fly while it is light.
   Two canvases: #sky sits behind the particle scene (gradient, sun,
   moon, stars) and #forest in front of it (ridges, mist, birds,
   fireflies), so particle shapes read as if they float in the sky.
   ===================================================================== */
(() => {
  'use strict';
  const sky = document.getElementById('sky'), forest = document.getElementById('forest');
  if (!sky || !forest) return;
  const sx = sky.getContext('2d'), fx = forest.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  /* ---------- seeded randomness, so the forest is the same on every visit ---------- */
  let seed = 20261103;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- lighting ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const P = {
    night:  { top: '#0a0f1e', mid: '#131a2d', horizon: '#232c45', haze: '#283046', far: '#1b2234', near: '#0d0f14', bird: '#07090e', glow: [120, 140, 220, .08], stars: 1, flies: 1 },
    dawn:   { top: '#283246', mid: '#4f5670', horizon: '#c79079', haze: '#8a7c86', far: '#5b5664', near: '#16161b', bird: '#18171d', glow: [255, 170, 120, .34], stars: .12, flies: 0 },
    day:    { top: '#335a82', mid: '#7096b9', horizon: '#d8d0bb', haze: '#94a1ac', far: '#687b8b', near: '#1b2026', bird: '#1b2028', glow: [255, 236, 196, .3], stars: 0, flies: 0 },
    golden: { top: '#384662', mid: '#8a8188', horizon: '#e3a271', haze: '#a68b80', far: '#6a5c62', near: '#1a181c', bird: '#16151a', glow: [255, 176, 105, .4], stars: 0, flies: 0 },
    dusk:   { top: '#262c40', mid: '#4f4f63', horizon: '#b06e55', haze: '#6f5c69', far: '#4b4555', near: '#131318', bird: '#121117', glow: [255, 130, 90, .34], stars: .25, flies: .3 }
  };
  const KEYS = [[0, 'night'], [4.8, 'night'], [6.2, 'dawn'], [8.5, 'day'], [14.6, 'day'], [16.7, 'golden'], [18.2, 'dusk'], [19.6, 'night'], [24, 'night']];
  // Time of day at each [data-scene] section, top to bottom: day at the hero, night at the contact section.
  const SECTION_HOURS = [10.6, 14.8, 16.9, 18.1, 18.9, 19.8, 21, 22.2, 23.3];

  function paletteAt(h) {
    let k = 0;
    while (k < KEYS.length - 2 && KEYS[k + 1][0] <= h) k++;
    const A = P[KEYS[k][1]], B = P[KEYS[k + 1][1]], t = smooth(clamp((h - KEYS[k][0]) / (KEYS[k + 1][0] - KEYS[k][0]), 0, 1));
    const out = {};
    for (const key of ['top', 'mid', 'horizon', 'haze', 'far', 'near', 'bird']) { const a = hex(A[key]), b = hex(B[key]); out[key] = a.map((v, i) => Math.round(lerp(v, b[i], t))); }
    out.glow = A.glow.map((v, i) => lerp(v, B.glow[i], t));
    out.stars = lerp(A.stars, B.stars, t); out.flies = lerp(A.flies, B.flies, t);
    return out;
  }
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mixC = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));

  /* ---------- scroll position -> hour ---------- */
  let anchors = [];
  function measure() {
    const secs = Array.from(document.querySelectorAll('[data-scene]'));
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    anchors = secs.map((s, i) => [i === 0 ? 0 : clamp(s.offsetTop + s.offsetHeight / 2 - innerHeight / 2, 0, max), SECTION_HOURS[Math.min(i, SECTION_HOURS.length - 1)]]);
    if (anchors.length) anchors[anchors.length - 1][0] = Math.max(anchors[anchors.length - 1][0], max * .98);
  }
  function hourAt(y) {
    if (window.__hour != null) return window.__hour; // testing hook
    if (!anchors.length) return SECTION_HOURS[0];
    if (y <= anchors[0][0]) return anchors[0][1];
    for (let i = 0; i < anchors.length - 1; i++) {
      const [y0, h0] = anchors[i], [y1, h1] = anchors[i + 1];
      if (y <= y1) return lerp(h0, h1, clamp((y - y0) / Math.max(1, y1 - y0), 0, 1));
    }
    return anchors[anchors.length - 1][1];
  }

  /* ---------- geometry ---------- */
  const LAYERS = 4, HORIZON = .64;
  let W = 0, H = 0, dpr = 1, layers = [], stars = [], mist = null, flies = [];
  let hour = SECTION_HOURS[0], shownHour = hour, pal = paletteAt(hour), bakedHour = -1, lastBake = 0;

  function pine(path, x, base, h, w) {
    const tiers = 4 + Math.floor(rand() * 3);
    path.moveTo(x - w * .16, base);
    for (let j = 0; j < tiers; j++) {
      const y = base - h * (j / tiers) * .92, hw = w * (1 - j / tiers);
      path.lineTo(x - hw, y); path.lineTo(x - hw * .38, y - h / tiers * .42);
    }
    path.lineTo(x, base - h);
    for (let j = tiers - 1; j >= 0; j--) {
      const y = base - h * (j / tiers) * .92, hw = w * (1 - j / tiers);
      path.lineTo(x + hw * .38, y - h / tiers * .42); path.lineTo(x + hw, y);
    }
    path.lineTo(x + w * .16, base);
  }
  function buildLayers() {
    seed = 20261103; layers = [];
    const lw = Math.ceil(W * 1.12);
    for (let i = 0; i < LAYERS; i++) {
      const d = i / (LAYERS - 1);
      const base = H * lerp(HORIZON - .05, .9, Math.pow(d, 1.25));
      const amp = H * lerp(.07, .045, d);
      const f = [rand() * 6, rand() * 6, rand() * 6], k = [lerp(1.4, 2.6, rand()), lerp(3.5, 6, rand()), lerp(9, 14, rand())];
      const ridge = x => { const u = x / lw; return base - amp * (.55 * Math.sin(u * k[0] * Math.PI + f[0]) + .3 * Math.sin(u * k[1] * Math.PI + f[1]) + .15 * Math.sin(u * k[2] * Math.PI + f[2]) + .6); };
      let minY = H;
      const path = new Path2D();
      path.moveTo(0, H); path.lineTo(0, ridge(0));
      for (let x = 0; x <= lw; x += 6) { const y = ridge(x); path.lineTo(x, y); minY = Math.min(minY, y); }
      path.lineTo(lw, H); path.closePath();
      const tH = lerp(8, 120, Math.pow(d, 1.4)), gap = lerp(5, 26, d);
      for (let x = -gap; x < lw + gap; x += gap * (.55 + rand() * .9)) {
        if (rand() < lerp(.08, .22, d)) continue;
        const h = tH * (.55 + rand() * .75), y = ridge(clamp(x, 0, lw)) + h * .06;
        pine(path, x, y, h, h * lerp(.2, .26, rand()));
        minY = Math.min(minY, y - h);
      }
      layers.push({ d, path, top: Math.floor(minY) - 2, lw, canvas: document.createElement('canvas') });
    }
    stars = Array.from({ length: Math.round(W * H / 6000) }, () => ({ x: rand() * W, y: rand() * H * .6, r: rand() < .1 ? 1.4 : .8, tw: rand() * 6.28, sp: .6 + rand() * 1.6 }));
    flies = Array.from({ length: 30 }, () => ({ x: rand() * W, y: H * (.72 + rand() * .24), ph: rand() * 6.28, sp: .3 + rand() * .6 }));
    bakeMist(); bakedHour = -1; bake();
  }
  // Pre-render each ridge in the current light (re-done as the light changes while scrolling).
  function bake() {
    bakedHour = shownHour; lastBake = performance.now();
    const p = paletteAt(shownHour);
    for (const L of layers) {
      const c = L.canvas, h = H - L.top;
      if (c.width !== Math.ceil(L.lw * dpr) || c.height !== Math.ceil(h * dpr)) { c.width = Math.ceil(L.lw * dpr); c.height = Math.ceil(h * dpr); }
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, -L.top * dpr); g.clearRect(0, L.top, L.lw, h);
      const col = mixC(p.far, p.near, Math.pow(L.d, .8));
      const grad = g.createLinearGradient(0, L.top, 0, H);
      grad.addColorStop(0, rgb(col));
      grad.addColorStop(.55, rgb(mixC(col, p.haze, .18 * (1 - L.d * .6))));
      grad.addColorStop(1, rgb(mixC(col, p.haze, .42 * (1 - L.d * .7))));
      g.fillStyle = grad; g.fill(L.path);
    }
  }
  function bakeMist() {
    mist = document.createElement('canvas'); mist.width = 512; mist.height = 128;
    const g = mist.getContext('2d');
    for (let i = 0; i < 14; i++) {
      const x = 40 + rand() * 432, y = 64 + (rand() - .5) * 30, r = 40 + rand() * 50;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r * 1.8, r * .55, 0, 0, 6.29); g.fill();
    }
  }

  /* ---------- sun and moon ---------- */
  function drawSun(g, h) {
    const a = (h - 6) / 12.6;                       // 0 at sunrise, 1 at sunset
    if (a <= 0 || a >= 1.04) return;
    const x = W * lerp(.1, .9, a), y = H * HORIZON - Math.sin(clamp(a, 0, 1) * Math.PI) * H * .5;
    const low = clamp(1 - Math.sin(clamp(a, 0, 1) * Math.PI) * 1.6, 0, 1); // 1 near the horizon
    const core = mixC([255, 226, 160], [255, 150, 80], low), r = Math.min(W, H) * lerp(.036, .046, low);
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 9);
    halo.addColorStop(0, rgb(core, .75)); halo.addColorStop(.14, rgb(core, .32)); halo.addColorStop(.45, rgb(core, .08)); halo.addColorStop(1, rgb(core, 0));
    g.fillStyle = halo; g.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
    const disc = g.createRadialGradient(x, y, 0, x, y, r);
    disc.addColorStop(0, rgb([255, 254, 242])); disc.addColorStop(.55, rgb([255, 244, 210])); disc.addColorStop(.85, rgb(core)); disc.addColorStop(1, rgb(core, 0));
    g.fillStyle = disc; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
  }
  function drawMoon(g, h) {
    const a = (h - 18.6) / 6.5;                     // rises after sunset on the left of the sky
    if (a <= 0) return;
    const rise = Math.sin(clamp(a * 1.4, 0, 1) * Math.PI / 2);
    const x = W * lerp(.9, .84, a), y = H * lerp(.36, .13, rise), r = Math.min(W, H) * .028; // upper right, clear of section text
    const vis = clamp(a * 4, 0, 1);
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 7);
    halo.addColorStop(0, `rgba(205,215,255,${.22 * vis})`); halo.addColorStop(1, 'rgba(205,215,255,0)');
    g.fillStyle = halo; g.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
    g.fillStyle = `rgba(236,238,248,${.95 * vis})`; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
    g.fillStyle = `rgba(150,158,185,${.35 * vis})`; // soft craters
    [[-.3, -.2, .22], [.25, .15, .16], [-.05, .35, .12], [.32, -.3, .1]].forEach(([cx, cy, cr]) => { g.beginPath(); g.arc(x + cx * r, y + cy * r, cr * r, 0, 6.29); g.fill(); });
  }

  /* ---------- birds ---------- */
  const flocks = [];
  let nextFlock = 1.2;
  function spawnFlock() {
    const dir = Math.random() < .5 ? 1 : -1, n = 4 + Math.floor(Math.random() * 6);
    const depth = .55 + Math.random() * .45, size = lerp(4, 9, depth);
    const birds = Array.from({ length: n }, (_, k) => {
      const side = k % 2 ? 1 : -1, rank = Math.ceil(k / 2);
      return { ox: -rank * size * 3.2 * dir + (Math.random() - .5) * size * 2, oy: rank * size * 1.5 * side * .6 + rank * size * .9 + (Math.random() - .5) * size * 2,
        ph: Math.random() * 6.28, fs: 7 + Math.random() * 3, glide: Math.random() * 10, vy: 0, dy: 0 };
    });
    flocks.push({ dir, x: dir > 0 ? -60 : W + 60, y: H * (.12 + Math.random() * .3), speed: lerp(28, 62, depth), size, depth, birds, climb: (Math.random() - .6) * 8 });
  }
  function drawBird(g, x, y, s, flap) {
    const wy = -flap * s * .62;
    g.beginPath();
    g.moveTo(x - s, y + wy);
    g.quadraticCurveTo(x - s * .42, y - s * .22 + wy * .35, x, y);
    g.quadraticCurveTo(x + s * .42, y - s * .22 + wy * .35, x + s, y + wy);
    g.stroke();
  }

  /* ---------- sizing ---------- */
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
    for (const [c, g] of [[sky, sx], [forest, fx]]) { c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
    measure(); buildLayers();
  }

  /* ---------- per frame ---------- */
  const mouse = { x: -9999, y: -9999, nx: 0, sx: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / innerWidth - .5; }, { passive: true });
  let last = performance.now(), born = performance.now(), worldK = 0, worldAt = 0;

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = reduceMotion ? 0 : now / 1000;
    const fade = clamp((now - born) / 1200, 0, 1);
    sky.style.opacity = forest.style.opacity = fade.toFixed(3);
    mouse.sx = lerp(mouse.sx, mouse.nx, .04);

    hour = hourAt(scrollY);
    shownHour = reduceMotion ? hour : lerp(shownHour, hour, .12);  // eases the light when jumping between sections
    pal = paletteAt(shownHour);
    window.__skyHour = shownHour; // read by forest3d.js and island3d.js to light the 3D scenes to match
    // Once the 3D forest (forest3d.js) is running, crossfade to it. This canvas then only draws
    // the shading that keeps text readable; the 2D scenery stays as the fallback without WebGL.
    if (window.__world3d && worldK < 1) { worldAt = worldAt || now; worldK = reduceMotion ? 1 : Math.min(1, (now - worldAt) / 1400); }
    const world = worldK >= 1;
    sky.style.opacity = (fade * (1 - worldK)).toFixed(3);
    if (!world && Math.abs(shownHour - bakedHour) > .06 && now - lastBake > 90) bake();
    const sink = Math.min(scrollY, H * 1.2);                       // the forest settles a little, then holds

    /* sky */
    const g = sx;
    if (!world) {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, rgb(pal.top)); grad.addColorStop(.42, rgb(pal.mid)); grad.addColorStop(HORIZON, rgb(pal.horizon)); grad.addColorStop(1, rgb(pal.haze));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    if (pal.stars > .02) {
      for (const s of stars) { g.globalAlpha = pal.stars * (.35 + .65 * (.5 + .5 * Math.sin(t * s.sp + s.tw))) * (1 - s.y / (H * .64)); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); }
      g.globalAlpha = 1;
    }
    const sunA = clamp((shownHour - 6) / 12.6, 0, 1), gx = W * lerp(.1, .9, sunA), gy = H * HORIZON;
    const rg = g.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * .6);
    rg.addColorStop(0, `rgba(${pal.glow[0] | 0},${pal.glow[1] | 0},${pal.glow[2] | 0},${pal.glow[3]})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    drawSun(g, shownHour); drawMoon(g, shownHour);
    }

    /* forest */
    const f = fx; f.clearRect(0, 0, W, H);
    if (!world) layers.forEach((L, i) => {
      const ox = -(L.lw - W) / 2 - mouse.sx * W * lerp(.02, .09, L.d);
      const oy = sink * lerp(.03, .16, L.d);
      f.globalAlpha = 1 - worldK;
      f.drawImage(L.canvas, ox, L.top + oy, L.lw, H - L.top);
      if (i < LAYERS - 1 && mist) {
        const my = L.top + (H - L.top) * .42 + oy, mw = W * lerp(.9, 1.4, L.d), mh = mw * .25;
        f.globalAlpha = lerp(.5, .16, L.d) * lerp(1, .55, pal.stars) * (1 - worldK);
        for (let m = 0; m < 2; m++) {
          const drift = ((t * lerp(6, 14, L.d) * (m ? -1 : 1) + m * mw * .55 + i * 230) % (W + mw)) - mw * .5;
          f.drawImage(mist, drift - mw * .25, my - mh * .5, mw, mh);
        }
        f.globalAlpha = 1;
      }
    });
    f.globalAlpha = 1;
    const foot = f.createLinearGradient(0, H * .82, 0, H);
    foot.addColorStop(0, 'rgba(20,20,24,0)'); foot.addColorStop(1, 'rgba(20,20,24,.85)');
    f.fillStyle = foot; f.fillRect(0, H * .82, W, H * .18);
    // Readability: past the hero, darken bright skies a little so section text stays crisp.
    const past = smooth(clamp((scrollY - H * .35) / (H * .65), 0, 1)), bright = 1 - pal.stars;
    if (!world && past * bright > .01) { f.fillStyle = `rgba(16,17,22,${.5 * past * bright})`; f.fillRect(0, 0, W, H); }
    // In the hero, a soft scrim behind the headline.
    const heroK = 1 - clamp(scrollY / (H * .8), 0, 1);
    if (heroK > .01) {
      const narrow = W < 900, scx = W * (narrow ? .4 : .22), scy = H * .84, scr = Math.max(W * (narrow ? .9 : .5), 420);
      const scrim = f.createRadialGradient(scx, scy, 0, scx, scy, scr);
      scrim.addColorStop(0, `rgba(14,15,19,${.55 * heroK})`); scrim.addColorStop(.6, `rgba(14,15,19,${.22 * heroK})`); scrim.addColorStop(1, 'rgba(14,15,19,0)');
      f.fillStyle = scrim; f.fillRect(0, 0, W, H);
    }

    /* fireflies at night */
    if (worldK === 0 && pal.flies > .05) {
      f.globalCompositeOperation = 'lighter';
      for (const fl of flies) {
        const x = fl.x + Math.sin(t * fl.sp + fl.ph) * 22, y = fl.y + Math.cos(t * fl.sp * 1.3 + fl.ph) * 10 + sink * .1;
        const a = pal.flies * Math.max(0, Math.sin(t * 1.4 * fl.sp + fl.ph * 2)) * .9;
        if (a < .02) continue;
        const r = f.createRadialGradient(x, y, 0, x, y, 7);
        r.addColorStop(0, `rgba(230,255,170,${a})`); r.addColorStop(1, 'rgba(230,255,170,0)');
        f.fillStyle = r; f.fillRect(x - 7, y - 7, 14, 14);
      }
      f.globalCompositeOperation = 'source-over';
    }

    if (worldK > 0) { requestAnimationFrame(frame); return; }
    /* birds, only while it is light */
    const daylight = 1 - pal.stars;
    if (!reduceMotion) {
      nextFlock -= dt;
      if (nextFlock <= 0 && flocks.length < 2 && daylight > .6) { spawnFlock(); nextFlock = 9 + Math.random() * 9; }
    } else if (!flocks.length && daylight > .6) { spawnFlock(); flocks[0].x = W * .62; }
    f.lineCap = 'round'; f.lineJoin = 'round';
    for (let q = flocks.length - 1; q >= 0; q--) {
      const fl = flocks[q];
      if (!reduceMotion) { fl.x += fl.dir * fl.speed * dt; fl.y += fl.climb * dt + Math.sin(t * .6 + q) * .08; }
      f.strokeStyle = rgb(pal.bird, lerp(.55, .85, fl.depth) * clamp(daylight * 1.5, 0, 1)); f.lineWidth = Math.max(1, fl.size * .2);
      let alive = false;
      for (const b of fl.birds) {
        const x = fl.x + b.ox, y0 = fl.y + b.oy + Math.sin(t * 1.1 + b.ph) * fl.size * .5;
        const dx = x - mouse.x, dyy = y0 + b.dy - mouse.y, d2 = dx * dx + dyy * dyy;
        if (d2 < 140 * 140) b.vy -= (1 - Math.sqrt(d2) / 140) * 26 * dt;
        b.vy *= .96; b.dy += b.vy; b.dy *= .995;
        b.glide -= dt; if (b.glide < -2.5) b.glide = 3 + Math.random() * 6;
        const flapping = b.glide > 0 || b.vy < -.5;
        const flap = reduceMotion ? .3 : flapping ? Math.sin(t * b.fs + b.ph) : .25 + Math.sin(t * 2 + b.ph) * .05;
        drawBird(f, x, y0 + b.dy, fl.size, flap);
        if (x > -80 && x < W + 80) alive = true;
      }
      if (!alive && Math.abs(fl.x - (fl.dir > 0 ? -60 : W + 60)) > 200) flocks.splice(q, 1);
    }

    requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  addEventListener('load', measure);
  setInterval(measure, 1500); // sections change height when roles expand or fonts load
  // if the 3D world hasn't started after a few seconds, show the HTML copy of the name instead
  setTimeout(() => { if (!window.__world3d) document.documentElement.classList.add('no-world'); }, 5000);
  requestAnimationFrame(frame);
})();

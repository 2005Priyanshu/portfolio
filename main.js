/* =====================================================================
   PRIYANSHU SINGH — PORTFOLIO
   1. Section tracking (the scenery is the 3D forest in forest3d.js)
   2. Text reveals · counters · header state · clock
   3. Custom cursor · experience accordion · project hover previews
   4. Text disintegration on hover
   5. Inertial smooth scroll
   6. Generated lo-fi soundtrack (arrangement changes per section)
   No dependencies.
   ===================================================================== */
(() => {
  'use strict';
  const PS = window.PS = window.PS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const COLORS = ['#f0f2f0', '#f4ce15', '#379777', '#8b8f8c'];
  // Soft round glow sprite: a bright core that falls off smoothly.
  const spriteCache = new Map();
  function sprite(color) {
    if (spriteCache.has(color)) return spriteCache.get(color);
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 1, 1);
    const [r, gg, b] = g.getImageData(0, 0, 1, 1).data; g.clearRect(0, 0, 1, 1);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, `rgba(${r},${gg},${b},1)`); grd.addColorStop(.18, `rgba(${r},${gg},${b},.95)`);
    grd.addColorStop(.4, `rgba(${r},${gg},${b},.32)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    spriteCache.set(color, c); return c;
  }
  const SPRITES = COLORS.map(sprite);

  const mouse = { x: -9999, y: -9999, nx: 0, ny: 0, sx: 0, sy: 0, down: false };
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth - .5; mouse.ny = e.clientY / innerHeight - .5;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  addEventListener('pointerdown', () => mouse.down = true);
  addEventListener('pointerup', () => mouse.down = false);

  /* ---------- film grain texture (generated, no image file) ---------- */
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const x = c.getContext('2d'); const img = x.createImageData(220, 220);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    $('.grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  })();

  /* =====================================================================
     1. SECTIONS
     The scenery itself is the 3D forest (forest3d.js). Here we only track
     which section is in view, so the soundtrack can change with it.
     ===================================================================== */
  const sections = $$('[data-scene]');
  let anchors = [];
  function computeAnchors() {
    const max = document.documentElement.scrollHeight - innerHeight;
    anchors = sections.map((s, i) => i === 0 ? 0 : clamp(s.offsetTop + s.offsetHeight / 2 - innerHeight / 2, 0, max));
  }
  function sceneFromScroll(y) {
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) {
        const t = clamp((y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]), 0, 1);
        return i + clamp((t - .2) / .6, 0, 1);
      }
    }
    return anchors.length - 1;
  }

  /* =====================================================================
     2. REVEALS · COUNTERS · HEADER · CLOCK
     ===================================================================== */
  $$('.split').forEach(el => {
    const nodes = Array.from(el.childNodes); let i = 0;
    el.textContent = '';
    const add = (text, cls) => {
      if (i) el.appendChild(document.createTextNode(' '));
      const s = document.createElement('span'); s.className = cls ? 'w ' + cls : 'w'; s.style.setProperty('--i', i++); s.textContent = text;
      el.appendChild(s);
    };
    nodes.forEach(n => {
      if (n.nodeType === 3) n.textContent.trim().split(/\s+/).filter(Boolean).forEach(w => add(w));
      else add(n.textContent.trim(), n.className); // e.g. a gradient phrase stays one unit
    });
  });
  // stagger list children
  $$('.numbers, .roles, .projects, .skills__grid, .extras').forEach(list => {
    Array.from(list.children).forEach((c, i) => c.style.setProperty('--d', (i * .08) + 's'));
  });

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    $$('[data-count]', e.target).forEach(countUp);
  }), { threshold: .2, rootMargin: '0px 0px -6% 0px' });

  function countUp(el) {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1600;
    (function step(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString('en-IN');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function startReveals() {
    // hero reveals on load in sequence, everything else on scroll
    const hero = $('.hero');
    $$('.blur-in, .split', hero).forEach((el, i) => { el.style.setProperty('--d', (.35 + i * .25) + 's'); });
    void hero.offsetHeight;
    setTimeout(() => $$('.blur-in, .split', hero).forEach(el => el.classList.add('in')), 30);
    $$('.blur-in, .split').filter(el => !hero.contains(el)).forEach(el => io.observe(el));
  }

  const navLinks = $$('.nav a');
  const navTargets = navLinks.map(a => document.getElementById(a.getAttribute('href').slice(1)));
  const navEl = $('.nav'), bubble = $('.nav__bubble');
  let lastActive = -2, navHover = null, bubbleShown = false;
  function moveBubble(a) {
    if (!a) { bubble.style.opacity = '0'; bubbleShown = false; return; }
    const nr = navEl.getBoundingClientRect(), r = a.getBoundingClientRect();
    if (!r.width) return;
    bubble.classList.toggle('no-anim', !bubbleShown); // first appearance: no slide-in from the left
    bubble.style.width = r.width + 'px'; bubble.style.transform = `translateX(${r.left - nr.left}px)`; bubble.style.opacity = '1';
    bubbleShown = true;
  }
  navLinks.forEach(a => a.addEventListener('pointerenter', () => { navHover = a; moveBubble(a); }));
  navEl.addEventListener('pointerleave', () => { navHover = null; moveBubble(navLinks[lastActive]); });
  function onScroll() {
    document.body.classList.toggle('scrolled', scrollY > 40);
    const mid = scrollY + innerHeight * .4; let active = -1;
    navTargets.forEach((s, i) => { if (s && s.offsetTop <= mid) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === active));
    if (active !== lastActive) { lastActive = active; if (!navHover) moveBubble(navLinks[active]); }
    audio.setScene(Math.round(sceneFromScroll(scrollY)));
  }

  /* Indian Standard Time clock in the hero: analog face plus digital readout */
  const IST = { timeZone: 'Asia/Kolkata' };
  const fmtTime = new Intl.DateTimeFormat('en-GB', { ...IST, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const fmtDate = new Intl.DateTimeFormat('en-GB', { ...IST, weekday: 'short', day: 'numeric', month: 'short' });
  const hHand = $('.hero-clock__h'), mHand = $('.hero-clock__m'), sHand = $('.hero-clock__s');
  const tEl = $('#istTime'), secEl = $('#istSec'), dEl = $('#istDate');
  function tickClock() {
    if (!tEl) return;
    const now = new Date(), [hh, mm, ss] = fmtTime.format(now).split(':').map(Number);
    tEl.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    secEl.textContent = ':' + String(ss).padStart(2, '0');
    dEl.textContent = fmtDate.format(now);
    hHand.setAttribute('transform', `rotate(${(hh % 12) * 30 + mm * .5} 20 20)`);
    mHand.setAttribute('transform', `rotate(${mm * 6 + ss * .1} 20 20)`);
    sHand.setAttribute('transform', `rotate(${ss * 6} 20 20)`);
  }
  tickClock(); setInterval(tickClock, 1000);

  /* =====================================================================
     3. CURSOR · ACCORDION · PROJECT PREVIEWS
     ===================================================================== */
  const cursor = $('.cursor');
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    let rx = innerWidth / 2, ry = innerHeight / 2;
    addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-hover', !!t); label.textContent = t ? t.dataset.cursor : '';
    });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    (function loop() {
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      rx = lerp(rx, mouse.x, .16); ry = lerp(ry, mouse.y, .16);
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();
  }

  /* Shooting-star trail: a glowing comet tail plus twinkling stardust that drifts down. */
  const trail = $('#trail');
  if (trail && finePointer && !reduceMotion) {
    const tc = trail.getContext('2d'); let tw = 0, th = 0;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); tw = innerWidth; th = innerHeight; trail.width = tw * d; trail.height = th * d; tc.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);
    const WARM = sprite('#fff3cf'), GOLD = SPRITES[1], MINT = sprite('#7fe0b8');
    const sparks = [], tail = [];
    let lx = null, ly = null, lastMove = 0;
    const spawn = (x, y, ux, uy, speed) => {
      if (sparks.length > 500) sparks.shift();
      const r = Math.random(), sp = Math.min(1.6, speed / 18);
      sparks.push({
        x: x + (Math.random() - .5) * 5, y: y + (Math.random() - .5) * 5,
        vx: -ux * sp + (Math.random() - .5) * .9, vy: -uy * sp + (Math.random() - .5) * .9,
        life: 1, decay: .011 + Math.random() * .02, s: .7 + Math.random() * 2,
        star: r < .12, rot: Math.random() * Math.PI, tw: Math.random() * 6.28,
        spr: r < .55 ? WARM : r < .87 ? GOLD : MINT
      });
    };
    addEventListener('pointermove', e => {
      const x = e.clientX, y = e.clientY;
      if (lx === null) { lx = x; ly = y; }
      const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy), n = Math.min(16, Math.floor(dist / 4));
      for (let k = 0; k < n; k++) spawn(lx + dx * k / n, ly + dy * k / n, dx / (dist || 1), dy / (dist || 1), dist);
      if (dist > 1) lastMove = performance.now();
      lx = x; ly = y;
    }, { passive: true });
    const flare = (x, y, len, rot, a) => { // four-point star
      tc.save(); tc.translate(x, y); tc.rotate(rot); tc.globalAlpha = a; tc.fillStyle = '#fff8e1';
      for (let q = 0; q < 2; q++) {
        tc.beginPath(); tc.moveTo(-len, 0); tc.lineTo(0, -len * .07); tc.lineTo(len, 0); tc.lineTo(0, len * .07); tc.closePath(); tc.fill();
        tc.rotate(Math.PI / 2);
      }
      tc.restore();
    };
    (function loop(now) {
      tc.clearRect(0, 0, tw, th);
      tc.globalCompositeOperation = 'lighter';
      const t = now / 1000, idle = now - lastMove > 120;
      // comet tail
      if (mouse.x > -1000) tail.push({ x: mouse.x, y: mouse.y });
      if (tail.length > 26 || (idle && tail.length)) tail.shift();
      for (let i = 1; i < tail.length; i++) {
        const f = i / tail.length;
        tc.globalAlpha = f * .55; tc.strokeStyle = '#ffe9a8'; tc.lineWidth = f * 3.2; tc.lineCap = 'round';
        tc.beginPath(); tc.moveTo(tail[i - 1].x, tail[i - 1].y); tc.lineTo(tail[i].x, tail[i].y); tc.stroke();
        const g = 10 * f; tc.globalAlpha = f * .12; tc.drawImage(GOLD, tail[i].x - g, tail[i].y - g, g * 2, g * 2);
      }
      // stardust
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy; p.vx *= .965; p.vy = p.vy * .965 + .014; p.life -= p.decay; p.rot += .03;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        const tw2 = .55 + .45 * Math.sin(t * 18 + p.tw), k = p.s * 6 * (.4 + p.life * .6);
        tc.globalAlpha = p.life * tw2; tc.drawImage(p.spr, p.x - k / 2, p.y - k / 2, k, k);
        if (p.star) flare(p.x, p.y, p.s * 6 * p.life, p.rot, p.life * tw2 * .9);
      }
      // the star at the cursor itself
      if (mouse.x > -1000) {
        const pulse = 1 + .08 * Math.sin(t * 3);
        tc.globalAlpha = .28; tc.drawImage(GOLD, mouse.x - 26 * pulse, mouse.y - 26 * pulse, 52 * pulse, 52 * pulse);
        tc.globalAlpha = .95; tc.drawImage(WARM, mouse.x - 7, mouse.y - 7, 14, 14);
        flare(mouse.x, mouse.y, 13 * pulse, t * .6, .75);
      }
      tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-over';
      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* Glass: specular glare follows the pointer across every glass surface. */
  const glassEls = $$('.glass');
  let glareQueued = false;
  const glare = () => {
    glareQueued = false;
    for (const el of document.querySelectorAll('.glass')) {
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      el.style.setProperty('--gx', (mouse.x - r.left) + 'px'); el.style.setProperty('--gy', (mouse.y - r.top) + 'px');
    }
  };
  addEventListener('pointermove', () => { if (!glareQueued) { glareQueued = true; requestAnimationFrame(glare); } }, { passive: true });

  /* Liquid-glass refraction. Chromium can run an SVG filter as a backdrop-filter,
     so we generate a displacement map that bends the background at the rim
     like a lens. Other browsers keep the frosted fallback from CSS. */
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands.some(b => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand)));
  function refractionMap(w, h, rad, bezel) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data, hw = w / 2, hh = h / 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const px = i + .5 - hw, py = j + .5 - hh;
      const qx = Math.abs(px) - (hw - rad), qy = Math.abs(py) - (hh - rad);
      const depth = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad);
      let dx = 0, dy = 0;
      if (depth >= 0 && depth < bezel) {
        let nx, ny;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        const k = 1 - depth / bezel, mag = k * k; // convex lens: strongest right at the rim
        dx = -nx * mag; dy = -ny * mag;         // sample inward, so the rim magnifies
      }
      const o = (j * w + i) * 4; d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }
  if (chromium) {
    const defs = $('.lg-defs defs'), NS = 'http://www.w3.org/2000/svg';
    $$('.glass--refract').forEach((el, n) => {
      const id = 'lg-refract-' + n; let filter = null, lastKey = '';
      const build = () => {
        const r = el.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
        if (!w || !h || lastKey === w + 'x' + h) return; lastKey = w + 'x' + h;
        const rad = Math.min(h / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || h / 2);
        const shift = Math.min(14, h * .32), bezel = Math.min(18, h * .45);
        if (filter) filter.remove();
        filter = document.createElementNS(NS, 'filter');
        Object.entries({ id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }).forEach(([k, v]) => filter.setAttribute(k, v));
        filter.innerHTML =
          `<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>` +
          `<feImage href="${refractionMap(w, h, rad, bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
          `<feDisplacementMap in="blur" in2="map" scale="${shift * 2}" xChannelSelector="R" yChannelSelector="G" result="bent"/>` +
          `<feColorMatrix in="bent" type="saturate" values="1.7"/>`;
        defs.appendChild(filter);
        el.style.backdropFilter = `url(#${id})`;
      };
      build(); new ResizeObserver(build).observe(el);
    });
  }

  $$('.role').forEach(role => {
    const btn = $('.role__row', role);
    btn.addEventListener('click', () => {
      const open = !role.classList.contains('open');
      $$('.role.open').forEach(r => { r.classList.remove('open'); $('.role__row', r).setAttribute('aria-expanded', 'false'); });
      role.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
      setTimeout(computeAnchors, 750);
    });
  });

  // Procedural preview art, one animated sketch per project.
  const preview = $('.preview'), pcv = $('.preview__canvas'), pctx = pcv.getContext('2d');
  const PW = 640, PH = 480; pcv.width = PW; pcv.height = PH;
  const seeded = n => { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const SKETCH = {
    rain(t) {
      const g = pctx.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, '#1d2430'); g.addColorStop(1, '#141619');
      pctx.fillStyle = g; pctx.fillRect(0, 0, PW, PH);
      const r = seeded(7); pctx.strokeStyle = 'rgba(240,242,240,.35)'; pctx.lineWidth = 1.2;
      for (let i = 0; i < 90; i++) { const x = r() * PW, sp = 120 + r() * 160, y = ((r() * PH + t * sp) % (PH + 40)) - 20; pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x - 3, y + 14); pctx.stroke(); }
      const months = [12, 18, 15, 30, 60, 160, 290, 260, 170, 70, 24, 10];
      months.forEach((m, i) => { const h = m * (.9 + .1 * Math.sin(t * 2 + i)), bw = 34; pctx.fillStyle = i >= 5 && i <= 8 ? '#f4ce15' : 'rgba(240,242,240,.5)'; pctx.fillRect(48 + i * 46, PH - 50 - h * .9, bw, h * .9); });
    },
    series(t) {
      pctx.fillStyle = '#18191c'; pctx.fillRect(0, 0, PW, PH);
      pctx.strokeStyle = 'rgba(240,242,240,.06)'; for (let y = 60; y < PH; y += 60) { pctx.beginPath(); pctx.moveTo(0, y); pctx.lineTo(PW, y); pctx.stroke(); }
      const f = x => 260 - 60 * Math.sin(x * .018) - 30 * Math.sin(x * .05 + 1) - x * .12;
      const split = 400, end = Math.min(PW - 30, split + ((t * 120) % 360));
      pctx.fillStyle = 'rgba(55,151,119,.22)'; pctx.beginPath();
      for (let x = split; x <= end; x += 4) pctx.lineTo(x, f(x) - (x - split) * .25); for (let x = end; x >= split; x -= 4) pctx.lineTo(x, f(x) + (x - split) * .25); pctx.fill();
      pctx.lineWidth = 2.4; pctx.strokeStyle = '#f0f2f0'; pctx.beginPath(); for (let x = 30; x <= split; x += 3) pctx.lineTo(x, f(x) + 8 * Math.sin(x * .3)); pctx.stroke();
      pctx.setLineDash([8, 7]); pctx.strokeStyle = '#f4ce15'; pctx.beginPath(); for (let x = split; x <= end; x += 3) pctx.lineTo(x, f(x)); pctx.stroke(); pctx.setLineDash([]);
    },
    stock(t) {
      pctx.fillStyle = '#151718'; pctx.fillRect(0, 0, PW, PH);
      const r = seeded(11); let p = 240; const pts = [], shift = (t * 30) % 22;
      for (let i = 0; i < 34; i++) {
        const o = p, c = p + (r() - .48) * 40, hi = Math.min(o, c) - r() * 18, lo = Math.max(o, c) + r() * 18, x = 20 + i * 22 - shift;
        pctx.strokeStyle = pctx.fillStyle = c < o ? '#379777' : '#c8564b';
        pctx.beginPath(); pctx.moveTo(x + 6, hi); pctx.lineTo(x + 6, lo); pctx.stroke(); pctx.fillRect(x, Math.min(o, c), 12, Math.max(2, Math.abs(c - o)));
        pts.push([x + 6, (o + c) / 2]); p = c;
      }
      pctx.strokeStyle = '#f4ce15'; pctx.lineWidth = 2; pctx.beginPath();
      pts.forEach((q, i) => { const avg = pts.slice(Math.max(0, i - 4), i + 1).reduce((s, v) => s + v[1], 0) / Math.min(i + 1, 5); i ? pctx.lineTo(q[0], avg) : pctx.moveTo(q[0], avg); }); pctx.stroke();
    },
    design(t) {
      pctx.fillStyle = '#e9ebe8'; pctx.fillRect(0, 0, PW, PH);
      const card = (x, y, w, h, c, rr = 10) => { pctx.fillStyle = c; pctx.beginPath(); pctx.roundRect(x, y, w, h, rr); pctx.fill(); };
      card(40, 36, 560, 408, '#ffffff', 14);
      card(64, 60, 90, 14, '#222124', 4); [380, 440, 500].forEach(x => card(x, 62, 44, 10, '#c9ccc8', 4));
      card(64, 110, 300, 34, '#222124', 6); card(64, 154, 230, 34, '#222124', 6); card(64, 210, 260, 12, '#b5b8b4', 4); card(64, 232, 200, 12, '#b5b8b4', 4);
      const pulse = 1 + .04 * Math.sin(t * 4); card(64, 270, 130 * pulse, 40, '#f4ce15', 20);
      card(390, 110, 186, 200, '#379777', 12); card(410, 130, 146, 90, 'rgba(255,255,255,.25)', 8);
      [64, 246, 428].forEach((x, i) => card(x, 340, 148, 80, i === 1 ? '#222124' : '#eef0ed', 10));
      const cx = 300 + Math.cos(t * .9) * 160, cy = 280 + Math.sin(t * 1.3) * 80;
      pctx.fillStyle = '#222124'; pctx.beginPath(); pctx.moveTo(cx, cy); pctx.lineTo(cx, cy + 22); pctx.lineTo(cx + 6, cy + 16); pctx.lineTo(cx + 14, cy + 16); pctx.closePath(); pctx.fill();
    },
    games(t) {
      pctx.fillStyle = '#19171c'; pctx.fillRect(0, 0, PW, PH);
      const cols = 8, rows = 6, s = 58, gap = 12, x0 = (PW - (cols * s + (cols - 1) * gap)) / 2, y0 = (PH - (rows * s + (rows - 1) * gap)) / 2;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const ph = Math.sin(t * 1.6 + i * .7 + j * 1.1), k = (ph + 1) / 2;
        pctx.fillStyle = k > .85 ? '#f4ce15' : k > .65 ? '#379777' : `rgba(240,242,240,${.06 + k * .12})`;
        const sc = .75 + .25 * k, w = s * sc;
        pctx.beginPath(); pctx.roundRect(x0 + i * (s + gap) + (s - w) / 2, y0 + j * (s + gap) + (s - w) / 2, w, w, 8); pctx.fill();
      }
    }
  };
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };

  let pvKind = null, pvRaf = 0, px = 0, py = 0, prot = 0, lastX = 0;
  function pvLoop(now) {
    const vel = mouse.x - lastX; lastX = mouse.x;
    px = lerp(px, mouse.x, .12); py = lerp(py, mouse.y, .12); prot = lerp(prot, clamp(vel * .35, -9, 9), .1);
    preview.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${prot}deg)`;
    if (pvKind) SKETCH[pvKind](now / 1000);
    pvRaf = preview.classList.contains('show') || Math.abs(prot) > .05 ? requestAnimationFrame(pvLoop) : 0;
  }
  if (finePointer) {
    $$('.project').forEach(li => {
      li.addEventListener('pointerenter', () => {
        if (!pvRaf) { px = mouse.x; py = mouse.y; lastX = mouse.x; }
        pvKind = li.dataset.preview; preview.classList.add('show');
        $('.preview__name').textContent = $('.project__name', li).textContent;
        $('.preview__go').textContent = $('a', li).dataset.cursor === 'Ask' ? 'Ask me' : 'View ↗';
        if (!pvRaf) pvRaf = requestAnimationFrame(pvLoop);
      });
    });
    $('.projects').addEventListener('pointerleave', () => preview.classList.remove('show'));
  }

  /* =====================================================================
     4. DISINTEGRATE ON HOVER
     Text is rasterised to particles; on hover it scatters like dust,
     on leave the particles fly back and the real text returns.
     ===================================================================== */
  class Disintegrate {
    constructor(el) {
      if (!finePointer || reduceMotion) return; // hover-only effect: nothing to build on touch screens
      this.el = el; this.pad = 80; this.parts = []; this.state = 'idle'; this.raf = 0;
      this.cv = document.createElement('canvas'); this.cv.className = 'dis-canvas'; this.cx = this.cv.getContext('2d');
      el.classList.add('dis-host'); el.appendChild(this.cv);
      el.addEventListener('pointerenter', () => this.enter());
      el.addEventListener('pointerleave', () => this.leave());
    }
    sample() {
      const r = this.el.getBoundingClientRect(), cs = getComputedStyle(this.el), fs = parseFloat(cs.fontSize);
      const d = Math.min(devicePixelRatio || 1, 2), pad = this.pad;
      const w = Math.ceil(r.width) + pad * 2, h = Math.ceil(r.height) + pad * 2;
      Object.assign(this.cv.style, { width: w + 'px', height: h + 'px', left: -pad + 'px', top: -pad + 'px' });
      this.cv.width = w * d; this.cv.height = h * d; this.cx.setTransform(d, 0, 0, d, 0, 0); this.d = d;
      const off = document.createElement('canvas'); off.width = w; off.height = h; const o = off.getContext('2d');
      o.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      if ('letterSpacing' in o) o.letterSpacing = cs.letterSpacing;
      const txt = this.el.firstChild.textContent.trim();
      const m = o.measureText(txt), asc = m.fontBoundingBoxAscent ?? fs * .8, desc = m.fontBoundingBoxDescent ?? fs * .2;
      o.fillStyle = '#fff'; o.textBaseline = 'alphabetic';
      o.fillText(txt, pad + parseFloat(cs.paddingLeft || 0), pad + (r.height - (asc + desc)) / 2 + asc);
      const data = o.getImageData(0, 0, w, h).data, step = Math.max(1.2, fs / 30);
      const color = cs.color;
      this.parts = [];
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
        if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 110) this.parts.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, a: 1, spr: sprite(Math.random() < .08 ? '#f4ce15' : color), s: step });
      }
    }
    enter() {
      if (!finePointer || reduceMotion) return;
      if (this.state === 'idle') this.sample();
      this.state = 'out'; this.el.classList.add('dis-active');
      const r = this.cv.getBoundingClientRect(), mx = mouse.x - r.left, my = mouse.y - r.top;
      for (const p of this.parts) {
        const dx = p.x - mx, dy = p.y - my, dist = Math.hypot(dx, dy) || 1, f = 1.2 + 140 / (dist + 40);
        p.vx = dx / dist * f + (Math.random() - .5) * 1.6; p.vy = dy / dist * f - 1.2 + (Math.random() - .5) * 1.6;
      }
      this.run();
    }
    leave() { if (this.state !== 'idle') { this.state = 'in'; this.run(); } }
    run() {
      if (this.raf) return;
      const tick = () => {
        const c = this.cx; c.clearRect(0, 0, this.cv.width, this.cv.height); c.globalCompositeOperation = 'lighter';
        let home = 0;
        for (const p of this.parts) {
          if (this.state === 'out') { p.vx = p.vx * .94 + (Math.random() - .5) * .25; p.vy = p.vy * .94 - .02; p.a = Math.max(.12, p.a - .008); }
          else { p.vx = (p.vx + (p.hx - p.x) * .14) * .7; p.vy = (p.vy + (p.hy - p.y) * .14) * .7; p.a = Math.min(1, p.a + .06); if (Math.abs(p.hx - p.x) + Math.abs(p.hy - p.y) < .6) home++; }
          p.x += p.vx; p.y += p.vy;
          const k = p.s * 2.2; c.globalAlpha = p.a * .9; c.drawImage(p.spr, p.x - k / 2, p.y - k / 2, k, k);
        }
        c.globalAlpha = 1;
        if (this.state === 'in' && home >= this.parts.length * .98) {
          this.state = 'idle'; this.el.classList.remove('dis-active'); c.clearRect(0, 0, this.cv.width, this.cv.height); this.raf = 0; return;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  /* =====================================================================
     5. INERTIAL SMOOTH SCROLL (wheel only; touch and keys stay native)
     ===================================================================== */
  function smoothScroll() {
    const max = () => document.documentElement.scrollHeight - innerHeight;
    let target = scrollY, current = scrollY, running = false, own = false;
    const loop = () => {
      current = lerp(current, target, .09);
      if (Math.abs(target - current) < .5) { current = target; running = false; }
      own = true; scrollTo(0, current); own = false;
      if (running) requestAnimationFrame(loop);
    };
    const go = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    if (finePointer && !reduceMotion) {
      document.documentElement.classList.add('smooth');
      addEventListener('wheel', e => {
        if (e.ctrlKey || document.documentElement.classList.contains('modal-open') || e.target.closest('[data-native-scroll]')) return;
        e.preventDefault();
        const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
        target = clamp(target + dy, 0, max()); go();
      }, { passive: false });
      addEventListener('scroll', () => { if (!own && !running) target = current = scrollY; }, { passive: true });
    }
    PS.scrollToY = y => {
      y = clamp(y, 0, max());
      if (finePointer && !reduceMotion) { current = scrollY; target = y; go(); } else scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1), el = id === 'top' ? document.body : document.getElementById(id);
      if (!el) return; e.preventDefault();
      const y = id === 'top' ? 0 : clamp(el.offsetTop, 0, max());
      if (finePointer && !reduceMotion) { current = scrollY; target = y; go(); } else scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
  }

  /* =====================================================================
     6. SOUNDTRACK
     A generated lo-fi track whose arrangement changes per section.
     ===================================================================== */
  const audio = (() => {
    /* A lo-fi track generated live: Rhodes-style keys, bass, swung drums,
       a lead hook, arpeggio, pad and vinyl crackle. Each section is an
       arrangement of those layers, so the song evolves as you scroll. */
    const BPM = 86, STEP = 60 / BPM / 4, SWING = .17;
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    // Fmaj9 → Em7 → Dm9 → Cmaj9 (IV–iii–ii–I in C)
    const CHORDS = [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]];
    const ROOTS = [41, 40, 38, 36];
    const BASS = [[0, 0, 6], [7, 0, 1], [8, 7, 4], [14, 12, 2]]; // [step, interval, length]
    const _ = -1;
    const MELODY = [
      [76, _, _, 79, _, _, 81, _, 79, _, 76, _, _, _, 74, _],
      [_, _, 76, _, 74, _, 72, _, _, _, 74, _, 76, _, _, _],
      [77, _, _, 76, _, _, 74, _, 72, _, 74, _, _, _, 69, _],
      [_, _, 71, _, 72, _, _, _, 76, _, _, _, 79, _, _, _]
    ];
    // Arrangement per section (0 = muted). cut = master low-pass in Hz.
    const MIX = [
      { keys: 1, bass: 1, kick: .85, snare: .7, hats: .8, lead: 0, arp: 0, pad: .25, cut: 4600 },  // hero: the groove
      { keys: 1, bass: 1, kick: 1, snare: 1, hats: 1, lead: 1, arp: 0, pad: 0, cut: 8500 },        // about: hook enters
      { keys: .9, bass: .45, kick: 0, snare: 0, hats: .35, lead: .8, arp: .7, pad: 1, cut: 2600 },  // globe: breakdown
      { keys: 1, bass: 1, kick: 1, snare: 1, hats: 1, lead: 1, arp: 0, pad: .3, cut: 10000 },      // experience: full
      { keys: 1, bass: .9, kick: .8, snare: .7, hats: .9, lead: .6, arp: 0, pad: .4, cut: 6500 },   // evaluator: focused
      { keys: 1, bass: 1, kick: 1, snare: 1, hats: 1, lead: .55, arp: 1, pad: 0, cut: 11000 },      // work: full + arp
      { keys: 1, bass: .7, kick: .5, snare: .4, hats: .6, lead: .4, arp: .8, pad: .8, cut: 5200 },  // design: dreamy
      { keys: 1, bass: 1, kick: 1, snare: .9, hats: .9, lead: 0, arp: 1, pad: .4, cut: 8000 },     // skills
      { keys: 1, bass: .8, kick: .6, snare: .5, hats: .6, lead: 1, arp: 0, pad: .6, cut: 4000 }     // contact: outro
    ];
    const LEVEL = { keys: .8, bass: .85, kick: .9, snare: .5, hats: .38, lead: .75, arp: .5, pad: .55 };
    let ac, out, lp, duck, verb, dly, trem, noise, vinylSrc, bus = {}, on = false, scene = 0, step = 0, next = 0, timer = 0;
    let master = null, hushTo = 1; // master: everything ends here, so story mode can hush the song under its own
    const dest = () => master || (master = ac.createGain(), master.gain.value = hushTo, master.connect(ac.destination), master);
    const kicks = []; // scheduled kick times, so the visuals pulse exactly on the beat

    function init() {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      out = ac.createGain(); out.gain.value = 0;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .18;
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4600; lp.Q.value = .5;
      lp.connect(comp).connect(out).connect(dest());

      duck = ac.createGain(); duck.connect(lp); // sidechained by the kick

      verb = ac.createConvolver(); verb.buffer = makeHall(2.6, .5); const vw = ac.createGain(); vw.gain.value = .32; verb.connect(vw).connect(lp);
      dly = ac.createDelay(2); dly.delayTime.value = STEP * 3; const fb = ac.createGain(); fb.gain.value = .3; const dw = ac.createGain(); dw.gain.value = .28;
      dly.connect(fb).connect(dly); dly.connect(dw).connect(lp); dly.connect(verb);

      for (const k of Object.keys(LEVEL)) { bus[k] = ac.createGain(); bus[k].gain.value = 0; bus[k].connect(['kick', 'snare', 'hats'].includes(k) ? lp : duck); }
      trem = ac.createGain(); trem.gain.value = .88; trem.connect(bus.keys);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 4.2; lg.gain.value = .12; lfo.connect(lg).connect(trem.gain); lfo.start();
      const ks = ac.createGain(); ks.gain.value = .25; bus.keys.connect(ks).connect(verb);
      const ls = ac.createGain(); ls.gain.value = .5; bus.lead.connect(ls).connect(dly); bus.lead.connect(verb);
      bus.arp.connect(dly); const ss = ac.createGain(); ss.gain.value = .35; bus.snare.connect(ss).connect(verb);

      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      // vinyl: soft hiss and random crackles, looped
      const vl = ac.sampleRate * 4, vb = ac.createBuffer(1, vl, ac.sampleRate), vd = vb.getChannelData(0);
      for (let i = 0; i < vl; i++) { vd[i] = (Math.random() * 2 - 1) * .012; if (Math.random() < .0004) { const a = .25 + Math.random() * .5; for (let j = 0; j < 40 && i + j < vl; j++) vd[i + j] += (Math.random() * 2 - 1) * a * (1 - j / 40); } }
      vinylSrc = ac.createBufferSource(); vinylSrc.buffer = vb; vinylSrc.loop = true;
      const vh = ac.createBiquadFilter(); vh.type = 'highpass'; vh.frequency.value = 900; const vg = ac.createGain(); vg.gain.value = .35;
      vinylSrc.connect(vh).connect(vg).connect(out); vinylSrc.start();
    }

    const env = (g, t, peak, a, d, sus, rel, end) => {
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setTargetAtTime(peak * sus, t + a, d); g.gain.setTargetAtTime(0, end, rel);
    };
    function key(n, t, vel, dur) { // FM electric piano
      const f = hz(n), car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), amp = ac.createGain();
      car.frequency.value = f; mod.frequency.value = f;
      mg.gain.setValueAtTime(f * 2 * vel, t); mg.gain.exponentialRampToValueAtTime(f * .2 + 1, t + 1);
      mod.connect(mg).connect(car.frequency);
      const tine = ac.createOscillator(), tg = ac.createGain(); tine.frequency.value = f * 4;
      tg.gain.setValueAtTime(.03 * vel, t); tg.gain.exponentialRampToValueAtTime(.0001, t + .3); tine.connect(tg).connect(amp);
      car.connect(amp); amp.connect(trem); env(amp, t, .085 * vel, .006, .5, .35, .18, t + dur);
      [car, mod, tine].forEach(o => { o.start(t); o.stop(t + dur + 1.2); });
    }
    const chord = (ci, t, vel, dur) => CHORDS[ci].forEach((n, i) => key(n, t + i * .014, vel * (.85 + Math.random() * .15), dur));
    function bass(n, t, dur) {
      const f = hz(n), o = ac.createOscillator(), s = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f; s.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 520;
      o.connect(fl); s.connect(fl); fl.connect(g).connect(bus.bass); env(g, t, .34, .012, .3, .75, .06, t + dur);
      [o, s].forEach(x => { x.start(t); x.stop(t + dur + .5); });
    }
    function kick(t, v) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(46, t + .12);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .45);
      o.connect(g).connect(bus.kick); o.start(t); o.stop(t + .5);
      kicks.push(t, v * MIX[scene].kick); if (kicks.length > 32) kicks.splice(0, 2);
      if (MIX[scene].kick > 0) { duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(.52, t); duck.gain.linearRampToValueAtTime(1, t + .3); }
    }
    function snare(t, v) {
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = .7;
      g.gain.setValueAtTime(.4 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      n.connect(bp).connect(g).connect(bus.snare); n.start(t, Math.random() * .5); n.stop(t + .25);
      const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'triangle';
      b.frequency.setValueAtTime(190, t); b.frequency.exponentialRampToValueAtTime(140, t + .08);
      bg.gain.setValueAtTime(.22 * v, t); bg.gain.exponentialRampToValueAtTime(.0001, t + .1);
      b.connect(bg).connect(bus.snare); b.start(t); b.stop(t + .12);
    }
    function hat(t, v, open) {
      const n = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 7200;
      g.gain.setValueAtTime(.16 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + (open ? .3 : .05));
      n.connect(hp).connect(g).connect(bus.hats); n.start(t, Math.random() * .5); n.stop(t + .35);
    }
    function lead(n, t, dur) {
      const f = hz(n), a = ac.createOscillator(), b = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      a.type = 'square'; b.type = 'triangle'; a.frequency.value = f; b.frequency.value = f * 1.004;
      fl.type = 'lowpass'; fl.Q.value = 2; fl.frequency.setValueAtTime(3400, t); fl.frequency.exponentialRampToValueAtTime(700, t + .35);
      const ag = ac.createGain(); ag.gain.value = .35; a.connect(ag).connect(fl); b.connect(fl);
      fl.connect(g).connect(bus.lead); env(g, t, .075, .008, .25, .45, .12, t + dur);
      [a, b].forEach(o => { o.start(t); o.stop(t + dur + .8); });
    }
    function arp(n, t) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz(n);
      g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
      o.connect(g).connect(bus.arp); o.start(t); o.stop(t + .22);
    }
    function pad(ci, t, dur) {
      const fl = ac.createBiquadFilter(), g = ac.createGain(); fl.type = 'lowpass'; fl.frequency.value = 950;
      fl.connect(g).connect(bus.pad); env(g, t, .03, .9, 2, 1, .5, t + dur);
      CHORDS[ci].slice(0, 4).forEach(n => [-8, 8].forEach(dt => {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = dt;
        o.connect(fl); o.start(t); o.stop(t + dur + 2);
      }));
    }

    function schedule(s, t) {
      const i = s % 16, bar = Math.floor(s / 16) % 4;
      if (i % 2 === 1) t += STEP * SWING;
      if (i === 0) { chord(bar, t, 1, STEP * 7); pad(bar, t, STEP * 16); }
      if (i === 10) chord(bar, t, .5, STEP * 4);
      for (const [st, iv, l] of BASS) if (st === i) bass(ROOTS[bar] + iv, t, STEP * l);
      if (i === 0 || i === 10 || (i === 7 && bar % 2 === 1)) kick(t, i === 0 ? 1 : .78);
      if (i === 4 || i === 12) snare(t, i === 12 ? 1 : .9);
      if (i % 2 === 0) hat(t, (i % 4 === 0 ? .9 : .55) * (.8 + Math.random() * .4), false);
      else if (Math.random() < .22) hat(t, .3, false);
      if (i === 14 && bar === 3) hat(t, .7, true);
      if (MELODY[bar][i] >= 0) lead(MELODY[bar][i], t, STEP * 2);
      if (i % 2 === 0) { const c = CHORDS[bar]; arp(c[(i / 2) % c.length] + 12, t); }
    }
    function tick() { while (next < ac.currentTime + .15) { schedule(step, next); next += STEP; step++; } }
    function applyMix(tc) {
      const m = MIX[scene], now = ac.currentTime;
      for (const k of Object.keys(LEVEL)) bus[k].gain.setTargetAtTime(m[k] * LEVEL[k], now, tc);
      lp.frequency.setTargetAtTime(m.cut, now, 1.1);
    }

    /* Stereo hall impulse: a few early reflections, then a diffuse tail that
       loses its highs as it decays, the way a real room does. */
    function makeHall(sec, bright) {
      const sr = ac.sampleRate, len = Math.floor(sr * sec), ir = ac.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch); let z = 0;
        for (let i = 0; i < len; i++) {
          const t = i / sr, k = bright * Math.exp(-t * 1.6) + .03;
          z += k * ((Math.random() * 2 - 1) - z);
          d[i] = z / Math.sqrt(k / (2 - k)) * Math.exp(-t * 6.9 / sec) * Math.min(1, t / .015);
        }
        (ch ? [.011, .019, .029, .041, .057] : [.007, .017, .023, .037, .049])
          .forEach((tt, j) => { d[Math.floor(tt * sr)] += (j % 2 ? -.5 : .5) * Math.exp(-j * .3); });
      }
      return ir;
    }

    /* ---------- track mode ----------
       If the file named in #sound's data-track exists, it replaces the synth and
       plays through a DJ-style chain: hall reverb on a pre-delayed send (lows kept
       dry so the kick stays tight), dotted-eighth ping-pong echo, glue compression,
       a limiter, and filter moves per section. Starting sweeps the filter open;
       stopping echoes out instead of cutting dead. */
    const soundEl = document.getElementById('sound');
    const TRACK = soundEl && soundEl.dataset.track, TBPM = +(soundEl && soundEl.dataset.bpm) || 120;
    // per section: [low-pass Hz, high-pass Hz, reverb send, echo send]
    const DJ = [
      [9000, 20, .30, .10],   // hero: slightly closed
      [20000, 20, .22, .08],  // about: fully open
      [2200, 20, .55, .26],   // location: breakdown, washed out
      [20000, 20, .22, .10],  // experience: back in
      [12000, 20, .26, .10],  // evaluator
      [20000, 20, .20, .12],  // work
      [5200, 20, .45, .20],   // design: dreamy
      [20000, 160, .30, .14], // skills: thinned out, building
      [3400, 20, .60, .30]    // contact: outro wash
    ];
    let trackOK = false, el = null, tf = null, an, abuf, lowAvg = 0, pulse = 0, lastT = 0, pauseT = 0;
    if (TRACK) fetch(TRACK, { method: 'HEAD' })
      .then(r => { trackOK = r.ok && !/html/.test(r.headers.get('content-type') || ''); })
      .catch(() => {});

    const biq = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
    const glide = (p, v, tc, at) => {
      const now = ac.currentTime;
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); }
      p.setTargetAtTime(v, at || now, tc);
    };
    function initTrack() {
      el = new Audio(TRACK); el.loop = true; el.preload = 'auto';
      const src = ac.createMediaElementSource(el);
      const hp0 = biq('highpass', 28), hpf = biq('highpass', 20, .7), lpf = biq('lowpass', 20000, .9);
      const feed = ac.createGain(), dry = ac.createGain(), sum = ac.createGain();
      src.connect(hp0).connect(hpf).connect(lpf).connect(feed);
      feed.connect(dry).connect(sum);
      // reverb send
      const rs = ac.createGain(), pre = ac.createDelay(.2), hall = ac.createConvolver();
      pre.delayTime.value = .032; hall.buffer = makeHall(3.6, .36);
      feed.connect(rs).connect(biq('highpass', 260)).connect(biq('lowpass', 6500)).connect(pre).connect(hall).connect(sum);
      // ping-pong echo, band-limited so the repeats sit behind the track
      const es = ac.createGain(), dl = ac.createDelay(2), dr = ac.createDelay(2), fb = ac.createGain(), mg = ac.createChannelMerger(2), ew = ac.createGain(), e2h = ac.createGain();
      dl.delayTime.value = dr.delayTime.value = 60 / TBPM * .75; fb.gain.value = .38; ew.gain.value = .55; e2h.gain.value = .35;
      feed.connect(es).connect(biq('bandpass', 1400, .6)).connect(dl);
      dl.connect(dr); dr.connect(fb).connect(dl);
      dl.connect(mg, 0, 0); dr.connect(mg, 0, 1);
      mg.connect(ew).connect(sum); mg.connect(e2h).connect(pre);
      // bus: glue compression into a limiter
      const glue = ac.createDynamicsCompressor(), lim = ac.createDynamicsCompressor(), tout = ac.createGain();
      glue.threshold.value = -18; glue.knee.value = 8; glue.ratio.value = 2.5; glue.attack.value = .012; glue.release.value = .25;
      lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .08;
      tout.gain.value = 0;
      sum.connect(glue).connect(lim).connect(tout).connect(dest());
      // low-band analyser drives the visual pulse
      an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .2; hp0.connect(an);
      abuf = new Uint8Array(an.frequencyBinCount);
      tf = { lpf, hpf, feed, dry, rs, es, fb, tout };
    }
    function djMix(tc) {
      const [cut, hp, wet, echo] = DJ[clamp(scene, 0, DJ.length - 1)];
      glide(tf.lpf.frequency, cut, tc); glide(tf.hpf.frequency, hp, tc);
      glide(tf.rs.gain, wet, tc); glide(tf.es.gain, echo, tc); glide(tf.dry.gain, 1 - wet * .35, tc);
    }
    function trackToggle() {
      const now = ac.currentTime;
      if (on) {
        clearTimeout(pauseT); el.play().catch(() => {});
        glide(tf.feed.gain, 1, .03); glide(tf.fb.gain, .38, .2); djMix(.3);
        // intro: start filtered and sweep open over ~4 s
        tf.lpf.frequency.cancelScheduledValues(now); tf.lpf.frequency.setValueAtTime(320, now);
        tf.lpf.frequency.exponentialRampToValueAtTime(DJ[scene][0], now + 4);
        glide(tf.tout.gain, .8, .5);
      } else {
        // echo out: push the echo, drop the track under it, let the tails ring
        glide(tf.es.gain, .7, .04); glide(tf.fb.gain, .56, .04);
        glide(tf.feed.gain, 0, .08, now + .18);
        glide(tf.tout.gain, 0, 1.1, now + .5);
        pauseT = setTimeout(() => { if (!on) el.pause(); }, 6000);
      }
    }
    function trackEnergy() {
      an.getByteFrequencyData(abuf);
      const bin = ac.sampleRate / an.fftSize, a = Math.max(1, Math.floor(40 / bin)), b = Math.ceil(150 / bin);
      let s = 0; for (let i = a; i <= b; i++) s += abuf[i];
      const low = s / (b - a + 1) / 255, t = performance.now(), dt = clamp((t - lastT) / 1000, .001, .1); lastT = t;
      lowAvg += (low - lowAvg) * Math.min(1, dt * 2.5);
      pulse = Math.max(clamp((low - lowAvg * 1.08) * 6, 0, 1), pulse * Math.exp(-dt / .17));
      return clamp(pulse * tf.tout.gain.value / .8, 0, 1);
    }

    return {
      toggle() {
        if (!ac) init();
        on = !on;
        if (on) ac.resume();
        if (on && !el && trackOK) initTrack();
        if (el) { trackToggle(); return on; }
        const now = ac.currentTime;
        if (on) {
          ac.resume();
          if (!timer) { step = 0; next = now + .1; timer = setInterval(tick, 25); }
          applyMix(.2); out.gain.cancelScheduledValues(now); out.gain.setTargetAtTime(.55, now, .4);
        } else {
          out.gain.cancelScheduledValues(now); out.gain.setTargetAtTime(0, now, .25);
          setTimeout(() => { if (!on) { clearInterval(timer); timer = 0; } }, 1200);
        }
        return on;
      },
      hush(v, sec = 1.5) { // 0..1, for story mode: the forest has its own song
        hushTo = v;
        if (master) master.gain.setTargetAtTime(v, ac.currentTime, sec / 3);
      },
      setScene(i) {
        i = clamp(i, 0, MIX.length - 1); if (i === scene) return; scene = i;
        if (el) { if (on) djMix(1.2); } else if (ac) applyMix(.9);
      },
      energy() { // 0..1 envelope that jumps on each kick and decays over ~0.2 s
        if (!ac || !on) return 0;
        if (el) return trackEnergy();
        const now = ac.currentTime - (ac.outputLatency || ac.baseLatency || 0);
        let e = 0;
        for (let k = kicks.length - 2; k >= 0; k -= 2) {
          const dt = now - kicks[k];
          if (dt >= 0) { e = kicks[k + 1] * Math.exp(-dt / .17); break; }
        }
        return clamp(e * (out.gain.value / .55), 0, 1);
      }
    };
  })();

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    const on = audio.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    $('.sound__label', soundBtn).textContent = on ? 'Sound on' : 'Sound off';
    document.dispatchEvent(new CustomEvent('ps:sound', { detail: on })); // the forest's own sound (forestsound.js) follows this button
  });

  /* ---------- bridge used by features.js ---------- */
  Object.assign(PS, {
    audio, computeAnchors,
    scrollToId: id => { const el = id === 'top' ? null : document.getElementById(id); PS.scrollToY(el ? el.offsetTop : 0); },
    audioScene: i => audio.setScene(i),
    refreshScene: () => onScroll(),
    toggleSound: () => soundBtn.click(),
    soundOn: () => soundBtn.getAttribute('aria-pressed') === 'true'
  });

  /* ---------- boot ---------- */
  computeAnchors();
  addEventListener('resize', computeAnchors);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('load', computeAnchors);
  smoothScroll();
  onScroll();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    startReveals();
    $$('.disintegrate').forEach(el => new Disintegrate(el));
    computeAnchors();
  });
})();

/* =====================================================================
   FX LAYER — interactive particle field · text disintegration on hover
   pixel cursor · inertial smooth scroll · hero scroll-out
   Pure canvas 2D, no dependencies.
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const PALETTE = ['#7cf5c2', '#f2c14e', '#ff6b9d', '#7aa2ff', '#ffffff'];

  const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, down: false };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  addEventListener('pointerdown', () => mouse.down = true);
  addEventListener('pointerup', () => mouse.down = false);

  /* ------------------------------------------------------------------
     1. PARTICLE FIELD  — a jittered grid of pixel squares that breathe,
        drift, and scatter away from the cursor, then spring home.
  ------------------------------------------------------------------ */
  const pc = $('#particles');
  if (pc) {
    const ctx = pc.getContext('2d');
    let W, H, dpr, pts = [], t0 = performance.now();
    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      pc.width = W * dpr; pc.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = W < 640 ? 34 : 26;
      pts = [];
      for (let y = gap / 2; y < H + gap; y += gap) {
        for (let x = gap / 2; x < W + gap; x += gap) {
          const hx = x + (Math.random() - .5) * gap * .6, hy = y + (Math.random() - .5) * gap * .6;
          pts.push({
            hx, hy, x: hx, y: hy, vx: 0, vy: 0,
            s: Math.random() < .1 ? 3 : 2,
            z: .3 + Math.random() * .7,
            ph: Math.random() * Math.PI * 2,
            c: Math.random() < .12 ? PALETTE[Math.floor(Math.random() * 4)] : '#9fb4c8'
          });
        }
      }
    };
    build(); addEventListener('resize', build);

    let heroFactor = 1; // 1 inside hero, fades to .35 once scrolled past
    const R = 150, R2 = R * R;
    function frame(now) {
      const t = (now - t0) / 1000;
      mouse.vx = mouse.x - mouse.px; mouse.vy = mouse.y - mouse.py;
      mouse.px = mouse.x; mouse.py = mouse.y;
      const speed = Math.min(40, Math.hypot(mouse.vx, mouse.vy));
      const push = 1 + speed / 12;
      ctx.clearRect(0, 0, W, H);
      const sy = scrollY * .12;
      for (const p of pts) {
        // breathing drift around home
        const hx = p.hx + Math.sin(t * .6 + p.ph) * 4 * p.z;
        const hy = p.hy + Math.cos(t * .5 + p.ph * 1.3) * 4 * p.z - (sy * p.z) % (H + 60);
        let hyw = hy; if (hyw < -30) hyw += H + 60;
        // mouse repulsion
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 2.4 * push * (mouse.down ? -1.2 : 1);
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        // spring home + damping
        p.vx += (hx - p.x) * .045; p.vy += (hyw - p.y) * .045;
        p.vx *= .86; p.vy *= .86;
        p.x += p.vx; p.y += p.vy;
        const disp = Math.min(1, Math.hypot(p.x - hx, p.y - hyw) / 40);
        const a = (.12 + p.z * .22 + disp * .55) * heroFactor;
        ctx.globalAlpha = a;
        ctx.fillStyle = disp > .25 ? PALETTE[0] : p.c;
        const s = p.s + disp * 2;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
    else { for (const p of pts) { ctx.globalAlpha = .25; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); } }

    addEventListener('scroll', () => {
      const p = Math.min(1, scrollY / innerHeight);
      heroFactor = 1 - p * .65;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     2. DISINTEGRATE — on hover, text is sampled to pixels, hidden, and
        its pixels scatter; on leave they fly back and the text returns.
  ------------------------------------------------------------------ */
  class Disintegrate {
    constructor(el) {
      this.el = el; this.pad = 60; this.parts = []; this.phase = 'idle'; this.raf = 0;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'dis-canvas';
      this.ctx = this.canvas.getContext('2d');
      el.classList.add('dis-host'); el.appendChild(this.canvas);
      el.addEventListener('pointerenter', () => this.enter());
      el.addEventListener('pointerleave', () => this.leave());
    }
    sample() {
      const r = this.el.getBoundingClientRect(); const cs = getComputedStyle(this.el);
      const fs = parseFloat(cs.fontSize);
      const W = Math.ceil(r.width) + this.pad * 2, H = Math.ceil(r.height) + this.pad * 2;
      this.canvas.width = W; this.canvas.height = H;
      this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
      this.canvas.style.left = -this.pad + 'px'; this.canvas.style.top = -this.pad + 'px';
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d');
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      if ('letterSpacing' in o) o.letterSpacing = cs.letterSpacing;
      o.textBaseline = 'middle';
      const txt = this.el.dataset.text || this.el.textContent.trim();
      const align = cs.textAlign === 'center' ? 'center' : 'left';
      o.textAlign = align;
      const x = align === 'center' ? W / 2 : this.pad + parseFloat(cs.paddingLeft);
      o.fillStyle = '#fff'; o.fillText(txt, x, H / 2);
      const data = o.getImageData(0, 0, W, H).data;
      const step = Math.max(2, Math.round(fs / 13));
      const useGrad = this.el.classList.contains('hero__name');
      this.parts = [];
      for (let y = 0; y < H; y += step) for (let xx = 0; xx < W; xx += step) {
        if (data[(y * W + xx) * 4 + 3] > 120) {
          const c = useGrad ? (Math.random() < .5 ? '#ffffff' : PALETTE[0]) : (this.el.dataset.color || cs.color);
          this.parts.push({ hx: xx, hy: y, x: xx, y, vx: 0, vy: 0, c, s: step * .9, a: 1 });
        }
      }
      this.step = step;
    }
    enter() {
      if (reduceMotion || !finePointer) return;
      if (this.phase === 'idle') this.sample();
      this.phase = 'out'; this.el.classList.add('dis-active');
      const r = this.canvas.getBoundingClientRect();
      const mx = mouse.x - r.left, my = mouse.y - r.top;
      for (const p of this.parts) {
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy) || 1;
        const f = 2 + 180 / (d + 30);
        p.vx = (dx / d) * f + (Math.random() - .5) * 3; p.vy = (dy / d) * f - 2 + (Math.random() - .5) * 3;
      }
      this.run();
    }
    leave() { if (this.phase === 'idle') return; this.phase = 'in'; this.run(); }
    run() {
      if (this.raf) return;
      const tick = () => {
        const { ctx, canvas } = this; ctx.clearRect(0, 0, canvas.width, canvas.height);
        let settled = 0;
        for (const p of this.parts) {
          if (this.phase === 'out') {
            p.vx *= .93; p.vy *= .93; p.vy -= .04;  // float upward, like embers
            p.vx += (Math.random() - .5) * .3;
            p.a = Math.max(.15, p.a - .006);
          } else {
            p.vx += (p.hx - p.x) * .16; p.vy += (p.hy - p.y) * .16;
            p.vx *= .66; p.vy *= .66; p.a = Math.min(1, p.a + .05);
            if (Math.abs(p.hx - p.x) < .5 && Math.abs(p.hy - p.y) < .5) settled++;
          }
          p.x += p.vx; p.y += p.vy;
          ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        }
        ctx.globalAlpha = 1;
        if (this.phase === 'in' && settled > this.parts.length * .97) {
          this.phase = 'idle'; this.el.classList.remove('dis-active');
          ctx.clearRect(0, 0, canvas.width, canvas.height); this.raf = 0; return;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }
  $$('.disintegrate').forEach(el => new Disintegrate(el));

  /* ------------------------------------------------------------------
     3. PIXEL CURSOR — a crisp square that snaps, with a lagging frame
        that grows over interactive elements.
  ------------------------------------------------------------------ */
  const cur = $('#cursor');
  if (cur && finePointer && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const dot = $('.cursor__dot', cur), box = $('.cursor__box', cur);
    let bx = 0, by = 0, hover = false;
    const interactive = 'a, button, .slots li, .card, .trophy, .quest__card, .shot, .disintegrate';
    addEventListener('pointerover', e => { hover = !!e.target.closest(interactive); cur.classList.toggle('is-hover', hover); });
    addEventListener('pointerdown', () => cur.classList.add('is-down'));
    addEventListener('pointerup', () => cur.classList.remove('is-down'));
    (function loop() {
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      bx += (mouse.x - bx) * .18; by += (mouse.y - by) * .18;
      box.style.transform = `translate(${bx}px, ${by}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------
     4. MAGNETIC BUTTONS — nudge toward the cursor.
  ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = `translate(${dx * 10}px, ${dy * 10}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     5. INERTIAL SMOOTH SCROLL — wheel input is eased, so the hero gives
        way to the content with weight instead of a hard jump.
  ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    document.documentElement.classList.add('smooth');
    let target = scrollY, current = scrollY, ticking = false, mine = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const loop = () => {
      current += (target - current) * .095;
      if (Math.abs(target - current) < .4) { current = target; ticking = false; }
      mine = true; scrollTo(0, Math.round(current)); mine = false;
      if (ticking) requestAnimationFrame(loop);
    };
    const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    addEventListener('wheel', e => {
      if (e.ctrlKey) return;                      // pinch-zoom
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      target = Math.max(0, Math.min(max(), target + dy));
      kick();
    }, { passive: false });
    addEventListener('scroll', () => { if (!mine && !ticking) { target = current = scrollY; } }, { passive: true });
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1); const el = id && document.getElementById(id);
      if (!el) return; e.preventDefault();
      target = Math.max(0, Math.min(max(), el.offsetTop - 64)); kick();
      history.replaceState(null, '', '#' + id);
    }));
  }

  /* ------------------------------------------------------------------
     6. HERO SCROLL-OUT — the title screen recedes as you scroll.
  ------------------------------------------------------------------ */
  const heroInner = $('.hero__inner'), heroCue = $('.hero__scroll');
  if (heroInner && !reduceMotion) {
    addEventListener('scroll', () => {
      const p = Math.min(1, scrollY / (innerHeight * .8));
      heroInner.style.opacity = String(1 - p * 1.1);
      heroInner.style.transform = `translateY(${p * -60}px) scale(${1 - p * .06})`;
      heroInner.style.filter = `blur(${p * 6}px)`;
      if (heroCue) heroCue.style.opacity = String(1 - p * 3);
    }, { passive: true });
  }
})();

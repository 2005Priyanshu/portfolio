/* =====================================================================
   3D SCENES (Spline)
   Each <div class="spline" data-spline="…/scene.splinecode"> loads its scene
   when it scrolls near the screen. With an empty data-spline the slot stays
   hidden, so the page looks the same until you add a scene.
   ===================================================================== */
(() => {
  const VIEWER = 'https://unpkg.com/@splinetool/viewer@2.0.82/build/spline-viewer.js';
  const slots = [...document.querySelectorAll('.spline[data-spline]')].filter(s => s.dataset.spline.trim());
  if (!slots.length) return;
  // reduced motion or data saver: keep the lighter particle scene instead
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData)) return;

  let script = null;
  const loadViewer = () => {
    if (script) return;
    script = document.createElement('script');
    script.type = 'module'; script.src = VIEWER;
    document.head.appendChild(script);
  };

  // a hidden slot never intersects, so watch the section around it
  const owner = new Map(slots.map(s => [s.closest('section') || s.parentElement, s]));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const slot = owner.get(e.target); io.unobserve(e.target); loadViewer();
    const v = document.createElement('spline-viewer');
    v.setAttribute('url', slot.dataset.spline.trim());
    v.setAttribute('loading-anim-type', 'none');
    let done = false;
    const ready = () => {
      if (done) return; done = true;
      slot.classList.add('is-ready');
    };
    v.addEventListener('load-complete', ready);
    v.addEventListener('load', ready);
    slot.appendChild(v); slot.classList.add('is-on');
  }), { rootMargin: '600px 0px' });

  owner.forEach((_, el) => io.observe(el));
})();

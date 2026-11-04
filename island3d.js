/* =====================================================================
   3D ISLAND (Design section)
   A small floating piece of the page's forest: pines, a cabin with a lit
   window, a pond and fireflies. Built with Three.js, loaded only when the
   section comes near. It follows the sky's time of day, tilts toward the
   cursor, can be dragged to spin, and its fireflies pulse with the music.
   If a Spline scene URL is set on the .spline slot, that is used instead.
   ===================================================================== */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const slot = document.querySelector('.obj3d');
const spline = document.querySelector('.design .spline[data-spline]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

if (slot && !(spline && spline.dataset.spline.trim()) && webglOK()) {
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    import(THREE_URL).then(build).catch(() => {});
  }, { rootMargin: '800px 0px' });
  io.observe(slot.closest('section') || slot.parentElement);
}

function webglOK() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

function build(THREE) {
  const canvas = slot.querySelector('canvas');
  slot.classList.add('is-on');

  /* ---------- renderer, scene, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  camera.position.set(0, 3.3, 7.3);
  camera.lookAt(0, -.62, 0);

  /* ---------- helpers ---------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: 0, flatShading: true, ...o });
  const mesh = (geo, m, shadow = true) => { const x = new THREE.Mesh(geo, m); x.castShadow = shadow; x.receiveShadow = true; return x; };
  const jitter = (geo, amt, keepTop) => { // roughen a geometry's vertices for a hand-cut, low-poly look
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(k)) seen.set(k, [(rnd() - .5) * amt, (rnd() - .5) * amt, (rnd() - .5) * amt]);
      const d = seen.get(k);
      if (keepTop && p.getY(i) > keepTop) continue;
      p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.computeVertexNormals(); return geo;
  };

  const island = new THREE.Group();
  scene.add(island);

  /* ---------- the island: grass cap, soil band, rock underside ---------- */
  const R = 1.6;
  const edge = a => 1 + .07 * Math.sin(3 * a + .4) + .045 * Math.sin(7 * a + 1.3); // wobbly outline
  const shaped = (geo) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), f = edge(Math.atan2(z, x)); p.setX(i, x * f); p.setZ(i, z * f); }
    geo.computeVertexNormals(); return geo;
  };
  const grass = mesh(shaped(new THREE.CylinderGeometry(R, R * .98, .14, 40, 1)), mat('#55805f'), false);
  grass.position.y = .07;
  const soil = mesh(shaped(new THREE.CylinderGeometry(R * .97, R * .86, .34, 40, 2)), mat('#634d42'), false);
  soil.position.y = -.17;
  const rockGeo = shaped(jitter(new THREE.ConeGeometry(R * .86, 2.1, 16, 5), .16, -.01));
  rockGeo.rotateX(Math.PI);
  const rock = mesh(rockGeo, mat('#5a5664'), false);
  rock.position.y = -1.39;
  island.add(grass, soil, rock);
  // a few hanging rocks under the island
  for (let i = 0; i < 4; i++) {
    const g = jitter(new THREE.DodecahedronGeometry(.13 + rnd() * .1, 0), .05);
    const r = mesh(g, mat('#524e5c'));
    const a = i * 1.7 + .5;
    r.position.set(Math.cos(a) * (.9 + rnd() * .3), -1.0 - rnd() * .5, Math.sin(a) * (.9 + rnd() * .3));
    r.userData.bob = rnd() * Math.PI * 2;
    island.add(r);
  }

  /* ---------- pond ---------- */
  const pond = new THREE.Mesh(new THREE.CircleGeometry(.34, 24), new THREE.MeshStandardMaterial({ color: '#2a4466', roughness: .12, metalness: .4, emissive: '#2f4f80', emissiveIntensity: .7 }));
  pond.rotation.x = -Math.PI / 2; pond.scale.set(1.25, 1, 1); pond.position.set(.62, .145, .55); pond.receiveShadow = true;
  island.add(pond);
  // stepping stones from the cabin to the pond
  for (let i = 0; i < 4; i++) {
    const s = mesh(jitter(new THREE.DodecahedronGeometry(.07, 0), .02), mat('#8c8a93'), false);
    s.scale.y = .35; s.position.set(-.05 + i * .15, .15, .25 + i * .07); island.add(s);
  }

  /* ---------- cabin with a warm window ---------- */
  const cabin = new THREE.Group();
  const wood = mat('#8a6650'), roofM = mat('#3b3438');
  const body = mesh(new THREE.BoxGeometry(.46, .32, .38), wood); body.position.y = .16;
  const tri = new THREE.Shape(); tri.moveTo(-.29, 0); tri.lineTo(.29, 0); tri.lineTo(0, .25); tri.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: .46, bevelEnabled: false }); roofGeo.translate(0, 0, -.23);
  const roof = mesh(roofGeo, roofM); roof.position.y = .32;
  const chimney = mesh(new THREE.BoxGeometry(.07, .16, .07), roofM); chimney.position.set(.12, .5, -.06);
  const winMat = new THREE.MeshStandardMaterial({ color: '#2a2220', emissive: '#ffb057', emissiveIntensity: 0 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(.14, .11), winMat); win.position.set(.08, .19, .191);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(.09, .17), mat('#3d2c25')); door.position.set(-.11, .085, .191);
  const warm = new THREE.PointLight('#ffae5a', 0, 2.2, 1.6); warm.position.set(.08, .22, .45);
  cabin.add(body, roof, chimney, win, door, warm);
  cabin.position.set(-.35, .14, -.05); cabin.rotation.y = .5;
  island.add(cabin);

  /* ---------- pines ---------- */
  const PINE_GREENS = ['#2b5546', '#336150', '#3b6b57', '#28493f'];
  const spots = [];
  const clear = (x, z) => Math.hypot(x - .62, z - .55) > .55 && Math.hypot(x + .35, z + .05) > .58 && !(z > -.1 && Math.abs(x) < .75);
  for (let tries = 0; spots.length < 14 && tries < 600; tries++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (R * .86);
    const x = Math.cos(a) * r * edge(a), z = Math.sin(a) * r * edge(a);
    if (clear(x, z) && spots.every(s => Math.hypot(s[0] - x, s[1] - z) > .3)) spots.push([x, z]);
  }
  const trunkM = mat('#4b3a33');
  for (const [x, z] of spots) {
    const s = .75 + rnd() * .55, tree = new THREE.Group(), m = mat(PINE_GREENS[Math.floor(rnd() * PINE_GREENS.length)]);
    const trunk = mesh(new THREE.CylinderGeometry(.035, .05, .22, 6), trunkM); trunk.position.y = .11; tree.add(trunk);
    [[.3, .4, .26], [.24, .34, .46], [.16, .28, .64]].forEach(([r, h, y]) => {
      const c = mesh(new THREE.ConeGeometry(r, h, 7), m); c.position.y = y; c.rotation.y = rnd() * 3; tree.add(c);
    });
    tree.scale.setScalar(s); tree.position.set(x, .14, z); tree.rotation.y = rnd() * 6;
    island.add(tree);
  }

  /* ---------- fireflies ---------- */
  const FLY = 46, flyPos = new Float32Array(FLY * 3), flyCol = new Float32Array(FLY * 3), flies = [];
  for (let i = 0; i < FLY; i++) {
    const a = rnd() * Math.PI * 2, r = .4 + rnd() * 1.6;
    flies.push({ a, r, y: .2 + rnd() * 1.2, sp: (.15 + rnd() * .3) * (rnd() < .5 ? -1 : 1), ph: rnd() * 6.28, fl: 1.5 + rnd() * 2.5 });
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  flyGeo.setAttribute('color', new THREE.BufferAttribute(flyCol, 3));
  const sprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const flyPts = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: .2, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  island.add(flyPts);

  /* ---------- lights: sun or moon, sky fill, cool rim ---------- */
  const hemi = new THREE.HemisphereLight('#a9bde0', '#3c3d52', 1);
  const key = new THREE.DirectionalLight('#ffffff', 2);
  key.position.set(3.5, 5, 2.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -.0015; key.shadow.normalBias = .02;
  Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 1, far: 14 });
  const rim = new THREE.DirectionalLight('#8aa4ff', 1); rim.position.set(-3, 2.5, -4);
  scene.add(hemi, key, rim);

  const C = (h) => new THREE.Color(h);
  const DAY = { key: C('#fff0d8'), keyI: 2.6, hemiI: 1.15, sky: C('#bcd0ec'), rimI: .5 };
  const NIGHT = { key: C('#b4c3ff'), keyI: 1.9, hemiI: 1, sky: C('#7083b3'), rimI: 2 };
  const GOLD = C('#ffb27a');
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- size, input, loop ---------- */
  function resize() {
    const w = slot.clientWidth, h = slot.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 7.6 / Math.max(.7, w / h) : 7.6; // keep the island whole on tall slots
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(slot); resize();

  let mx = 0, my = 0, tx = 0, ty = 0, spin = 0, vel = .1, drag = null;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  if (finePointer) {
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, v: 0 }; canvas.setPointerCapture(e.pointerId); slot.classList.add('is-dragging'); });
    canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x) * .008; drag.x = e.clientX; spin += dx; drag.v = dx * 60; run(); });
    const end = () => { if (drag) { vel = drag.v || vel; drag = null; slot.classList.remove('is-dragging'); } };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  let visible = true, last = performance.now(), t = 0, dimmed = false, raf = 0;
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); run(); } }).observe(slot);

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;

    // light follows the sky: 0 = day, 1 = night, with a golden band at sunset
    const hour = window.__skyHour ?? 21;
    const n = smooth(16.5, 20, hour), gold = Math.max(0, 1 - Math.abs(hour - 17.8) / 1.4);
    key.color.copy(DAY.key).lerp(NIGHT.key, n).lerp(GOLD, gold * .6);
    key.intensity = DAY.keyI + (NIGHT.keyI - DAY.keyI) * n;
    hemi.intensity = DAY.hemiI + (NIGHT.hemiI - DAY.hemiI) * n;
    hemi.color.copy(DAY.sky).lerp(NIGHT.sky, n);
    rim.intensity = DAY.rimI + (NIGHT.rimI - DAY.rimI) * n;

    const beat = window.PS && PS.audio ? PS.audio.energy() : 0;
    const lamp = smooth(17.5, 19.5, hour);
    winMat.emissiveIntensity = lamp * (2.2 + Math.sin(t * 7.3) * .08 + Math.sin(t * 13.1) * .05);
    warm.intensity = lamp * 2.6;

    // fireflies wander and blink; they come out after dusk and brighten on the beat
    const flyOn = smooth(18, 20.5, hour);
    for (let i = 0; i < FLY; i++) {
      const f = flies[i], a = f.a + t * f.sp * .25;
      flyPos[i * 3] = Math.cos(a) * f.r; flyPos[i * 3 + 2] = Math.sin(a) * f.r;
      flyPos[i * 3 + 1] = f.y + Math.sin(t * .8 + f.ph) * .12;
      const b = 1.3 * flyOn * (.35 + .65 * Math.max(0, Math.sin(t * f.fl + f.ph))) * (1 + beat * .9);
      flyCol[i * 3] = 1 * b; flyCol[i * 3 + 1] = .87 * b; flyCol[i * 3 + 2] = .35 * b;
    }
    flyGeo.attributes.position.needsUpdate = true; flyGeo.attributes.color.needsUpdate = true;

    // float, slow turn with drag inertia, tilt toward the cursor
    if (!drag && !reduceMotion) { spin += vel * dt; vel += (.1 - vel) * Math.min(1, dt * 1.6); }
    tx += (my * .16 - tx) * Math.min(1, dt * 3); ty += (mx * .5 - ty) * Math.min(1, dt * 3);
    island.rotation.set(.06 + tx, spin + ty, 0);
    island.position.y = reduceMotion ? 0 : Math.sin(t * .9) * .07;
    island.scale.setScalar(1 + beat * .012);
    island.children.forEach(c => { if (c.userData.bob !== undefined) c.position.y += Math.sin(t * 1.3 + c.userData.bob) * .0006; });

    renderer.render(scene, camera);
    if (!dimmed) { dimmed = true; slot.classList.add('is-ready'); }
    if (!reduceMotion) run();
  }
  run();
}

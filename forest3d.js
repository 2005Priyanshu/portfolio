/* =====================================================================
   3D FOREST — the backdrop for the whole page
   Real 3D terrain covered in instanced pines and broadleaf trees, snowy
   ridges on the horizon, fog for depth, clouds, flocks of birds, your name
   standing in the valley as a title, light motes drifting past the camera,
   and a sky with a sun that moves as you scroll: late morning at the top of the page,
   sunset in the middle, moonlit night with stars and fireflies at the end.
   The camera glides forward over the canopy as you scroll.
   Time of day comes from landscape.js (window.__skyHour), which also keeps
   drawing the old 2D forest if WebGL is unavailable.
   ===================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
// Story mode (story.js): the sage's opening and the guides. Loaded first, because its trail and
// glades are carved into the land; the forest runs without it if it fails to load.
const story = await import('./story.js?v=20261104c').catch(e => { console.warn('Story mode disabled:', e); return null; });

const canvas = document.getElementById('world');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = matchMedia('(max-width: 900px), (pointer: coarse)').matches;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const deg = d => d * Math.PI / 180;

/* ---------- noise ---------- */
function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * noise(x * f + i * 17.3, y * f - i * 9.1); n += amp; amp *= .5; f *= 2.03; }
  return s / n;
}
function ridged(x, y) {
  let s = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < 5; i++) { let r = 1 - Math.abs(noise(x * f + i * 31.7, y * f + i * 12.9) * 2 - 1); s += amp * r * r; n += amp; amp *= .5; f *= 2.1; }
  return s / n;
}
let seed = 20261103;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- the land ----------
   Rolling forested hills along the camera's path, rising into snowy ridges
   on the horizon, with a low pass where the sun sets. */
const PATH_Z0 = 60, PATH_Z1 = -250;
const pathX = z => Math.sin(z / 95) * 16;
const SUNSET_AZ = deg(20);
let GLADES = [], TRAIL = null; // from story.js: open, level ground for each glade, and a trail along the path
function height(x, z) {
  let h = land(x, z);
  if (TRAIL && z < TRAIL.z0 && z > TRAIL.z1) {
    const d = Math.abs(x - pathX(z));
    if (d < 10) h = lerp(h, land(pathX(z), z), (1 - sstep(2.5, 10, d)) * .85);
  }
  for (const g of GLADES) {
    const d = Math.hypot(x - g.x, z - g.z);
    if (d < g.r * 1.9) h = lerp(h, g.y, 1 - sstep(g.r * .75, g.r * 1.9, d));
  }
  return h;
}
function land(x, z) {
  const h = (fbm(x / 170, z / 170) - .5) * 44 + (fbm(x / 46 + 5, z / 46 - 3, 3) - .5) * 8;
  let m = Math.max(sstep(-360, -660, z), sstep(380, 720, Math.abs(x)) * .9, sstep(200, 460, z) * .7);
  const az = Math.atan2(x, -(z + 100));
  m *= 1 - .72 * Math.exp(-(((az - SUNSET_AZ) / .22) ** 2)) * sstep(-300, -500, z);
  return h + m * (ridged(x / 220, z / 220) * 175 + 12);
}
const clearing = (x, z) => fbm(x / 85 + 40, z / 85 - 20, 3);

/* ---------- time of day ---------- */
const hexC = h => new THREE.Color(h);
const PAL = {
  night:  { top: '#02040b', mid: '#08101f', hor: '#151f35', sun: '#000000', sunI: 0,   hs: '#3a5288', hg: '#0a0c12', hI: .75,  fog: .0028, night: 1, cloud: '#28324c', cloudA: 0.45 },
  dawn:   { top: '#22325a', mid: '#6b6788', hor: '#e2a07c', sun: '#ffb07a', sunI: 1.6, hs: '#9aa4c8', hg: '#2a241f', hI: .7,  fog: .0025, night: .15, cloud: '#f0c2ae', cloudA: 0.8 },
  day:    { top: '#1f5cab', mid: '#69a6e0', hor: '#cfe0ec', sun: '#fff1da', sunI: 3.2, hs: '#c4dbf5', hg: '#36402a', hI: 1.1, fog: .00115, night: 0, cloud: '#ffffff', cloudA: 0.92 },
  golden: { top: '#3e5f98', mid: '#d6a27f', hor: '#ffc07a', sun: '#ffbd6a', sunI: 2.6, hs: '#d2bcae', hg: '#30281f', hI: .85, fog: .0016, night: 0, cloud: '#ffd6ae', cloudA: 0.9 },
  dusk:   { top: '#11173a', mid: '#4a3a62', hor: '#d46a50', sun: '#ff6a3a', sunI: 1,   hs: '#6a5a80', hg: '#16131a', hI: .55, fog: .0025, night: .35, cloud: '#e3968a', cloudA: 0.78 }
};
for (const p of Object.values(PAL)) for (const k of ['top', 'mid', 'hor', 'sun', 'hs', 'hg', 'cloud']) p[k] = hexC(p[k]);
const KEYS = [[0, 'night'], [4.8, 'night'], [6.2, 'dawn'], [8.5, 'day'], [14.6, 'day'], [16.7, 'golden'], [18.2, 'dusk'], [19.6, 'night'], [24, 'night']];
const pal = { top: new THREE.Color(), mid: new THREE.Color(), hor: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), cloud: new THREE.Color() };
function paletteAt(h) {
  let k = 0;
  while (k < KEYS.length - 2 && KEYS[k + 1][0] <= h) k++;
  const A = PAL[KEYS[k][1]], B = PAL[KEYS[k + 1][1]], t = sstep(0, 1, (h - KEYS[k][0]) / (KEYS[k + 1][0] - KEYS[k][0]));
  for (const c of ['top', 'mid', 'hor', 'sun', 'hs', 'hg', 'cloud']) pal[c].lerpColors(A[c], B[c], t);
  for (const n of ['sunI', 'hI', 'fog', 'night', 'cloudA']) pal[n] = lerp(A[n], B[n], t);
  return pal;
}
// The sun rises on the left, crosses the upper sky and sets ahead, a little right of centre.
function sunDirAt(h, v) {
  const t = (h - 6) / 11.6; // sets around 17:40, so it is behind the ridge by the Experience section
  const el = t >= 0 && t <= 1 ? Math.sin(t * Math.PI) * deg(15.5) : -deg(12) * Math.min(1, (t < 0 ? -t : t - 1) * 6);
  const az = lerp(deg(-30), SUNSET_AZ, clamp(t, 0, 1));
  return v.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}
const MOON_DIR = new THREE.Vector3(Math.sin(deg(30)) * Math.cos(deg(14)), Math.sin(deg(14)), -Math.cos(deg(30)) * Math.cos(deg(14)));

function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } }
if (canvas && webgl2()) {
  try { start(); } catch (e) { console.warn('3D forest disabled:', e); document.documentElement.classList.remove('story-boot', 'story-on'); }
} else document.documentElement.classList.remove('story-boot');

function start() {
  /* ---------- story: where the trail and glades go ---------- */
  let plan = null;
  try {
    plan = story && story.planStory({ Z0: PATH_Z0, Z1: PATH_Z1, pathX });
    if (plan) { TRAIL = plan.trail; for (const g of plan.glades) g.y = height(g.x, g.z); GLADES = plan.glades; }
  } catch (e) { console.warn('Story mode disabled:', e); plan = null; }
  if (!plan) document.documentElement.classList.remove('story-boot');

  /* ---------- renderer, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, .002);
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 6000);
  camera.rotation.order = 'YXZ';

  /* ---------- sky dome: gradient, sun glow and disc ---------- */
  const skyU = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunI: { value: 1 }
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: `varying vec3 vDir;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vDir = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uTop, uMid, uHor, uSun, uSunDir; uniform float uSunI; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(-.02, .24, y));
        c = mix(c, uTop, smoothstep(.2, .8, y));
        float s = max(dot(d, normalize(uSunDir)), 0.);
        float up = smoothstep(-.12, .02, uSunDir.y), k = uSunI / 3.;
        c += uSun * (pow(s, 5.) * .16 + pow(s, 48.) * .32) * up * k; // glow
        c += uSun * pow(s, 2.) * (1. - smoothstep(0., .32, y)) * .3 * up * k;     // warm horizon on the sun's side
        c += uSun * smoothstep(.99955, .99968, s) * mix(2.5, 12., smoothstep(0., .22, uSunDir.y)) * smoothstep(-.03, .01, uSunDir.y) * step(.01, uSunI); // disc, orange when low
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  /* ---------- stars and moon ---------- */
  const STARS = lite ? 900 : 1800, sp = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = rnd() * Math.PI * 2, el = Math.asin(.04 + rnd() * .96), r = 3800;
    sp.set([Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r], i * 3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: '#ffffff', transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false;
  const moonTex = (() => { // pale disc with soft grey maria
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#eef1f8'; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 256, y = 20 + rnd() * 88, r = 6 + rnd() * 22, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(150,158,176,${.25 + rnd() * .3})`); gr.addColorStop(1, 'rgba(150,158,176,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const moonMat = new THREE.MeshBasicMaterial({ map: moonTex, fog: false, transparent: true, opacity: 0 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(42, 24, 12), moonMat);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#8fa6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moonGlow.scale.setScalar(620);
  const celestial = new THREE.Group(); celestial.add(stars, moon, moonGlow);
  moon.position.copy(MOON_DIR).multiplyScalar(3500); moonGlow.position.copy(moon.position);
  scene.add(celestial);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight();
  const light = new THREE.DirectionalLight();
  light.castShadow = !lite;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 900 });
  light.shadow.bias = -.0004; light.shadow.normalBias = .5;
  scene.add(hemi, light, light.target);

  /* ---------- terrain ---------- */
  const SIZE = 2600, SEG = lite ? 190 : 300;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -250);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, height(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  const tn = tg.attributes.normal, tcol = new Float32Array(tp.count * 3), c = new THREE.Color();
  const FLOOR = hexC('#1b2818'), FLOOR2 = hexC('#2a3a21'), MEADOW = hexC('#5d7339'), ROCK = hexC('#5f5b56'), SNOW = hexC('#eef2f6');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), slope = 1 - tn.getY(i);
    c.copy(FLOOR).lerp(FLOOR2, fbm(x / 30, z / 30, 2));
    c.lerp(MEADOW, sstep(.6, .68, clearing(x, z)) * (1 - sstep(25, 45, y)));
    c.lerp(ROCK, Math.max(sstep(.22, .45, slope), sstep(45, 90, y)));
    c.lerp(SNOW, sstep(118, 150, y + (noise(x / 40, z / 40) - .5) * 40) * (1 - sstep(.5, .72, slope)));
    tcol.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 }));
  terrain.receiveShadow = true;
  scene.add(terrain);
  // height of the terrain mesh itself (its triangles), so things stand exactly on the visible ground
  const STEP = SIZE / SEG, tpa = tp.array, ROW = SEG + 1;
  function groundAt(x, z) {
    const gx = clamp((x + SIZE / 2) / STEP, 0, SEG - 1e-4), gz = clamp((z + 250 + SIZE / 2) / STEP, 0, SEG - 1e-4);
    const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz, Y = (i, j) => tpa[(j * ROW + i) * 3 + 1];
    const a = Y(ix, iz), b = Y(ix, iz + 1), c = Y(ix + 1, iz + 1), d = Y(ix + 1, iz);
    return u + v <= 1 ? a + (d - a) * u + (b - a) * v : c + (b - c) * (1 - u) + (d - c) * (1 - v);
  }

  /* ---------- tree geometry ---------- */
  const tmp = new THREE.Vector3();
  function finish(g, paint, fluff) { // indexed geometry -> smooth normals -> flat arrays with vertex colours
    if (g.index) { g.computeVertexNormals(); g = g.toNonIndexed(); }
    const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (fluff) { // foliage reads softer when normals point out from the tree's core
        tmp.set(x - fluff.x, (y - fluff.y) * .5 + .6, z - fluff.z).normalize();
        tmp.multiplyScalar(.65).add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)).multiplyScalar(.35)).normalize();
        n.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      paint(x, y, z, cc);
      col.set([cc.r, cc.g, cc.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  function merge(parts) {
    let n = 0; for (const g of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of parts) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  const BARK = hexC('#3b2a20'), BARK2 = hexC('#5a4a3c');
  const NEEDLE_D = hexC('#12261a'), NEEDLE_L = hexC('#3d6a42');
  const LEAF_D = hexC('#26421f'), LEAF_L = hexC('#6e9a48');

  function conifer(detail) {
    const parts = [], seg = detail ? 11 : 6, tiers = detail ? 6 : 3;
    const trunk = new THREE.CylinderGeometry(.14, .32, 3.2, detail ? 6 : 4, 1, true); trunk.translate(0, 1.6, 0);
    parts.push(finish(trunk, (x, y, z, o) => o.copy(BARK)));
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const r = lerp(2.9, .6, t), h = detail ? lerp(3.6, 2.3, t) : lerp(5.4, 3.6, t), y0 = detail ? 2.1 + t * 7.4 : 1.6 + t * 6.9;
      const g = new THREE.ConeGeometry(r, h, seg, 1, true);
      const p = g.attributes.position, seen = new Map();
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        if (y > 0) continue; // apex stays put
        const key = Math.round(x * 1e3) + ',' + Math.round(z * 1e3);
        if (!seen.has(key)) seen.set(key, [.74 + rnd() * .5, -(.15 + rnd() * .5)]); // ragged, drooping branch tips
        const [s, dy] = seen.get(key);
        p.setXYZ(k, x * s, y + dy, z * s);
      }
      g.rotateY(rnd() * 6.28);
      g.translate(0, y0 + h / 2, 0);
      const tint = rnd() * .08;
      parts.push(finish(g, (x, y, z, o) => {
        const f = clamp((y - y0) / h, 0, 1); // 0 at the outer rim of the tier, 1 at its tip
        o.copy(NEEDLE_D).lerp(NEEDLE_L, Math.pow(1 - f, 1.6) * .55 + t * .22 + tint);
      }, { x: 0, y: y0, z: 0 }));
    }
    return merge(parts);
  }
  function broadleaf(detail) {
    const parts = [];
    const trunk = new THREE.CylinderGeometry(.15, .3, 4.6, detail ? 6 : 4, 1, true); trunk.translate(0, 2.3, 0);
    parts.push(finish(trunk, (x, y, z, o) => o.copy(BARK2)));
    const blobs = detail
      ? [[0, 6.3, 0, 2.5], [1.4, 5.4, .5, 1.8], [-1.3, 5.6, -.4, 1.9], [.3, 7.6, -.6, 1.7], [-.4, 5, 1.3, 1.6]]
      : [[0, 6.1, 0, 2.7], [.6, 7.4, -.3, 1.9]];
    for (const [bx, by, bz, br] of blobs) {
      const g = new THREE.IcosahedronGeometry(br, detail ? 1 : 0);
      const p = g.attributes.position, seen = new Map();
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k), key = Math.round(x * 1e3) + ',' + Math.round(y * 1e3) + ',' + Math.round(z * 1e3);
        if (!seen.has(key)) seen.set(key, .8 + rnd() * .36);
        const s = seen.get(key); p.setXYZ(k, x * s, y * s, z * s);
      }
      g.translate(bx, by, bz);
      g.computeVertexNormals();
      parts.push(finish(g, (x, y, z, o) => {
        const up = clamp((y - (by - br)) / (2 * br), 0, 1);
        o.copy(LEAF_D).lerp(LEAF_L, up * .7 + rnd() * .12);
      }, { x: bx, y: by, z: bz }));
    }
    return merge(parts);
  }

  /* ---------- planting ---------- */
  const N = lite ? { nc: 1100, nb: 260, fc: 2600, fb: 500 } : { nc: 2600, nb: 650, fc: 6500, fb: 1300 };
  const lists = { nc: [], nb: [], fc: [], fb: [] };
  const pathDist = (x, z) => { const cz = clamp(z, PATH_Z1 - 60, PATH_Z0 + 40); return Math.hypot(x - pathX(cz), z - cz); };
  for (let tries = 0; tries < 260000; tries++) {
    const near = tries % 3 === 0;
    const x = near ? (rnd() - .5) * 360 : (rnd() - .5) * 1500;
    const z = near ? lerp(PATH_Z0 + 80, PATH_Z1 - 110, rnd()) : lerp(200, -1000, rnd());
    if (TRAIL && z < TRAIL.z0 + 10 && z > TRAIL.z1 - 10 && Math.abs(x - pathX(z)) < TRAIL.half) continue; // the trail
    if (GLADES.some(g => Math.hypot(x - g.x, z - g.z) < g.r + 3)) continue;                            // the glades
    const d = pathDist(x, z), isNear = d < 175;
    if (!near && isNear) continue;
    if (!isNear && rnd() > Math.exp(-(d - 175) / 380)) continue;  // thin out with distance
    const y = height(x, z);
    if (y > 58 + noise(x / 50, z / 50) * 20) continue;           // tree line
    const sl = Math.abs(height(x + 3, z) - y) + Math.abs(height(x, z + 3) - y);
    if (sl > 3.2) continue;                                      // too steep
    const cl = clearing(x, z);
    if (cl > .6 && rnd() < sstep(.6, .66, cl)) continue;         // meadows
    const broad = rnd() < (y < 0 ? .24 : .12);
    const key = (isNear ? 'n' : 'f') + (broad ? 'b' : 'c');
    if (lists[key].length >= N[key]) continue;
    const b = .78 + rnd() * .36;
    lists[key].push({ x, y: y - .4, z, s: broad ? .8 + rnd() * .45 : .72 + rnd() * .62, ry: rnd() * 6.28, tx: (rnd() - .5) * .06, tz: (rnd() - .5) * .06, b, r: 1 + (rnd() - .5) * .12, bl: 1 + (rnd() - .5) * .1 });
    if (Object.keys(N).every(k => lists[k].length >= N[k])) break;
  }

  const time = { value: 0 };
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0 });
  treeMat.onBeforeCompile = sh => { // wind: trees sway a little more toward their tops
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(0.);
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3].xyz;
      #endif
      float k = max(position.y - 2.5, 0.) * .017;
      float w = sin(uTime * 1.1 + ip.x * .045 + ip.z * .06) + .45 * sin(uTime * 2.7 + ip.x * .11 - ip.z * .07);
      transformed.x += w * k; transformed.z += w * k * .6;`);
  };
  const dummy = new THREE.Object3D();
  function plant(geo, list, cast) {
    const m = new THREE.InstancedMesh(geo, treeMat, list.length), cc = new THREE.Color();
    list.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(t.tx, t.ry, t.tz); dummy.scale.setScalar(t.s); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, cc.setRGB(t.b * t.r, t.b, t.b * t.bl));
    });
    m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false;
    scene.add(m);
  }
  plant(conifer(true), lists.nc, true);
  plant(broadleaf(true), lists.nb, true);
  plant(conifer(false), lists.fc, false);
  plant(broadleaf(false), lists.fb, false);

  /* ---------- birds ---------- */
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -.1, 0, .25, -1.25, .06, -.12, -.1, 0, -.2,   // left wing
    .1, 0, .25, .1, 0, -.2, 1.25, .06, -.12,      // right wing
    0, .04, .55, -.11, 0, -.28, .11, 0, -.28,     // body
    0, 0, -.22, -.2, 0, -.66, .2, 0, -.66         // tail
  ]), 3));
  const birdMat = new THREE.MeshBasicMaterial({ color: '#16181d', side: THREE.DoubleSide });
  birdMat.onBeforeCompile = sh => { // wing beats, with spells of gliding
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].y * .53;
      float flap = mix(.18, 1., smoothstep(-.3, .2, sin(uTime * .5 + ph)));
      float ax = max(abs(position.x) - .1, 0.);
      transformed.y += sin(uTime * 9. + ph) * ax * .62 * flap;`);
  };
  const FLOCKS = lite ? 2 : 3, PER = 11;
  const birds = new THREE.InstancedMesh(bg, birdMat, FLOCKS * PER);
  birds.frustumCulled = false; scene.add(birds);
  const flocks = Array.from({ length: FLOCKS }, (_, i) => ({
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), active: false, wait: 2 + i * 7, dist: 100,
    offs: Array.from({ length: PER }, (_, j) => new THREE.Vector3((rnd() - .5) * 18, (rnd() - .5) * 6, -Math.abs(j - PER / 2) * 2.2 + (rnd() - .5) * 4)),
    sizes: Array.from({ length: PER }, () => .85 + rnd() * .35)
  }));

  /* ---------- fireflies ---------- */
  const FLY = lite ? 350 : 800, fp = new Float32Array(FLY * 3), flies = [];
  for (let i = 0; i < FLY; i++) {
    const z = lerp(PATH_Z0 + 40, PATH_Z1 - 120, rnd()), x = pathX(z) + (rnd() - .5) * 220;
    flies.push({ x, z, y: height(x, z) + 1 + rnd() * 6, ph: rnd() * 6.28, sp: .3 + rnd() * .5 });
  }
  const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const flyMat = new THREE.PointsMaterial({ size: 1.5, map: glowTex, color: '#d9ff8c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireflies = new THREE.Points(flyGeo, flyMat); fireflies.frustumCulled = false; scene.add(fireflies);

  /* ---------- camera path ----------
     Precomputed so the camera clears the hills and trees smoothly. */
  const STEPS = 240, camY = new Float32Array(STEPS + 1);
  for (let i = 0; i <= STEPS; i++) {
    const z = lerp(PATH_Z0, PATH_Z1, i / STEPS), x = pathX(z);
    let g = -Infinity;
    for (const [dx, dz] of [[0, 0], [30, 0], [-30, 0], [0, -30], [0, -60], [0, 30]]) g = Math.max(g, height(x + dx, z + dz));
    camY[i] = g + lerp(30, 24, i / STEPS);
  }
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < STEPS; i++) camY[i] = Math.max(camY[i], (camY[i - 1] + camY[i] * 2 + camY[i + 1]) / 4);
  const camAt = (p, v) => {
    const f = clamp(p, 0, 1) * STEPS, i = Math.min(STEPS - 1, Math.floor(f)), z = lerp(PATH_Z0, PATH_Z1, p);
    return v.set(pathX(z), lerp(camY[i], camY[i + 1], f - i), z);
  };

  /* ---------- clouds ---------- */
  const cloudTex = [0, 1, 2].map(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    for (let i = 0; i < 36; i++) { // overlapping puffs, tallest in the middle
      const u = rnd(), x = 70 + u * 372 + (rnd() - .5) * 30, y = 165 - Math.sin(u * Math.PI) * (35 + rnd() * 55) + (rnd() - .5) * 22;
      const r = 26 + rnd() * 52 * (Math.sin(u * Math.PI) + .25), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-atop'; // shaded undersides
    const sh = g.createLinearGradient(0, 90, 0, 230); sh.addColorStop(0, 'rgba(118,128,150,0)'); sh.addColorStop(1, 'rgba(118,128,150,.6)');
    g.fillStyle = sh; g.fillRect(0, 0, 512, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  const clouds = Array.from({ length: lite ? 9 : 15 }, (_, i) => {
    const m = new THREE.SpriteMaterial({ map: cloudTex[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0 });
    const sp = new THREE.Sprite(m), w = 520 + rnd() * 700;
    sp.scale.set(w, w * .5, 1);
    sp.userData = { az: deg(-80 + rnd() * 160), el: deg(3 + rnd() * 7.5), d: 2300 + rnd() * 1100, v: deg(.12 + rnd() * .18) };
    celestial.add(sp); return sp;
  });

  /* ---------- your name, standing in the valley ---------- */
  const titleCanvas = document.createElement('canvas'); titleCanvas.width = 4096; titleCanvas.height = 512;
  const titleTex = new THREE.CanvasTexture(titleCanvas);
  titleTex.colorSpace = THREE.SRGBColorSpace; titleTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const TRACK = .045, FILL = .95;
  let titleTall = null;
  function drawTitle() { // one line on wide screens, two stacked lines on tall ones
    titleTall = camera.aspect < 1;
    const lines = titleTall ? ['PRIYANSHU', 'SINGH'] : ['PRIYANSHU SINGH'];
    const fam = getComputedStyle(document.body).fontFamily;
    let g = titleCanvas.getContext('2d'), size = 400;
    const width = txt => { g.font = `500 ${size}px ${fam}`; let w = 0; for (const ch of txt) w += g.measureText(ch).width + size * TRACK; return w - size * TRACK; };
    size *= 4096 * FILL / Math.max(...lines.map(width));
    const lead = size * 1.02;
    titleCanvas.height = Math.ceil(lead * lines.length + size * .4); // resizing also clears it
    g = titleCanvas.getContext('2d'); g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    lines.forEach((txt, i) => {
      let x = (4096 - width(txt)) / 2; const y = titleCanvas.height / 2 + (i - (lines.length - 1) / 2) * lead + size * .35;
      for (const ch of txt) { g.fillText(ch, x, y); x += g.measureText(ch).width + size * TRACK; }
    });
    titleTex.dispose(); titleTex.needsUpdate = true;
  }
  const titleMat = new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, depthWrite: false, opacity: 0 });
  titleMat.color.setScalar(1.5); // a touch brighter than white, so the valley haze doesn't grey it out
  const title = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), titleMat);
  scene.add(title);
  function placeTitle() { // a fixed spot in the valley, sized and placed for this screen
    const home = camAt(0, new THREE.Vector3()), d = 380, half = Math.tan(deg(camera.fov / 2)), tall = camera.aspect < 1;
    const pitch = tall ? deg(-7.5) : deg(-2.5), pxPerUnit = (innerHeight / 2) / (half * d);
    if (tall !== titleTall) drawTitle();
    const textPx = Math.min(innerWidth * (tall ? .86 : .74), 1200), w = textPx / pxPerUnit / FILL;
    const el = Math.atan((.5 - (tall ? .33 : .37)) * 2 * half) + pitch;
    title.scale.set(w, w * titleCanvas.height / 4096, 1);
    title.position.set(home.x, home.y + Math.tan(el) * d, home.z - d);
  }

  /* ---------- motes: sunlit pollen by day, fireflies by night, drifting past the camera ---------- */
  const MOTES = lite ? 90 : 170, mp = new Float32Array(MOTES * 3), mc = new Float32Array(MOTES * 3), motes = [];
  for (let i = 0; i < MOTES; i++) motes.push({ x: (rnd() - .5) * 80, y: (rnd() - .5) * 30, z: rnd() * 90, ph: rnd() * 6.28, sp: .2 + rnd() * .4, bl: 1.5 + rnd() * 3 });
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3)); moteGeo.setAttribute('color', new THREE.BufferAttribute(mc, 3));
  const moteMat = new THREE.PointsMaterial({ size: .22, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const moteField = new THREE.Points(moteGeo, moteMat); moteField.frustumCulled = false; scene.add(moteField);
  const POLLEN = new THREE.Color('#fff1d0'), FLY_C = new THREE.Color('#d6ff86'), mcol = new THREE.Color();

  if (document.fonts) document.fonts.ready.then(() => { drawTitle(); placeTitle(); });

  /* ---------- size, input ---------- */
  let maxScroll = 1;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? 70 : 55;
    camera.updateProjectionMatrix();
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    placeTitle();
  }
  resize();
  addEventListener('resize', resize);
  setInterval(() => { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); }, 1500);
  let mx = 0, my = 0, sx = 0, sy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  /* ---------- story mode ----------
     While a story scene plays, story.js poses the camera through rig and
     the page's own scroll camera (sPos, sQuat) waits underneath; rig.w blends them. */
  const rig = { w: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), focus: new THREE.Vector3(), hour: 8, hourW: 0 };
  const sPos = new THREE.Vector3(), sQuat = new THREE.Quaternion(), sEuler = new THREE.Euler(0, 0, 0, 'YXZ'), shadowAt = new THREE.Vector3();
  let director = null;
  if (plan) {
    try {
      director = story.startStory({
        THREE, scene, camera, renderer, lite, reduceMotion, groundAt, pathX, glowTex, time, rig, plan,
        scrollPose: (p, q) => { p.copy(sPos); q.copy(sQuat); }
      });
    } catch (e) { console.warn('Story mode disabled:', e); document.documentElement.classList.remove('story-boot'); }
  }

  /* ---------- loop ---------- */
  // the camera eases along its path (never in a straight line, which could cut through a hill)
  let pS = window.__progress ?? clamp(scrollY / maxScroll, 0, 1);
  const camPos = camAt(pS, new THREE.Vector3()), sunDir = new THREE.Vector3(), ldir = new THREE.Vector3();
  let last = performance.now(), t = 0, frames = 0, slowSum = 0, ready = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduceMotion) t += dt;
    time.value = t;

    const p = window.__progress ?? clamp(scrollY / maxScroll, 0, 1);
    pS = reduceMotion ? p : pS + (p - pS) * (1 - Math.exp(-dt * 3.2));
    camAt(pS, sPos);
    sx += (mx - sx) * Math.min(1, dt * 2); sy += (my - sy) * Math.min(1, dt * 2);
    sQuat.setFromEuler(sEuler.set((camera.aspect < 1 ? deg(-7.5) : deg(-2.5)) - sy * deg(2), -sx * deg(4), 0)); // look down more on portrait screens

    let hour = window.__skyHour ?? 10.6;
    if (rig.hourW > 0) hour = lerp(hour, rig.hour, rig.hourW);
    paletteAt(hour);
    sunDirAt(hour, sunDir);
    if (director) { try { director.update(dt, t, pal.night, hour); } catch (e) { console.warn('Story mode stopped:', e); director = null; rig.w = 0; rig.hourW = 0; document.documentElement.classList.remove('story-on', 'story-boot'); } }

    const w = rig.w;
    camPos.copy(sPos); camera.quaternion.copy(sQuat);
    if (w > 0) { camPos.lerp(rig.pos, w); camera.quaternion.slerp(rig.quat, w); }
    camera.position.copy(camPos);
    const near = w > .02 ? .12 : 1; // close to the characters, the near plane comes in
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    sky.position.copy(camPos); celestial.position.copy(camPos);
    skyU.uTop.value.copy(pal.top); skyU.uMid.value.copy(pal.mid); skyU.uHor.value.copy(pal.hor);
    skyU.uSun.value.copy(pal.sun); skyU.uSunDir.value.copy(sunDir); skyU.uSunI.value = pal.sunI;
    scene.fog.color.copy(pal.hor); scene.fog.density = pal.fog;
    // past the hero, expose the scene down a little so section text stays crisp
    const past = sstep(innerHeight * .35, innerHeight, window.__sy ?? scrollY);
    renderer.toneMappingExposure = lerp(1 - .42 * past * (1 - pal.night * .7), 1, w);
    hemi.color.copy(pal.hs); hemi.groundColor.copy(pal.hg); hemi.intensity = pal.hI;

    // one shadow-casting light: the sun by day, the moon once it has set
    const sunUp = sstep(-.02, .08, sunDir.y);
    if (sunUp > .001) { ldir.copy(sunDir); light.color.copy(pal.sun); light.intensity = pal.sunI * sunUp; }
    else { ldir.copy(MOON_DIR); light.color.set('#8ea6ff'); light.intensity = .9 * pal.night; }
    shadowAt.set(camPos.x, camPos.y - 26, camPos.z - 70);
    if (w > 0) shadowAt.lerp(rig.focus, w);
    const span = lerp(95, 34, w), sc = light.shadow.camera; // tighter, sharper shadows at ground level
    if (sc.right !== span) { sc.left = sc.bottom = -span; sc.right = sc.top = span; sc.updateProjectionMatrix(); }
    light.target.position.copy(shadowAt);
    light.position.copy(shadowAt).addScaledVector(ldir, 400);

    const night = pal.night;
    starMat.opacity = sstep(.25, 1, night) * .9;
    moonMat.opacity = sstep(.2, .8, night); moonGlow.material.opacity = sstep(.2, .8, night) * .5;

    // clouds drift slowly and take the colour of the hour
    for (const c of clouds) {
      const u = c.userData; if (!reduceMotion) u.az += u.v * dt * .1;
      if (u.az > deg(85)) u.az -= deg(170);
      c.position.set(Math.sin(u.az) * Math.cos(u.el) * u.d, Math.sin(u.el) * u.d, -Math.cos(u.az) * Math.cos(u.el) * u.d);
      c.material.color.copy(pal.cloud); c.material.opacity = pal.cloudA * sstep(deg(85), deg(70), Math.abs(u.az));
    }

    // the title belongs to the hero: it fades as you scroll on
    titleMat.opacity = .94 * (1 - sstep(innerHeight * .06, innerHeight * .6, window.__sy ?? scrollY)) * (1 - w) ** 2;
    title.visible = titleMat.opacity > .01;

    // motes come toward the camera as it moves forward, and wrap around
    const pulse = window.PS && PS.audio ? PS.audio.energy() : 0;
    mcol.copy(POLLEN).lerp(FLY_C, sstep(.35, .9, night));
    for (let i = 0; i < MOTES; i++) {
      const m = motes[i], s = t * m.sp + m.ph, dist = (((camPos.z - m.z * 1) % 90) + 90) % 90;
      mp[i * 3] = camPos.x + m.x + Math.sin(s) * 1.6;
      mp[i * 3 + 1] = camPos.y + m.y * lerp(1, .2, w) + Math.sin(s * .7) * 1.1 + lerp(-4, .6, w);
      mp[i * 3 + 2] = camPos.z - 5 - dist;
      const blink = night > .3 ? Math.max(0, Math.sin(t * m.bl + m.ph)) : .6 + .4 * Math.sin(t * m.bl + m.ph);
      const b = lerp(.4, 1, night) * blink * (.35 + .65 * sstep(6, 22, dist)) * (1 + pulse * .8) * (1 - w * .6);
      mc[i * 3] = mcol.r * b; mc[i * 3 + 1] = mcol.g * b; mc[i * 3 + 2] = mcol.b * b;
    }
    moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;

    // birds while it is light
    const day = 1 - sstep(.1, .45, night);
    let bi = 0;
    for (const f of flocks) {
      if (!f.active) {
        f.wait -= dt;
        if (f.wait <= 0 && day > .6) {
          const side = rnd() < .5 ? -1 : 1;
          f.dist = 70 + rnd() * 150;
          f.pos.set(camPos.x - side * (f.dist * 1.15 + 60), camPos.y + 4 + rnd() * 30, camPos.z - f.dist);
          if (!ready) f.pos.x += side * f.dist * .9; // the first flock is already in view
          f.vel.set(side * (10 + rnd() * 5), (rnd() - .4) * .8, (rnd() - .5) * 3);
          f.active = true;
        }
      } else {
        f.pos.addScaledVector(f.vel, reduceMotion ? 0 : dt);
        if ((f.pos.x - camPos.x) * Math.sign(f.vel.x) > f.dist * 1.2 + 90) { f.active = false; f.wait = 5 + rnd() * 9; }
      }
      for (let j = 0; j < PER; j++, bi++) {
        dummy.position.copy(f.pos).add(f.offs[j]); dummy.position.y += Math.sin(t * 1.3 + j) * .5;
        tmp.copy(dummy.position).add(f.vel); dummy.lookAt(tmp);
        dummy.scale.setScalar(f.active ? f.sizes[j] * day : 0); dummy.updateMatrix();
        birds.setMatrixAt(bi, dummy.matrix);
      }
    }
    birds.instanceMatrix.needsUpdate = true;

    // fireflies after dark
    flyMat.opacity = sstep(.45, 1, night) * .95;
    fireflies.visible = flyMat.opacity > .01;
    if (fireflies.visible) {
      for (let i = 0; i < FLY; i++) {
        const f = flies[i], s = t * f.sp + f.ph;
        fp[i * 3] = f.x + Math.sin(s) * 2.5; fp[i * 3 + 1] = f.y + Math.sin(s * 1.7) * .8; fp[i * 3 + 2] = f.z + Math.cos(s * .8) * 2.5;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyMat.size = 1.2 + Math.sin(t * 3) * .15;
    }

    renderer.render(scene, camera);

    if (!ready) { ready = true; canvas.classList.add('is-ready'); window.__world3d = true; }
    // keep it smooth: lower the resolution if frames are slow
    if (++frames > 30) {
      slowSum += dt;
      if (frames === 120) {
        if (slowSum / 90 > .028 && dpr > .75) { dpr = Math.max(.75, dpr - .25); renderer.setPixelRatio(dpr); resize(); frames = 0; slowSum = 0; }
      }
    }
  }
  requestAnimationFrame(frame);
}

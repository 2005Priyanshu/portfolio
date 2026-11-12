/* =====================================================================
   DEAD AIR: the 3D world behind radio mode.
   A pirate radio station on a glass road at the edge of a dark universe.
   Scrolling moves the camera past one set piece per stop: the boombox,
   a microphone and headphones, five cassettes, a design district, four project mockups,
   a mixing desk, a turntable and the broadcast tower.
   Out in the dark swims The Static, a serpent that feeds on silence.
   While music plays it keeps its distance; when the music stops it
   closes in and the lightning turns red.
   Look: physically based materials, a studio environment for
   reflections, tone mapping and bloom.
   Two themes share the scene. Dark is the universe described above.
   Light is the same road by day: a sunburst sky in each stop's colour,
   no stars, no lightning and no Static.
   ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const V3 = THREE.Vector3;
const ease = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const CANDY = [0xff2e63, 0xffc400, 0x00d5ff, 0x9dff00, 0xff6b00, 0x8a4bff];
const UP = new V3(0, 1, 0);

export function createWorld(canvas, { reduced = false, show = {}, tapes = [], onPick = () => {}, onZap = () => {}, adaptive = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  let pr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04020a);
  scene.fog = new THREE.FogExp2(0x04020a, .0052);
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 2600);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .32;

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), .42, .6, 1);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  /* ---------- materials ---------- */
  const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .45, metalness: 0, ...o });
  const plastic = (c, o = {}) => phys(c, { roughness: .3, clearcoat: 1, clearcoatRoughness: .15, ...o });
  const chrome = phys(0xffffff, { metalness: 1, roughness: .1 });
  const steel = phys(0x1c1c26, { metalness: .9, roughness: .34 });
  const rubber = phys(0x0c0c10, { roughness: .82 });
  const black = plastic(0x0a0a0e);
  const cream = plastic(0xe9e2d0, { roughness: .5 });
  const glass = phys(0xffffff, { roughness: .04, transparent: true, opacity: .2, envMapIntensity: 2.4, depthWrite: false });
  // unlit colour brighter than white, so the bloom picks it up as a light
  const neons = [];
  const neon = (hex, k = 2.2, slot = -1, o = {}) => { const m = new THREE.MeshBasicMaterial(o); m.color.set(hex).multiplyScalar(k); if (slot >= 0) neons.push({ m, k, slot }); return m; };

  const rbox = (w, h, d, r = .1) => new RoundedBoxGeometry(w, h, d, 5, r);
  const cyl = (rt, rb, h, seg = 40) => new THREE.CylinderGeometry(rt, rb, h, seg);
  function add(parent, geo, mat, p = [0, 0, 0], r) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    parent.add(m);
    return m;
  }
  const group = (parent, p = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); parent.add(g); return g; };
  const darkOnly = []; // what exists only in the dark theme
  const dummy = new THREE.Object3D(), tmpC = new THREE.Color(), tmpV = new V3(), tmpV2 = new V3(); // scratch values, reused everywhere
  function beam(parent, a, b, r, mat) { // a strut between two points
    const d = new V3().subVectors(b, a), len = d.length();
    const m = add(parent, cyl(r, r, len, 8), mat, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  }

  /* ---------- painted textures ---------- */
  function tex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const sign = text => tex(704, 240, (g, w, h) => {
    g.fillStyle = '#efe7d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8402f'; g.fillRect(0, h - 34, w, 10); g.fillRect(0, h - 18, w, 4);
    g.fillStyle = '#0b0b0f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let s = 138; g.font = `${s}px Anton, Impact, sans-serif`;
    while (g.measureText(text).width > w * .88 && s > 24) { s -= 6; g.font = `${s}px Anton, Impact, sans-serif`; }
    g.fillText(text.toUpperCase(), w / 2, h / 2 - 12);
  });
  const grooves = tex(512, 512, (g, w) => { // the ridges of a record
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let r = 78; r < 250; r += 1.6) { g.strokeStyle = Math.random() < .5 ? '#5c5c5c' : '#a6a6a6'; g.lineWidth = 1; g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); }
  }, false);
  const grille = tex(128, 128, (g, w) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, w); g.fillStyle = '#000';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 16 + (y % 2 ? 12 : 4), y * 16 + 8, 4.6, 0, 7); g.fill(); }
  }, false);
  grille.wrapS = grille.wrapT = THREE.RepeatWrapping; grille.repeat.set(7, 4);
  const cloud = () => tex(512, 512, (g, w) => {
    for (let i = 0; i < 46; i++) {
      const a = rnd(0, 6.3), d = rnd(0, 150), x = w / 2 + Math.cos(a) * d, y = w / 2 + Math.sin(a) * d * .7, r = rnd(50, 150);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,255,255,${rnd(.04, .13)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }
  });
  const dot = tex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const vinyl = phys(0x09090b, { roughness: .3, clearcoat: .7, clearcoatRoughness: .25, bumpMap: grooves, bumpScale: 1.2 });

  /* ---------- palette (set per stop) ---------- */
  const pal = [new THREE.Color(0xff3b5c), new THREE.Color(0x7df9ff), new THREE.Color(0xffd60a)];
  const cA = pal[0].clone(), cB = pal[1].clone(), RED = new THREE.Color(0xff1238), mix = new THREE.Color();

  const pumps = [], spinners = [], bobbers = [];
  function speaker(parent, x, y, z, r) {
    const g = group(parent, [x, y, z]);
    add(g, new THREE.TorusGeometry(r, r * .12, 16, 64), chrome);
    add(g, new THREE.TorusGeometry(r * .86, r * .06, 12, 64), rubber, [0, 0, -.02]);
    const pump = group(g);
    add(pump, new THREE.CylinderGeometry(r * .82, r * .26, r * .38, 48, 1, true), phys(0x30303a, { roughness: .55, side: THREE.DoubleSide }), [0, 0, -r * .19], [Math.PI / 2, 0, 0]);
    add(pump, new THREE.SphereGeometry(r * .3, 32, 16), black, [0, 0, -r * .3]).scale.z = .5;
    add(pump, new THREE.TorusGeometry(r * .5, r * .025, 8, 48), neon(0xffffff, 1.6, 0), [0, 0, -r * .22]);
    pumps.push(pump);
    return g;
  }
  function reel(parent, x, y, z, r, speed = 4) {
    const g = group(parent, [x, y, z]);
    add(g, cyl(r, r, r * .2, 24), cream, [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 3; k++) add(g, new THREE.BoxGeometry(r * .28, r * 1.8, r * .24), black, [0, 0, 0], [0, 0, k * Math.PI / 3]);
    spinners.push({ o: g, axis: 'z', speed: -speed });
    return g;
  }
  function plinth(x, z, r, slot) { // a dark stage with a ring of light
    add(scene, cyl(r, r + .4, .7, 72), steel, [x, .35, z]);
    add(scene, cyl(r - .8, r - .8, .12, 72), black, [x, .74, z]);
    add(scene, new THREE.TorusGeometry(r + .05, .06, 8, 96), neon(0xffffff, 2.4, slot), [x, .62, z], [Math.PI / 2, 0, 0]);
  }

  /* ---------- 0 · the boombox ---------- */
  plinth(0, 0, 5.2, 0);
  const boom = group(scene, [0, 2.95, 0]); boom.scale.setScalar(1.2);
  const bodyMat = plastic(0xff3b5c);
  add(boom, rbox(4.4, 2.6, 1.3, .3), bodyMat);
  add(boom, rbox(4.02, 2.12, .1, .05), steel, [0, 0, .62]);
  speaker(boom, -1.32, -.02, .68, .78); speaker(boom, 1.32, -.02, .68, .78);
  add(boom, rbox(1.15, .62, .06, .04), black, [0, .42, .67]);
  add(boom, new THREE.BoxGeometry(.95, .44, .02), cream, [0, .42, .705]);
  add(boom, new THREE.BoxGeometry(.95, .1, .022), plastic(0xff2e63), [0, .57, .707]);
  reel(boom, -.24, .38, .725, .11); reel(boom, .24, .38, .725, .11);
  add(boom, rbox(1.1, .56, .03, .03), glass, [0, .42, .76]);
  add(boom, rbox(1.15, .26, .04, .03), neon(0xffc978, 1.5), [0, -.35, .67]);
  const needle = add(boom, new THREE.BoxGeometry(.03, .24, .02), neon(0xff2030, 3), [-.45, -.35, .7]);
  for (const x of [-.38, .38]) add(boom, cyl(.13, .15, .14, 32), chrome, [x, -.78, .7], [Math.PI / 2, 0, 0]);
  const ledOn = neon(0xffffff, 2.6, 1), ledOff = phys(0x16161c, { roughness: .4 });
  const leds = Array.from({ length: 9 }, (_, k) => add(boom, rbox(.07, .07, .03, .015), ledOff, [-.34 + k * .085, -.6, .69]));
  const keys = CANDY.slice(0, 5).map((c, k) => add(boom, rbox(.42, .2, .36, .05), plastic(c), [-1 + k * .5, 1.36, .05]));
  const handle = new THREE.CatmullRomCurve3([[-1.7, 1.2], [-1.6, 1.95], [-1.1, 2.15], [1.1, 2.15], [1.6, 1.95], [1.7, 1.2]].map(([x, y]) => new V3(x, y, 0)));
  add(boom, new THREE.TubeGeometry(handle, 64, .1, 16), steel);
  const ant = group(boom, [1.75, 1.25, -.3]); ant.rotation.z = -.45;
  add(ant, cyl(.025, .04, 2.4, 12), chrome, [0, 1.2, 0]);
  add(ant, new THREE.SphereGeometry(.07, 16, 12), neon(0xff2030, 3), [0, 2.42, 0]);
  for (const x of [-1.6, 1.6]) add(boom, rbox(.6, .18, .9, .06), rubber, [x, -1.36, 0]);

  /* ---------- 1 · microphone and headphones ---------- */
  const mic = group(scene, [8, 0, -24]);
  add(mic, cyl(1.5, 1.7, .26, 64), steel, [0, .13, 0]);
  add(mic, cyl(.08, .08, 5, 16), chrome, [0, 2.7, 0]);
  const micHead = group(mic, [0, 5.2, 0]); micHead.rotation.set(.3, 0, .5);
  add(micHead, cyl(.34, .26, 1.6, 40), steel);
  add(micHead, new THREE.SphereGeometry(.62, 48, 32), phys(0xd8dce6, { metalness: 1, roughness: .28, bumpMap: grille, bumpScale: 2.5 }), [0, 1.1, 0]);
  add(micHead, new THREE.TorusGeometry(.5, .06, 12, 48), neon(0xffffff, 2.4, 0), [0, .72, 0], [Math.PI / 2, 0, 0]);
  const phones = group(scene, [4.4, 7, -28]);
  add(phones, new THREE.TorusGeometry(1.5, .14, 16, 64, Math.PI), plastic(0x15151c));
  for (const x of [-1.5, 1.5]) {
    add(phones, cyl(.78, .78, .46, 48), plastic(0x8a4bff), [x, -.35, 0], [0, 0, Math.PI / 2]);
    add(phones, new THREE.TorusGeometry(.6, .16, 16, 48), rubber, [x - Math.sign(x) * .26, -.35, 0], [0, Math.PI / 2, 0]);
    add(phones, new THREE.TorusGeometry(.62, .035, 8, 48), neon(0xffffff, 2.4, 1), [x + Math.sign(x) * .24, -.35, 0], [0, Math.PI / 2, 0]);
  }
  bobbers.push({ o: phones, y: 7, amp: .35, rot: .5, ph: 0 });

  /* ---------- 2 · the cassettes, one per job ---------- */
  const TAPE_Z0 = -44, TAPE_GAP = 8;
  const tapeObjs = tapes.map((name, i) => {
    const g = group(scene, [10, 3.3, TAPE_Z0 - i * TAPE_GAP]); g.rotation.y = -Math.PI / 2;
    add(g, rbox(5, 3.2, .46, .16), plastic(CANDY[i % CANDY.length]));
    add(g, new THREE.PlaneGeometry(4.4, 1.5), new THREE.MeshBasicMaterial({ map: sign(name), color: 0xb9b9b9 }), [0, .62, .236]);
    add(g, rbox(2.7, .95, .05, .04), black, [0, -.6, .22]);
    reel(g, -.75, -.6, .26, .34, 3); reel(g, .75, -.6, .26, .34, 3);
    add(g, new THREE.BoxGeometry(.7, .12, .04), phys(0x4a3120, { roughness: .6 }), [0, -.6, .26]);
    add(g, rbox(2.6, .86, .03, .03), glass, [0, -.6, .3]);
    for (const [x, y] of [[-2.25, 1.35], [2.25, 1.35], [-2.25, -1.35], [2.25, -1.35]]) add(g, cyl(.07, .07, .04, 12), chrome, [x, y, .235], [Math.PI / 2, 0, 0]);
    const bar = neon(0xffffff, 0, -1); add(g, rbox(4.2, .07, .07, .03), bar, [0, -1.78, 0]);
    g.userData.bar = bar;
    return g;
  });
  let tapeOn = 0;

  /* ---------- 3 · the design district: the work as real objects ----------
     Seven exhibits along the road, each on its own stage:
     0 kulfi boxes wrapped in the packaging   1 roll-up standees   2 a phone, a tee and posters
     3 a stack of TVs   4 a record crate   5 billboards   6 planets with the work in orbit.
     Printed surfaces are lit like everything else and also glow a little, so they read in the dark. */
  const D0 = -100, GAP = 22, bbZ0 = D0 - 5 * GAP - 4, zG = bbZ0 - 58, G1 = zG - 14;
  const pickables = [], prints = [], turn = [[], [], [], [], [], [], []], pool = show.pool || [];
  const loader = new THREE.TextureLoader(), texCache = new Map(), coverCache = new Map();
  const unitBox = new THREE.BoxGeometry(1, 1, 1), unitPlane = new THREE.PlaneGeometry(1, 1);
  function img(src, cb) { // each image is loaded once and shared
    let e = texCache.get(src);
    if (!e) { e = { t: null, cbs: [] }; texCache.set(src, e); loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; e.t = t; e.cbs.forEach(f => f(t)); e.cbs = null; }); }
    if (e.t) cb(e.t); else e.cbs.push(cb);
  }
  function cover(src, aspect, cb) { // the image cropped to fill a shape, keeping its upper part
    const key = src + '|' + aspect;
    if (coverCache.has(key)) return cb(coverCache.get(key));
    img(src, t => {
      if (!coverCache.has(key)) {
        const c = t.clone(), a = t.image.width / t.image.height;
        if (a > aspect) { c.repeat.set(aspect / a, 1); c.offset.set((1 - aspect / a) / 2, 0); } else { c.repeat.set(1, a / aspect); c.offset.set(0, (1 - a / aspect) * .72); }
        c.needsUpdate = true; coverCache.set(key, c);
      }
      cb(coverCache.get(key));
    });
  }
  function print(src, { glow = .4, fit = 0, o = {} } = {}, onLoad) { // a printed surface: glossy, lit, faintly self lit
    const m = phys(0x1c1c22, { roughness: .34, clearcoat: .7, clearcoatRoughness: .2, ...o });
    const use = t => { m.map = m.emissiveMap = t; m.color.set(0xffffff); m.emissive.set(0xffffff); m.userData.glow = glow; m.needsUpdate = true; prints.push(m); };
    if (fit) cover(src, fit, use); else img(src, t => { use(t); onLoad && onLoad(t); });
    return m;
  }
  const pick = (mesh, data) => { mesh.userData.pick = data; pickables.push(mesh); return mesh; };
  const turnable = (i, o, spin = 0, sway = 0) => turn[i].push({ o, spin, sway, base: o.rotation.y, a: 0, ph: turn[i].length * 1.3 });
  const exhibit = (i, side) => { // a stage beside the road, facing it
    const z = D0 - i * GAP, x = side * 9;
    plinth(x, z, 4.7, i % 2);
    const g = group(scene, [x, .8, z]); g.rotation.y = -side * Math.PI / 2;
    return g;
  };

  // 0 · Shankar Kulfi: the sleeve folded around boxes, one per colourway, and a kulfi
  if (show.kulfi) {
    const g = exhibit(0, -1), gold = phys(0xd9a93a, { metalness: 1, roughness: .24 });
    show.kulfi.boxes.forEach((faces, k) => {
      const [f, sd, bk, st] = faces.map(src => print(src, { glow: .28, o: { metalness: .25, roughness: .26, clearcoat: 1, clearcoatRoughness: .08 } }));
      const rise = k === 1 ? .9 : .34, x = (k - 1) * 2.15;
      add(g, cyl(.78, .88, rise, 64), steel, [x, rise / 2, 0]);
      add(g, new THREE.TorusGeometry(.8, .025, 8, 64), neon(0xffffff, 2.4, k % 2), [x, rise, 0], [Math.PI / 2, 0, 0]);
      const box = pick(add(g, new THREE.BoxGeometry(.78, 5.16, .78), [sd, st, gold, gold, f, bk], [x, rise + 2.6, 0]), { slug: show.kulfi.slug });
      box.rotation.y = (k - 1) * -.5; turnable(0, box, .45);
    });
    const pop = group(g, [-3.3, 2.3, 1.5]); pop.rotation.z = .22;
    add(pop, rbox(.95, 2.3, .5, .24), phys(0xf2dfa2, { roughness: .5, clearcoat: .4, sheen: 1, sheenColor: 0xfff2c4 }), [0, .6, 0]);
    add(pop, rbox(.2, 1.3, .06, .03), phys(0xc9a26b, { roughness: .7 }), [0, -1.1, 0]);
    const nut = new THREE.SphereGeometry(.055, 10, 8), nuts = [phys(0x7fae3a, { roughness: .6 }), phys(0xe2892b, { roughness: .6 }), phys(0x9c5a2a, { roughness: .6 })];
    for (let k = 0; k < 34; k++) add(pop, nut, nuts[k % 3], [rnd(-.36, .36), rnd(-.4, 1.6), (k % 2 ? 1 : -1) * .245]).scale.set(rnd(.8, 1.6), rnd(.6, 1.2), .35);
    turnable(0, pop, .7); bobbers.push({ o: pop, y: 2.3, amp: .16, rot: 0, ph: 1 });
  }

  // 1 · Prontoo: the two roll-up standees
  if (show.standees) {
    const g = exhibit(1, 1);
    show.standees.panels.forEach((src, k) => {
      const sgn = k ? 1 : -1, st = group(g, [sgn * 1.8, 0, k ? .35 : -.25]); st.rotation.y = -sgn * .3;
      add(st, rbox(3, .24, .5, .1), chrome, [0, .12, 0]); // the cassette the banner rolls out of
      for (const x of [-1.25, 1.25]) add(st, rbox(.5, .06, 1.1, .03), steel, [x, .03, 0]);
      add(st, cyl(.035, .035, 5.6, 12), steel, [0, 2.9, -.16]);
      pick(add(st, new THREE.PlaneGeometry(2.75, 5.5), print(src, { glow: .36, o: { side: THREE.DoubleSide, roughness: .46, clearcoat: .3 } }), [0, 2.98, 0]), { slug: show.standees.slug });
      add(st, rbox(2.86, .1, .09, .03), chrome, [0, 5.76, 0]);
      turnable(1, st, 0, .08);
    });
  }

  // 2 · ORIGINS: the campaign on a phone, the graphic on a tee, the posters on a wall
  const phone = { post: null, texs: [], i: 0 };
  if (show.origins) {
    const g = exhibit(2, -1), og = show.origins, slug = og.slug;
    add(g, rbox(9.4, 8.4, .3, .08), phys(0x26252c, { roughness: .85 }), [0, 4.4, -2.1]);
    add(g, rbox(9.4, .08, .12, .03), neon(0xffffff, 2.4, 0), [0, 8.7, -1.95]);
    og.posters.forEach((src, k) => {
      const ps = pick(add(g, new THREE.PlaneGeometry(2.3, 3.26), print(src, { glow: .3, o: { roughness: .6, clearcoat: .15 } }), [(k - 1) * 2.75, 6.75 + (k % 2 ? .15 : -.05), -1.93]), { slug });
      ps.rotation.z = (1 - k) * .05;
    });
    const ph = group(g, [-2.55, 2.75, .8]); ph.rotation.y = .3; ph.scale.setScalar(.86);
    add(ph, rbox(2.3, 4.7, .26, .13), phys(0x34343e, { metalness: 1, roughness: .2 }));
    add(ph, rbox(2.18, 4.58, .04, .02), black, [0, 0, .125]);
    add(ph, new THREE.PlaneGeometry(2.08, 4.48), new THREE.MeshBasicMaterial({ map: tex(416, 896, (c, w, h) => { // the app around the post
      c.fillStyle = '#0c0c10'; c.fillRect(0, 0, w, h);
      const gr = c.createLinearGradient(20, 100, 76, 156); gr.addColorStop(0, '#ffc400'); gr.addColorStop(1, '#ff2e63');
      c.fillStyle = gr; c.beginPath(); c.arc(48, 128, 26, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = 'bold 30px sans-serif'; c.textBaseline = 'middle'; c.fillText('origins', 90, 128);
      c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath(); c.arc(50, 716, 17, 0, 7); c.stroke(); c.strokeRect(100, 700, 34, 30); c.beginPath(); c.moveTo(166, 733); c.lineTo(204, 700); c.lineTo(190, 738); c.closePath(); c.stroke();
      c.fillStyle = '#6a6a76'; c.fillRect(32, 768, 300, 14); c.fillRect(32, 798, 210, 14);
    }) }), [0, 0, .15]);
    phone.post = pick(add(ph, new THREE.PlaneGeometry(2.08, 2.5), new THREE.MeshBasicMaterial({ color: 0x15151a }), [0, .22, .153]), { slug });
    og.posts.forEach((src, k) => img(src, t => { phone.texs[k] = t; if (!k) { phone.post.material.map = t; phone.post.material.color.set(0xffffff); phone.post.material.needsUpdate = true; } }));
    add(ph, new THREE.CapsuleGeometry(.075, .38, 6, 16), black, [0, 2.04, .16], [0, 0, Math.PI / 2]);
    for (const y of [1.1, .45]) add(ph, rbox(.05, .46, .1, .02), chrome, [1.16, y, 0]);
    add(g, cyl(.05, .05, .8, 12), chrome, [-2.55, .4, .8]); add(g, cyl(.5, .56, .08, 40), steel, [-2.55, .04, .8]);
    turnable(2, ph, 0, .32);
    const tee = group(g, [2.5, 2.7, .8]), sh = new THREE.Shape();
    sh.moveTo(-.45, 1.5); sh.lineTo(-1.2, 1.36); sh.lineTo(-2.02, .74); sh.lineTo(-1.66, .22); sh.lineTo(-1.14, .58); sh.lineTo(-1.14, -1.62);
    sh.lineTo(1.14, -1.62); sh.lineTo(1.14, .58); sh.lineTo(1.66, .22); sh.lineTo(2.02, .74); sh.lineTo(1.2, 1.36); sh.lineTo(.45, 1.5); sh.quadraticCurveTo(0, 1.02, -.45, 1.5);
    const tg = new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 5, curveSegments: 20 }); tg.translate(0, 0, -.1);
    pick(add(tee, tg, phys(0x0d0d11, { roughness: .92, sheen: 1, sheenRoughness: .45, sheenColor: 0x50506a })), { slug });
    add(tee, new THREE.PlaneGeometry(1.62, 1.82), print(og.tee, { glow: .1, o: { roughness: .9, clearcoat: 0 } }), [0, -.12, .178]);
    add(tee, cyl(.025, .025, 2.3, 8), chrome, [0, 1.5, 0], [0, 0, Math.PI / 2]);
    add(tee, new THREE.TorusGeometry(.17, .025, 8, 28, Math.PI * 1.5), chrome, [0, 1.84, 0], [0, 0, -.8]);
    add(g, cyl(.04, .04, 3.2, 12), chrome, [2.5, 4.74, .8], [0, 0, Math.PI / 2]);
    for (const x of [1, 4]) add(g, cyl(.04, .04, 2.8, 12), chrome, [x, 4.74, -.6], [Math.PI / 2, 0, 0]);
    turnable(2, tee, 0, .4);
  }

  // 3 · the TV stack: every screen a piece of work, static between channels
  const sheen = phys(0xffffff, { roughness: .03, transparent: true, opacity: .07, envMapIntensity: 3, depthWrite: false });
  const tvs = [], noiseC = document.createElement('canvas'); noiseC.width = 64; noiseC.height = 48;
  const noiseG = noiseC.getContext('2d'), noiseD = noiseG.createImageData(64, 48), noiseTex = new THREE.CanvasTexture(noiseC);
  noiseTex.magFilter = THREE.NearestFilter; noiseTex.colorSpace = THREE.SRGBColorSpace;
  const screenGeo = new THREE.PlaneGeometry(1, 1, 12, 12);
  { const q = screenGeo.attributes.position; for (let i = 0; i < q.count; i++) q.setZ(i, (.5 - q.getX(i) ** 2 - q.getY(i) ** 2) * .16); screenGeo.computeVertexNormals(); }
  const tune = (tv, k) => { tv.k = ((k % pool.length) + pool.length) % pool.length; tv.until = performance.now() / 1000 + .3; tv.scr.material.map = noiseTex; };
  if (pool.length) {
    const g = exhibit(3, 1), shells = [0xe9e2d0, 0xff6b00, 0x15151c, 0x00b3d6, 0xffc400, 0xff2e63];
    [[-2.5, 0, 2.3], [0, 0, 2.5], [2.5, 0, 2.2], [-1.3, 2, 2.2], [1.25, 2, 2.05], [0, 3.72, 1.9]].forEach(([x, y, w], i) => {
      const h = w * .8, d = w * .7, sw = w * .66, shx = -w * .1, b = group(g, [x, y + h / 2, 0]); b.rotation.y = (i % 2 ? 1 : -1) * rnd(.02, .1);
      add(b, rbox(w, h, d, .1), plastic(shells[i], { roughness: .36 }));
      add(b, rbox(w * .7, h * .68, d * .5, .12), plastic(shells[i], { roughness: .5 }), [0, 0, -d * .62]);
      add(b, rbox(sw + .18, sw / 1.25 + .18, .08, .06), black, [shx, 0, d / 2]);
      const scr = add(b, screenGeo, new THREE.MeshBasicMaterial({ map: noiseTex }), [shx, 0, d / 2 + .06]); scr.scale.set(sw, sw / 1.25, 1);
      add(b, screenGeo, sheen, [shx, 0, d / 2 + .075]).scale.set(sw, sw / 1.25, 1);
      for (const ky of [.22, -.02]) add(b, cyl(.085 * w / 2.3, .1 * w / 2.3, .1, 24), chrome, [w * .39, h * ky, d / 2 + .04], [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 4; k++) add(b, rbox(w * .13, .025, .03, .01), black, [w * .39, -h * .22 - k * .07, d / 2 + .01]);
      add(b, new THREE.SphereGeometry(.03, 8, 6), neon(0xff2030, 3), [w * .39, h * .36, d / 2 + .02]);
      if (i === 5) for (const sg of [-1, 1]) add(b, cyl(.015, .02, 1.5, 8), chrome, [sg * .42, h / 2 + .68, 0], [0, 0, -sg * .5]);
      const tv = { scr, k: 0, until: 0 }; tvs.push(tv); tune(tv, i * 3 + 1);
      pick(scr, { fn: () => tune(tv, tv.k + 1) });
    });
  }

  // 4 · the record crate: the work as sleeves to flip through
  const crate = { list: [], on: 0 };
  if (pool.length) {
    const g = exhibit(4, -1), wood = phys(0x7d4a22, { roughness: .58, clearcoat: .35, clearcoatRoughness: .4 }), card = phys(0xd9d3c4, { roughness: .82 });
    add(g, rbox(4.4, 1.3, 3.6, .12), steel, [0, .65, 0]);
    add(g, rbox(4.5, .08, 3.7, .03), neon(0xffffff, 2.2, 1), [0, 1.3, 0]);
    const c = group(g, [0, 1.36, 0]); c.rotation.y = .32;
    add(c, rbox(3.74, .1, 2.9, .03), wood, [0, .05, 0]);
    for (const y of [.42, .98]) { for (const z of [-1.4, 1.4]) add(c, rbox(3.74, .44, .1, .03), wood, [0, y, z]); for (const x of [-1.82, 1.82]) add(c, rbox(.1, .44, 2.9, .03), wood, [x, y, 0]); }
    for (const x of [-1.82, 1.82]) for (const z of [-1.4, 1.4]) add(c, rbox(.18, 1.3, .18, .04), wood, [x, .65, z]);
    const n = Math.min(9, pool.length), step = Math.max(1, Math.floor(pool.length / n));
    for (let i = 0; i < n; i++) {
      const it = pool[(i * step) % pool.length], piv = group(c, [0, .12, 1.05 - i * .26]);
      const sl = pick(add(piv, new THREE.BoxGeometry(3.2, 3.2, .05), [card, card, card, card, print(it.src, { glow: .3, fit: 1, o: { roughness: .4, clearcoat: .5 } }), card], [0, 1.6, 0]), { fn: () => { crate.on = (crate.on + 1) % n; } });
      const disc = group(piv, [0, 1.6, -.04]);
      add(disc, cyl(1.46, 1.46, .03, 72), vinyl, [0, 0, 0], [Math.PI / 2, 0, 0]);
      add(disc, cyl(.5, .5, .04, 40), plastic(CANDY[i % CANDY.length]), [0, 0, 0], [Math.PI / 2, 0, 0]);
      crate.list.push({ piv, disc, sl });
    }
  }

  // 5 · billboard alley: the work at street scale, turned to face the traffic
  (show.billboards || []).forEach((bd, k) => {
    const side = k % 2 ? 1 : -1, g = group(scene, [side * 13, 0, bbZ0 - k * 12]); g.rotation.y = -side * .95;
    for (const x of [-1.7, 1.7]) add(g, cyl(.16, .22, 5.3, 20), steel, [x, 2.65, -.3]);
    add(g, rbox(7.8, .14, 1.2, .05), steel, [0, 5.15, .15]);
    for (const x of [-3.8, 3.8]) add(g, cyl(.03, .03, .9, 8), chrome, [x, 5.6, .7]);
    add(g, cyl(.03, .03, 7.6, 8), chrome, [0, 6.05, .7], [0, 0, Math.PI / 2]);
    const frame = add(g, unitBox, steel), lamp = add(g, unitBox, neon(0xfff0d0, 2.3)), panel = add(g, unitPlane, steel);
    const fit = a => {
      const w = Math.min(7.4, 5 * a), h = w / a, y = 5.35 + h / 2;
      panel.scale.set(w, h, 1); panel.position.set(0, y, .19); frame.scale.set(w + .36, h + .36, .34); frame.position.y = y;
      lamp.scale.set(w * .92, .07, .1); lamp.position.set(0, y + h / 2 + .42, .75);
    };
    fit(1.6);
    panel.material = print(bd.src, { glow: .3 }, t => fit(t.image.width / t.image.height));
    pick(panel, { slug: bd.slug });
  });

  // 6 · project planets: each project a small world, its pieces in orbit
  const moons = [];
  const strata = tex(256, 256, (c, w) => { for (let y = 0; y < w; y++) { const v = 150 + Math.sin(y * .13) * 40 + Math.sin(y * .41) * 30 + rnd(-12, 12); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(0, y, w, 1); } });
  (show.projects || []).slice(0, 3).forEach((pj, k) => {
    const r = [2.7, 2.1, 1.8][k], g = group(scene, [[-19, 12, zG - 5], [-8, 7.6, zG + 3], [-11.5, 17, zG + 9]][k]); g.rotation.z = [.3, -.25, .15][k];
    pick(add(g, new THREE.SphereGeometry(r, 72, 48), phys(pj.color, { map: strata, bumpMap: strata, bumpScale: .6, roughness: .32, clearcoat: 1, clearcoatRoughness: .15 })), { slug: pj.slug });
    const label = tex(1024, 96, (c, w, h) => { c.fillStyle = '#fff'; c.font = '64px Anton, Impact, sans-serif'; c.textBaseline = 'middle'; const word = pj.title.toUpperCase() + '  ✦  ', ww = c.measureText(word).width, n = Math.max(1, Math.round(w / ww)); c.scale(w / (n * ww), 1); for (let i = 0; i < n; i++) c.fillText(word, i * ww, h / 2 + 4); });
    const band = add(g, new THREE.CylinderGeometry(r * 1.035, r * 1.035, r * .34, 72, 1, true), new THREE.MeshBasicMaterial({ map: label, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    spinners.push({ o: band, axis: 'y', speed: .5 });
    add(g, new THREE.TorusGeometry(r * 1.6, .035, 8, 120), neon(0xffffff, 2.6, k % 2), [0, 0, 0], [Math.PI / 2, 0, 0]);
    turnable(6, g, .12);
    pj.moons.slice(0, 4).forEach((src, m) => {
      const d = pick(add(scene, new THREE.CircleGeometry(.95, 56), print(src, { glow: .34, fit: 1, o: { side: THREE.DoubleSide } })), { slug: pj.slug });
      add(d, new THREE.TorusGeometry(.95, .045, 10, 56), chrome);
      moons.push({ d, c: g.position, R: r + 1.7 + m * .3, sp: .32 + m * .08, ph: m * 1.7 + k * 2, tilt: (m % 2 ? 1 : -1) * (.25 + m * .08) });
    });
  });
  let exhibitOn = 0, dragOn = false, dragX = 0, dragV = 0, dragMoved = 0;

  /* ---------- 4 · greatest hits: each project as the thing you would use it on ----------
     0 rainfall: a laptop under its own rain cloud   1 forecasting: a monitor on a desk
     2 stocks: a tablet behind a row of candlesticks   3 Code Breakers: an arcade cabinet.
     The screens are drawn here as illustrations of each project. To show a real screenshot
     instead, set that project's `shot` in HITS (funky.js). */
  const P0 = G1 - 30, PG = 17, hits = show.hits || [], zP = P0 - Math.max(0, hits.length - 1) * PG;
  const INKS = { bg: '#0a0f1c', panel: '#121a2e', line: '#26324f', text: '#e8ecf8', dim: '#7f8bb0', a: '#ff4f9a', b: '#3dd6ff', c: '#ffd60a', up: '#19d68a', down: '#ff3b5c' };
  const screens = [], candles = [];
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  const titleBar = (c, w, title, sub) => { // the title bar every screen shares
    c.fillStyle = INKS.bg; c.fillRect(0, 0, w, 1000);
    c.fillStyle = INKS.panel; c.fillRect(0, 0, w, 54);
    for (let i = 0; i < 3; i++) { c.fillStyle = [INKS.down, INKS.c, INKS.up][i]; c.beginPath(); c.arc(22 + i * 20, 27, 6, 0, 7); c.fill(); }
    c.fillStyle = INKS.text; c.font = '26px Anton, Impact, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(title, 92, 29);
    c.fillStyle = INKS.dim; c.font = '13px "Space Mono", monospace'; c.textAlign = 'right'; c.fillText(sub, w - 18, 29); c.textAlign = 'left';
  };
  const wave = (x, t = 0) => Math.sin(x * .9 + t) * .5 + Math.sin(x * 2.3 + t * 1.7) * .25 + Math.sin(x * 5.1) * .12; // a made up series
  const DRAW = [
    (c, w, h, t) => { // rainfall: a year of bars with the wet months standing tall, and a cloud
      titleBar(c, w, 'RAINFALL PREDICTION', 'RANDOM FOREST · XGBOOST');
      c.fillStyle = INKS.panel; rr(c, 18, 70, 400, h - 88, 12); c.fill(); rr(c, 432, 70, w - 450, h - 88, 12); c.fill();
      const season = [.06, .05, .07, .1, .2, .55, .95, .9, .6, .25, .08, .05], scan = Math.floor(t * 2) % 12;
      c.font = '12px "Space Mono", monospace'; c.textAlign = 'center';
      season.forEach((v, i) => {
        const x = 40 + i * 31, bh = v * 200 * (1 + Math.sin(t * 2 + i) * .03);
        c.fillStyle = i === scan ? INKS.c : INKS.b; rr(c, x, 318 - bh, 20, bh, 4); c.fill();
        c.fillStyle = INKS.dim; c.fillText('JFMAMJJASOND'[i], x + 10, 338);
      });
      c.strokeStyle = INKS.a; c.lineWidth = 3; c.beginPath(); // the model's line over the bars
      season.forEach((v, i) => { const x = 50 + i * 31, y = 318 - (v * .92 + .04) * 200; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      c.textAlign = 'left'; c.fillStyle = INKS.dim; c.fillText('MONTHLY RAINFALL', 34, 94); c.fillStyle = INKS.a; c.fillText('PREDICTED', 320, 94);
      const cx = 432 + (w - 450) / 2; c.fillStyle = INKS.text;
      for (const [dx, dy, r] of [[-34, 0, 26], [0, -14, 34], [36, 2, 24], [0, 12, 30]]) { c.beginPath(); c.arc(cx + dx, 150 + dy, r, 0, 7); c.fill(); }
      c.strokeStyle = INKS.b; c.lineWidth = 4; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const f = (t * 1.4 + i * .37) % 1, x = cx - 50 + i * 20; c.globalAlpha = 1 - f; c.beginPath(); c.moveTo(x, 196 + f * 70); c.lineTo(x - 5, 212 + f * 70); c.stroke(); }
      c.globalAlpha = 1; c.textAlign = 'center'; c.fillStyle = INKS.dim; c.fillText('FORECAST', cx, 310); c.fillStyle = INKS.text; c.font = '22px Anton, Impact, sans-serif'; c.fillText('SERVED BY FASTAPI', cx, 338); c.textAlign = 'left';
    },
    (c, w, h, t) => { // forecasting: history, then two models fanning out into an uncertain future
      titleBar(c, w, 'TIME SERIES FORECASTING', 'ARIMA · VAR · DIAGNOSTICS');
      c.fillStyle = INKS.panel; rr(c, 18, 70, w - 36, 220, 12); c.fill(); rr(c, 18, 302, w - 36, h - 320, 12); c.fill();
      const x0 = 40, x1 = w - 40, now = x0 + (x1 - x0) * .64, y = v => 180 - v * 90, sh = t * .6;
      c.strokeStyle = INKS.line; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x0, 96 + i * 42); c.lineTo(x1, 96 + i * 42); c.stroke(); }
      c.fillStyle = 'rgba(61,214,255,.16)'; c.beginPath(); // the band widens the further out it looks
      for (let x = now; x <= x1; x += 6) { const k = (x - now) / (x1 - now); c.lineTo(x, y(wave(x * .02, sh) * (1 - k * .5) + k * .12) - 8 - k * 46); }
      for (let x = x1; x >= now; x -= 6) { const k = (x - now) / (x1 - now); c.lineTo(x, y(wave(x * .02, sh) * (1 - k * .5) + k * .12) + 8 + k * 46); }
      c.fill();
      c.strokeStyle = INKS.text; c.lineWidth = 3; c.beginPath(); for (let x = x0; x <= now; x += 4) { const yy = y(wave(x * .02, sh)); x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke();
      [[INKS.b, .12], [INKS.a, -.1]].forEach(([col, bias]) => { c.strokeStyle = col; c.setLineDash([9, 6]); c.beginPath(); for (let x = now; x <= x1; x += 4) { const k = (x - now) / (x1 - now), yy = y(wave(x * .02, sh) * (1 - k * .5) + k * bias); x === now ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); });
      c.setLineDash([4, 5]); c.strokeStyle = INKS.dim; c.lineWidth = 1.5; c.beginPath(); c.moveTo(now, 84); c.lineTo(now, 278); c.stroke(); c.setLineDash([]);
      c.font = '12px "Space Mono", monospace'; c.fillStyle = INKS.text; c.fillText('ACTUAL', 40, 92); c.fillStyle = INKS.b; c.fillText('ARIMA', 110, 92); c.fillStyle = INKS.a; c.fillText('VAR', 170, 92); c.fillStyle = INKS.dim; c.fillText('FORECAST', now + 8, 92);
      c.fillText('RESIDUAL ACF', 34, 322);
      const base = h - 44; c.strokeStyle = INKS.dim; c.setLineDash([5, 5]); for (const d of [-16, 16]) { c.beginPath(); c.moveTo(34, base + d); c.lineTo(w - 34, base + d); c.stroke(); } c.setLineDash([]);
      for (let i = 0; i < 30; i++) { const v = Math.sin(i * 2.1 + 1) * 11 * Math.exp(-i * .05); c.fillStyle = INKS.c; c.fillRect(44 + i * ((w - 90) / 30), Math.min(base, base - v), 6, Math.abs(v) + 1); }
    },
    (c, w, h, t) => { // stocks: candles, a moving average, and ghost candles for what the model expects
      titleBar(c, w, 'STOCK MARKET PREDICTION', 'PYTHON · ML');
      c.fillStyle = INKS.panel; rr(c, 18, 70, w - 36, h - 88, 12); c.fill();
      const n = 26, step = (w - 80) / n, off = Math.floor(t * 1.2), price = i => 200 - (wave((i + off) * .35) * 60 + (i + off) % 40);
      const Y = v => 110 + ((v - 80) / 190) * 190, ma = [];
      for (let i = 0; i < n; i++) {
        const o = price(i), cl = price(i + 1), up = cl < o, x = 44 + i * step, ghost = i >= n - 5;
        const hi = Math.min(o, cl) - 8 - (i * 7 % 9), lo = Math.max(o, cl) + 8 + (i * 5 % 7);
        c.strokeStyle = c.fillStyle = up ? INKS.up : INKS.down; c.lineWidth = 2; c.globalAlpha = ghost ? .55 : 1;
        c.beginPath(); c.moveTo(x + step * .32, Y(hi)); c.lineTo(x + step * .32, Y(lo)); c.stroke();
        if (ghost) { c.setLineDash([3, 3]); c.strokeRect(x, Y(Math.min(o, cl)), step * .64, Math.max(3, Math.abs(Y(o) - Y(cl)))); c.setLineDash([]); }
        else c.fillRect(x, Y(Math.min(o, cl)), step * .64, Math.max(3, Math.abs(Y(o) - Y(cl))));
        c.globalAlpha = .5; c.fillRect(x, h - 40 - (12 + (i * 13 + off * 5) % 26), step * .64, 12 + (i * 13 + off * 5) % 26);
        ma.push([x + step * .32, Y((o + cl) / 2 + 6)]);
      }
      c.globalAlpha = 1; c.strokeStyle = INKS.c; c.lineWidth = 2.5; c.beginPath(); ma.forEach(([x, yy], i) => i ? c.lineTo(x, yy) : c.moveTo(x, yy)); c.stroke();
      c.font = '12px "Space Mono", monospace'; c.fillStyle = INKS.c; c.fillText('MOVING AVERAGE', 34, 94); c.fillStyle = INKS.dim; c.fillText('PREDICTED', w - 150, 94); c.fillText('VOLUME', 34, h - 84);
    },
    (c, w, h, t) => { // Code Breakers: a code being cracked, one guess at a time
      c.fillStyle = '#07051a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffd60a'; c.font = '34px Anton, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CODE BREAKERS', w / 2, 30);
      c.fillStyle = '#3dd6ff'; c.font = '11px "Space Mono", monospace'; c.fillText('PYTHON GAMING HUB', w / 2, 56);
      const pegs = ['#ff3b5c', '#3dd6ff', '#ffd60a', '#19d68a', '#ff8a00', '#b06bff'], rows = 6, turnN = Math.floor(t * 1.2) % (rows + 2);
      for (let r = 0; r < rows; r++) for (let k = 0; k < 4; k++) {
        const x = 78 + k * 40, y = 84 + r * 26, live = r < turnN;
        c.fillStyle = live ? pegs[(r * 3 + k * 5 + r * k) % 6] : '#1d1a3a'; c.fillRect(x, y, 26, 18);
        if (live) { c.fillStyle = k < (r + 1) * 4 / rows ? '#19d68a' : '#4a4670'; c.fillRect(246 + k * 10, y + 5, 7, 7); }
      }
      c.fillStyle = Math.floor(t * 2.5) % 2 ? '#ff4f9a' : '#07051a'; c.font = '18px Anton, Impact, sans-serif'; c.fillText('PRESS START', w / 2, h - 18); c.textAlign = 'left';
    },
  ];
  function liveScreen(i, w, h, pixel) { // a screen that redraws itself while its project is in view
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (pixel) t.magFilter = THREE.NearestFilter;
    const m = new THREE.MeshBasicMaterial({ map: t }), sc = { live: true, redraw: time => { DRAW[i](c, w, h, time); t.needsUpdate = true; } };
    sc.redraw(i);
    if (hits[i].shot) img(hits[i].shot, real => { sc.live = false; m.map = real; m.needsUpdate = true; });
    screens[i] = sc;
    return m;
  }
  const keyGeo = new RoundedBoxGeometry(1, 1, 1, 2, .22), keyMat = phys(0x16161c, { roughness: .5 });
  function keyboard(parent, cols, rows, pitch, x0, y, z0) { // a grid of real keys
    const m = new THREE.InstancedMesh(keyGeo, keyMat, cols * rows);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      dummy.position.set(x0 + k * pitch, y, z0 + r * pitch); dummy.rotation.set(0, 0, 0); dummy.scale.set(pitch * .82, .05, pitch * .82); dummy.updateMatrix();
      m.setMatrixAt(r * cols + k, dummy.matrix);
    }
    parent.add(m);
  }
  const alu = phys(0xb9bec8, { metalness: 1, roughness: .3 }), oak = phys(0x4e2c18, { roughness: .42, clearcoat: .8, clearcoatRoughness: .3 });
  const rain = { mesh: null, drops: [] };
  const BUILD = [
    g => { // the laptop, with weather of its own
      add(g, cyl(1.7, 2, 1.5, 64), steel, [0, .75, 0]);
      add(g, new THREE.TorusGeometry(1.72, .03, 8, 72), neon(0xffffff, 2.4, 1), [0, 1.5, 0], [Math.PI / 2, 0, 0]);
      const lap = group(g, [0, 1.5, .2]); lap.rotation.y = -.25;
      add(lap, rbox(5, .16, 3.4, .08), alu, [0, .08, 0]);
      add(lap, rbox(4.5, .012, 1.72, .005), black, [0, .162, -.62]);
      keyboard(lap, 14, 5, .31, -2.015, .175, -1.3);
      add(lap, rbox(1.7, .012, 1, .005), phys(0x9da2ad, { metalness: 1, roughness: .18 }), [0, .162, .98]);
      const lid = group(lap, [0, .16, -1.7]); lid.rotation.x = -.3;
      add(lid, rbox(5, 3.3, .1, .06), alu, [0, 1.65, 0]);
      add(lid, rbox(4.84, 3.14, .02, .01), black, [0, 1.65, .05]);
      add(lid, new THREE.PlaneGeometry(4.6, 2.875), liveScreen(0, 640, 400), [0, 1.62, .064]);
      add(lid, new THREE.SphereGeometry(.025, 8, 6), black, [0, 3.16, .06]);
      add(lid, cyl(.3, .3, .012, 40), chrome, [0, 1.65, -.052], [Math.PI / 2, 0, 0]);
      add(lap, cyl(.07, .07, 4.4, 12), steel, [0, .16, -1.7], [0, 0, Math.PI / 2]);
      const cloudMat = phys(0xf2f4fa, { roughness: .85, sheen: 1, sheenColor: 0xffffff }), cl = group(g, [-2.5, 5, -.5]); cl.scale.setScalar(.8);
      for (const [x, y, z, r] of [[-1.1, 0, 0, .62], [-.35, .3, .1, .8], [.5, .22, -.1, .72], [1.2, -.02, 0, .55], [.1, -.12, .35, .62], [-.6, -.1, -.3, .55]]) add(cl, new THREE.SphereGeometry(r, 28, 20), cloudMat, [x, y, z]);
      bobbers.push({ o: cl, y: 5, amp: .12, rot: 0, ph: 2 });
      rain.mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.018, .2, 3, 6), neon(0xffffff, 2.2, 1), 46); rain.mesh.frustumCulled = false; g.add(rain.mesh);
      for (let i = 0; i < 46; i++) rain.drops.push({ x: rnd(-1.1, 1.1), z: rnd(-.4, .4), ph: Math.random(), sp: rnd(.55, .9) });
    },
    g => { // the forecasting desk
      add(g, rbox(7.4, .14, 3.2, .05), oak, [0, 1.5, 0]);
      for (const x of [-3.3, 3.3]) { add(g, rbox(.12, 1.44, 2.6, .04), steel, [x, .72, 0]); add(g, rbox(.5, .06, 3, .02), steel, [x, .03, 0]); }
      add(g, cyl(1, 1.05, .06, 48), alu, [0, 1.6, -.7]); add(g, rbox(.34, 1.3, .16, .05), alu, [0, 2.2, -.86]);
      const mon = group(g, [0, 3.45, -.7]); mon.rotation.x = -.04;
      add(mon, rbox(6.6, 3.5, .2, .08), black); add(mon, rbox(6.4, .16, .22, .04), alu, [0, -1.72, 0]);
      add(mon, new THREE.PlaneGeometry(6.4, 3.2), liveScreen(1, 800, 400), [0, .06, .105]);
      add(mon, rbox(.3, .03, .03, .01), neon(0xffffff, 2.6, 0), [2.9, -1.72, .12]);
      const kb = group(g, [-.5, 1.57, .75]); add(kb, rbox(3.1, .08, 1.02, .04), alu, [0, .04, 0]); keyboard(kb, 15, 4, .195, -1.365, .1, -.29);
      add(g, new THREE.SphereGeometry(.24, 24, 16), plastic(0xf2f2f4), [1.9, 1.63, .8]).scale.set(.8, .42, 1.25);
      const mug = group(g, [2.9, 1.57, .3]); // every forecaster's other tool
      add(mug, cyl(.26, .23, .56, 32), phys(0xf4f1e8, { roughness: .25, clearcoat: 1 }), [0, .28, 0]);
      add(mug, new THREE.TorusGeometry(.16, .045, 10, 24, Math.PI), phys(0xf4f1e8, { roughness: .25, clearcoat: 1 }), [.27, .28, 0], [0, 0, -Math.PI / 2]);
      add(mug, cyl(.225, .225, .02, 32), phys(0x2a1608, { roughness: .2 }), [0, .52, 0]);
      const pts = Array.from({ length: 26 }, (_, i) => new V3(-3.4 + i * .272, 5.62 + wave(i * .34) * .32 + (i > 16 ? (i - 16) * .03 : 0), -.7)), cut = 17; // the series, lifted off the screen
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, cut + 1)), 80, .05, 10), chrome);
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(cut)), 50, .05, 10), neon(0xffffff, 2.6, 0));
      add(g, new THREE.SphereGeometry(.13, 16, 12), neon(0xffffff, 3, 1), pts[cut].toArray());
    },
    g => { // the trading floor: candlesticks you could pick up
      add(g, rbox(6.6, .5, 1.5, .08), steel, [0, .25, 1.5]);
      add(g, rbox(6.4, .04, 1.3, .02), black, [0, .5, 1.5]);
      add(g, rbox(6.5, .04, .05, .015), neon(0xffffff, 2.4, 1), [0, .5, 2.22]);
      const green = plastic(0x19d68a), red = plastic(0xff3b5c), path = [];
      [.9, 1.5, 1.1, 1.9, 1.5, 2.4, 2, 2.9, 2.5, 3.3].forEach((v, i, arr) => {
        const up = !i || v > arr[i - 1], lo = Math.min(v, arr[i - 1] ?? v * .7) * .55, hgt = Math.max(.3, Math.abs(v - (arr[i - 1] ?? v * .7)) * .9), x = -2.8 + i * .62;
        const cg = group(g, [x, .52, 1.5]);
        add(cg, cyl(.025, .025, hgt + .7, 8), chrome, [0, lo + hgt / 2, 0]);
        add(cg, rbox(.36, hgt, .36, .05), up ? green : red, [0, lo + hgt / 2, 0]);
        candles.push(cg); path.push(new V3(x, .52 + lo + hgt + .55, 1.5));
      });
      add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 80, .035, 8), neon(0xffffff, 2.6, 0));
      const tip = add(g, new THREE.ConeGeometry(.13, .34, 12), neon(0xffffff, 2.6, 0), path[path.length - 1].toArray()); tip.rotation.z = -.9;
      add(g, cyl(.06, .06, 3.3, 12), chrome, [0, 1.65, -.9]); add(g, cyl(.9, 1, .08, 48), steel, [0, .04, -.9]);
      const tab = group(g, [0, 3.9, -.75]); tab.rotation.x = -.14;
      add(tab, rbox(5, 3.6, .14, .12), alu); add(tab, rbox(4.84, 3.44, .02, .1), black, [0, 0, .07]);
      add(tab, new THREE.PlaneGeometry(4.6, 3.28), liveScreen(2, 560, 400), [0, 0, .084]);
      add(tab, new THREE.SphereGeometry(.025, 8, 6), black, [0, 1.66, .08]);
    },
    g => { // the arcade cabinet
      const cab = group(g, [0, .34, 0]); cab.scale.setScalar(.88); cab.rotation.y = -.3;
      add(g, cyl(2.5, 2.7, .34, 64), steel, [0, .17, 0]);
      const sh = new THREE.Shape(); // the classic side profile: x runs front to back, y is up
      [[-1.3, 0], [1.3, 0], [1.3, 2], [1.75, 2.22], [1.75, 2.44], [1, 2.75], [.7, 4.7], [1.35, 4.95], [1.35, 5.7], [-1.3, 5.7]].forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
      const sideGeo = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 3 }), sideMat = plastic(0x6a2cff);
      for (const x of [-1.5, 1.62]) add(cab, sideGeo, sideMat, [x, 0, 0], [0, -Math.PI / 2, 0]);
      for (const x of [-1.64, 1.64]) for (const [y, hgt] of [[1.2, .1], [1.45, .05]]) add(cab, rbox(.02, hgt, 2.2, .005), neon(0xffffff, 2.2, x < 0 ? 0 : 1), [x, y, 0]);
      add(cab, rbox(3, 5.6, .1, .03), black, [0, 2.85, -1.25]); add(cab, rbox(3.1, .1, 2.75, .03), black, [0, 5.72, .02]);
      add(cab, rbox(3, 2, .1, .03), phys(0x101018, { roughness: .5 }), [0, 1, 1.25]);
      add(cab, rbox(1, 1.15, .05, .03), steel, [0, .95, 1.31]);
      for (const x of [-.22, .22]) { add(cab, rbox(.26, .36, .04, .02), black, [x, 1.1, 1.345]); add(cab, rbox(.05, .2, .02, .005), neon(0xff2030, 3), [x, 1.1, 1.37]); }
      const panel = group(cab, [0, 2.36, 1.32]); panel.rotation.x = .28;
      add(panel, rbox(3, .14, 1.05, .04), black);
      add(panel, cyl(.2, .24, .08, 24), steel, [-.85, .1, 0]); add(panel, cyl(.035, .035, .5, 10), chrome, [-.85, .36, 0]); add(panel, new THREE.SphereGeometry(.15, 24, 16), plastic(0xff2e63), [-.85, .64, 0]);
      [[.1, -.12], [.5, -.2], [.9, -.12], [.3, .22], [.7, .16]].forEach(([x, z], i) => { add(panel, cyl(.13, .14, .05, 24), chrome, [x, .08, z]); add(panel, cyl(.1, .1, .1, 24), plastic(CANDY[i]), [x, .1, z]); });
      const tube = group(cab, [0, 3.72, .82]); tube.rotation.x = -.153;
      add(tube, rbox(3, 2.1, .1, .03), black, [0, 0, -.06]);
      add(tube, screenGeo, liveScreen(3, 320, 256, true), [0, 0, .02]).scale.set(2.5, 1.84, 1);
      add(tube, screenGeo, sheen, [0, 0, .035]).scale.set(2.5, 1.84, 1);
      add(cab, new THREE.PlaneGeometry(2.9, .32), new THREE.MeshBasicMaterial({ map: grille, color: 0x303038 }), [0, 4.78, 1.02], [.37, 0, 0]);
      const marquee = new THREE.MeshBasicMaterial({ map: tex(512, 128, (c, w, h) => { // lit from behind
        const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff2e88'); gr.addColorStop(.5, '#ffd60a'); gr.addColorStop(1, '#00e5ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.fillStyle = '#0b0b0f'; c.font = '78px Anton, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CODE BREAKERS', w / 2, h / 2 + 5);
      }) }); marquee.color.setScalar(1.5);
      add(cab, rbox(3, .74, .08, .03), black, [0, 5.32, 1.33]); add(cab, new THREE.PlaneGeometry(2.86, .62), marquee, [0, 5.32, 1.375]);
      add(cab, rbox(2.8, .05, .05, .02), neon(0xffffff, 2.4, 0), [0, .04, 1.32]);
    },
  ];
  hits.forEach((hp, i) => {
    const side = i % 2 ? -1 : 1, z = P0 - i * PG;
    plinth(side * 9, z, 4.7, i % 2);
    const g = group(scene, [side * 9, .8, z]); g.rotation.y = -side * Math.PI / 2;
    const inner = group(g); turn[7 + i] = [];
    if (BUILD[i]) BUILD[i](inner);
    turnable(7 + i, inner, 0, .1);
  });
  let hitOn = 0, focus = 0, screenAt = 0;

  /* ---------- 5 · the mixing desk ---------- */
  const zD = zP - 30;
  const desk = group(scene, [-9, 2.5, zD]); desk.rotation.set(.5, .72, 0, 'YXZ');
  add(desk, rbox(9.4, .9, 4.8, .2), steel);
  add(desk, rbox(9, .06, 4.4, .03), black, [0, .46, 0]);
  add(scene, cyl(.5, .9, 2.4, 32), steel, [-9, 1.1, zD]);
  const faders = [], meters = [];
  for (let i = 0; i < 8; i++) {
    const x = -3.9 + i * .78;
    add(desk, new THREE.BoxGeometry(.1, .03, 2.2), rubber, [x, .5, .7]);
    faders.push(add(desk, rbox(.4, .22, .5, .06), plastic(CANDY[i % CANDY.length]), [x, .6, .7]));
    const col = [];
    for (let k = 0; k < 6; k++) col.push(add(desk, rbox(.42, .05, .16, .02), ledOff, [x, .5, -.9 - k * .22]));
    meters.push(col);
  }
  for (let i = 0; i < 6; i++) {
    const p = [2.9 + (i % 2) * .9, .62, -1.3 + Math.floor(i / 2) * 1.3];
    add(desk, cyl(.28, .32, .3, 32), chrome, p);
    add(desk, cyl(.2, .2, .32, 24), plastic(CANDY[i]), p);
  }

  /* ---------- 6 · the turntable ---------- */
  const zT = zD - 30;
  const deck = group(scene, [9, 2.4, zT]); deck.rotation.set(.52, -.62, 0, 'YXZ');
  add(deck, rbox(8.2, .9, 6.4, .22), phys(0x4e2c18, { roughness: .42, clearcoat: .8, clearcoatRoughness: .3 }));
  add(deck, rbox(7.8, .08, 6, .03), steel, [0, .46, 0]);
  add(scene, cyl(.5, .9, 2.4, 32), steel, [9, 1.05, zT]);
  add(deck, cyl(2.75, 2.75, .22, 96), chrome, [-.9, .6, 0]);
  const platter = group(deck, [-.9, .76, 0]);
  add(platter, cyl(2.55, 2.55, .07, 96), vinyl);
  const deckLabel = plastic(0xff2e63);
  add(platter, cyl(.9, .9, .09, 48), deckLabel);
  add(platter, new THREE.BoxGeometry(.7, .1, .12), cream, [.3, 0, 0]);
  add(platter, cyl(.07, .07, .2, 16), chrome);
  spinners.push({ o: platter, axis: 'y', speed: 2.2 });
  add(deck, cyl(.36, .42, .5, 32), chrome, [3, .72, -2.2]);
  const arm = group(deck, [3, .98, -2.2]); arm.rotation.y = -.42;
  add(arm, cyl(.06, .06, 3.5, 12), chrome, [0, 0, 1.75], [Math.PI / 2, 0, 0]);
  add(arm, rbox(.36, .2, .6, .05), black, [0, -.05, 3.5]);
  add(arm, cyl(.2, .2, .5, 20), steel, [0, 0, -.4], [Math.PI / 2, 0, 0]);
  for (const z of [1.6, 2.4]) add(deck, cyl(.24, .24, .2, 32), chrome, [3, .56, z]);
  add(deck, rbox(.5, .08, .2, .03), neon(0xffffff, 2.6, 0), [3, .52, .8]);
  const lid = group(deck, [0, .45, -3.1]); lid.rotation.x = -1.05; // the dust cover, propped open
  add(lid, rbox(8, .08, 6.2, .04), glass, [0, 0, 3.1]);

  /* ---------- 7 · the broadcast tower ---------- */
  const zF = zT - 40, TOWER_H = 17, towerTop = new V3(0, TOWER_H + 3.3, zF);
  plinth(0, zF, 7.2, 0);
  const tower = group(scene, [0, .8, zF]), girder = phys(0x9aa0b4, { metalness: 1, roughness: .3 });
  const corner = (k, c) => { const w = lerp(2.3, .35, k / 6), y = k * TOWER_H / 6; return new V3(c < 2 ? -w : w, y, c % 2 ? -w : w); };
  const ringOrder = [0, 1, 3, 2];
  for (let k = 0; k < 6; k++) for (let q = 0; q < 4; q++) {
    const c0 = ringOrder[q], c1 = ringOrder[(q + 1) % 4];
    beam(tower, corner(k, c0), corner(k + 1, c0), .1, girder);
    beam(tower, corner(k + 1, c0), corner(k + 1, c1), .055, girder);
    beam(tower, corner(k, c0), corner(k + 1, c1), .045, girder);
    add(tower, new THREE.SphereGeometry(.09, 12, 8), neon(0xffffff, 3, k % 2), corner(k + 1, c0).toArray());
  }
  add(tower, cyl(.08, .12, 2.4, 12), chrome, [0, TOWER_H + 1.2, 0]);
  const beacon = add(tower, new THREE.SphereGeometry(.24, 20, 16), neon(0xff1238, 4), [0, TOWER_H + 2.5, 0]);
  const dish = group(tower, [1.7, TOWER_H * .55, 1]); dish.rotation.set(-.75, 0, -.75);
  add(dish, new THREE.SphereGeometry(1.7, 48, 20, 0, Math.PI * 2, 0, 1.05), phys(0xdfe3ea, { metalness: .9, roughness: .3, side: THREE.DoubleSide }), [0, -1.7, 0]).rotation.x = Math.PI;
  add(dish, cyl(.03, .03, 1.5, 8), chrome, [0, .6, 0]);
  add(dish, new THREE.SphereGeometry(.12, 16, 12), neon(0xffffff, 3, 1), [0, 1.35, 0]);
  const waveGeo = new THREE.TorusGeometry(1, .025, 8, 96);
  const waves = [0, 1, 2].map(i => { // the signal leaving the tower
    const m = add(scene, waveGeo, neon(0xffffff, 2.6, 0, { transparent: true, depthWrite: false }), [0, towerTop.y, zF], [Math.PI / 2, 0, 0]);
    m.userData.ph = i / 3; return m;
  });

  /* ---------- speaker stacks along the road ---------- */
  function stack(x, z, face) {
    const g = group(scene, [x, 0, z]); g.rotation.y = face;
    add(g, rbox(2.6, 5.4, 2.2, .16), plastic(0x0d0d12, { roughness: .5 }), [0, 2.7, 0]);
    speaker(g, 0, 3.9, 1.12, .82); speaker(g, 0, 1.6, 1.12, 1);
    add(g, rbox(2.2, .05, .05, .02), neon(0xffffff, 2.4, 1), [0, 5.2, 1.12]);
  }
  stack(-7.6, -14, Math.PI / 2); stack(-7.6, TAPE_Z0 - 8, Math.PI / 2); stack(-7.6, TAPE_Z0 - 28, Math.PI / 2);
  stack(-10.5, zF - 3, .6); stack(10.5, zF - 3, -.6);

  /* ---------- the glass road ---------- */
  const TILE = 2.5, COLS = 5, FZ0 = 24, ROWS = Math.ceil((FZ0 - (zF - 14)) / TILE), roadLen = ROWS * TILE, roadMid = FZ0 - roadLen / 2 + TILE / 2;
  const road = new THREE.InstancedMesh(rbox(TILE - .1, .24, TILE - .1, .04), phys(0x0b0912, { roughness: .16, metalness: .75 }), COLS * ROWS);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    dummy.position.set((c - (COLS - 1) / 2) * TILE, -.12, FZ0 - r * TILE); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    road.setMatrixAt(r * COLS + c, dummy.matrix);
  }
  scene.add(road);
  for (const [x, slot] of [[-COLS * TILE / 2 - .1, 0], [COLS * TILE / 2 + .1, 1]]) add(scene, new THREE.BoxGeometry(.07, .07, roadLen), neon(0xffffff, 2.4, slot), [x, .02, roadMid]);
  const GLOW = 18, glowGeo = new THREE.PlaneGeometry(TILE - .2, TILE - .2); glowGeo.rotateX(-Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const glowTiles = new THREE.InstancedMesh(glowGeo, glowMat, GLOW); glowTiles.frustumCulled = false; scene.add(glowTiles);
  // gates of light the road passes through
  const gateZ = [-10, TAPE_Z0 + 12, TAPE_Z0 - (tapes.length - 1) * TAPE_GAP - 14, G1 - 14, zP - 15, zD - 15, zT - 18];
  gateZ.forEach((z, i) => {
    add(scene, new THREE.TorusGeometry(15, .22, 12, 120), steel, [0, 4, z]);
    add(scene, new THREE.TorusGeometry(14.7, .05, 8, 120), neon(0xffffff, 2.6, i % 2), [0, 4, z]);
  });

  /* ---------- the universe ---------- */
  const zMid = zF / 2;
  { // far stars keep their size; near dust drifts past
    const n = 3800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      tmpV.randomDirection().multiplyScalar(rnd(520, 1500)); tmpV.z += zMid;
      tmpV.toArray(pos, i * 3);
      const k = rnd(.25, 1) ** 2, w = Math.random();
      tmpC.setRGB(k * (w < .2 ? 1 : .8), k * .85, k * (w > .75 ? 1 : .8)).toArray(col, i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    stars.frustumCulled = false; scene.add(stars); darkOnly.push(stars);
    const m = 900, dp = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) { dp[i * 3] = rnd(-70, 70); dp[i * 3 + 1] = rnd(-25, 55); dp[i * 3 + 2] = rnd(40, zF - 70); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .32, map: dot, color: 0x9aa4ff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust); darkOnly.push(dust);
  }
  const clouds = [cloud(), cloud(), cloud()];
  const nebula = Array.from({ length: 16 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: clouds[i % 3], transparent: true, opacity: rnd(.1, .22), depthWrite: false, blending: THREE.AdditiveBlending, fog: false, rotation: rnd(0, 6.3) }));
    const side = i % 2 ? -1 : 1;
    s.position.set(side * rnd(170, 420), rnd(-120, 220), lerp(120, zF - 260, i / 15) + rnd(-40, 40));
    s.scale.setScalar(rnd(260, 520)); s.userData.slot = i % 3 === 2 ? 1 : 0;
    scene.add(s); return s;
  });
  darkOnly.push(...nebula);
  { // a ringed planet and its moon
    const bands = tex(512, 256, (g, w, h) => {
      const cols = ['#2a1a4a', '#5a2a6a', '#b4506a', '#e0a070', '#6a3a7a', '#1c1238'];
      for (let y = 0; y < h; y++) { g.fillStyle = cols[Math.floor((Math.sin(y * .11) * .5 + .5 + Math.sin(y * .37) * .2) * 4.9 + .5) % cols.length]; g.globalAlpha = .9; g.fillRect(0, y, w, 1); }
      g.globalAlpha = .12; for (let i = 0; i < 300; i++) { g.fillStyle = Math.random() < .5 ? '#fff' : '#000'; g.fillRect(rnd(0, w), rnd(0, h), rnd(10, 70), rnd(1, 3)); }
    });
    const planet = group(scene, [330, 60, zMid + 30]); planet.rotation.z = .35; darkOnly.push(planet);
    add(planet, new THREE.SphereGeometry(105, 96, 64), new THREE.MeshStandardMaterial({ map: bands, roughness: 1, fog: false }));
    add(planet, new THREE.SphereGeometry(110, 64, 48), neon(0xffffff, .5, 0, { side: THREE.BackSide, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const ringTex = tex(512, 512, (g, w) => {
      for (let r = 150; r < 254; r += 2) { g.strokeStyle = `rgba(255,230,210,${rnd(.05, .6)})`; g.lineWidth = 2; g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
    });
    add(planet, new THREE.RingGeometry(124, 214, 128), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false, opacity: .8 }), [0, 0, 0], [Math.PI / 2 - .12, 0, 0]);
    darkOnly.push(add(scene, new THREE.SphereGeometry(26, 48, 32), new THREE.MeshStandardMaterial({ color: 0x8d86a8, roughness: 1, fog: false }), [-260, 150, zF - 120]));
  }
  const rockGeo = new THREE.IcosahedronGeometry(1, 2);
  { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { tmpV.fromBufferAttribute(p, i); tmpV.multiplyScalar(1 + .22 * Math.sin(tmpV.x * 3.1 + tmpV.y * 1.7) * Math.cos(tmpV.z * 2.3) + .1 * Math.sin(tmpV.y * 7)); p.setXYZ(i, tmpV.x, tmpV.y, tmpV.z); } rockGeo.computeVertexNormals(); }
  const drift = (geo, mat, n, sMin, sMax) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n), data = [];
    for (let i = 0; i < n; i++) {
      const side = Math.random() < .5 ? -1 : 1;
      data.push({ x: side * rnd(17, 95), y: rnd(-32, 46), z: rnd(40, zF - 80), s: rnd(sMin, sMax), ph: rnd(0, 6.3), sp: rnd(.08, .4) });
      mesh.setColorAt(i, tmpC.set(CANDY[i % CANDY.length]));
    }
    mesh.frustumCulled = false; scene.add(mesh);
    return { mesh, data };
  };
  const drifters = [
    drift(rockGeo, phys(0xffffff, { roughness: .9, metalness: .1, color: 0x3a3542 }), 90, .6, 4.5),
    drift(new THREE.OctahedronGeometry(1, 0), phys(0xffffff, { roughness: .08, metalness: .7, iridescence: 1, iridescenceIOR: 1.9, flatShading: true }), 26, .5, 1.3),
    drift(new THREE.TorusGeometry(.8, .28, 20, 48), phys(0xffffff, { roughness: .15, metalness: .9, clearcoat: 1 }), 18, .5, 1.2),
  ];
  drifters[0].mesh.instanceColor = null; // rocks stay rock coloured
  darkOnly.push(drifters[0].mesh);

  /* ---------- the daytime sky (light theme): a sunburst whose rays meet down the road ---------- */
  const skyMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0,
    map: tex(1024, 8, (g, w, h) => { for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d4d4d4'; g.fillRect(i * w / 24, 0, w / 24 + 1, h); } }) });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1900, 48, 24), skyMat);
  sky.rotation.x = Math.PI / 2; sky.renderOrder = -1; sky.visible = false; scene.add(sky);
  const ZAXIS = new V3(0, 0, 1), DARK = new THREE.Color(0x04020a), INK = new THREE.Color(0x0b0b0f), bgTo = new THREE.Color(0xff4f1f), cBg = bgTo.clone();

  /* ---------- The Static ---------- */
  const N = 56, segPos = Array.from({ length: N + 1 }, () => new V3());
  const hide = phys(0x1a1030, { metalness: 1, roughness: .2, iridescence: 1, iridescenceIOR: 2.1 });
  const veins = neon(0xffffff, 3, -1), eyeMat = neon(0xffffff, 4, -1);
  const segBody = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), hide, N);
  const segRing = new THREE.InstancedMesh(new THREE.TorusGeometry(1.01, .05, 8, 40), veins, N);
  const spineN = 14, spines = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 12), hide, spineN);
  for (const m of [segBody, segRing, spines]) { m.frustumCulled = false; scene.add(m); darkOnly.push(m); }
  const head = group(scene); head.scale.setScalar(2.5); darkOnly.push(head);
  add(head, new THREE.SphereGeometry(1, 48, 32), hide).scale.set(1, .9, 1.5);
  add(head, new THREE.SphereGeometry(.42, 32, 24), eyeMat, [0, .1, 1.28]);
  add(head, new THREE.SphereGeometry(.2, 16, 12), black, [0, .1, 1.62]).scale.set(.45, 1.5, .5);
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) add(head, new THREE.SphereGeometry(.09, 12, 8), eyeMat, [side * (.86 - k * .05), .25, .7 - k * .42]);
  for (let k = 0; k < 9; k++) { // a crown of antennae
    const a = k / 9 * Math.PI * 2, c = add(head, new THREE.ConeGeometry(.12, 1.7, 10), hide, [Math.cos(a) * .82, Math.sin(a) * .74, -.6]);
    c.rotation.set(-1.15, 0, 0); c.rotateOnWorldAxis(new V3(0, 0, 1), a - Math.PI / 2);
    add(c, new THREE.SphereGeometry(.07, 8, 6), veins, [0, .9, 0]);
  }
  const jaws = [0, 1, 2, 3].map(k => {
    const piv = group(head, [0, .1, 1]); piv.rotation.z = k * Math.PI / 2 + Math.PI / 4;
    const j = group(piv, [.62, 0, 0]);
    add(j, new THREE.ConeGeometry(.16, 1.5, 10), hide, [0, 0, .7], [Math.PI / 2, 0, 0]);
    return j;
  });
  const cr = { c: new V3(0, 16, -40), R: 36, tau: 0 };
  function staticP(tau, out) {
    out.set(cr.c.x + Math.sin(tau * .55) * cr.R, cr.c.y + Math.sin(tau * .93) * 7 + Math.cos(tau * .31) * 4, cr.c.z + Math.cos(tau * .55) * cr.R * .7 + Math.sin(tau * 1.3) * 5);
  }

  /* ---------- lightning ---------- */
  const boltMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const bolts = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), boltMat); m.frustumCulled = false; m.visible = false; scene.add(m); return m; });
  const zapLight = new THREE.PointLight(0xffffff, 0, 0, 2); scene.add(zapLight);
  let boltLife = 0;
  function jag(a, b, n, amp) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, w = Math.sin(Math.PI * k) * amp;
      pts.push(new V3(lerp(a.x, b.x, k) + rnd(-w, w), lerp(a.y, b.y, k) + rnd(-w, w) * .4, lerp(a.z, b.z, k) + rnd(-w, w)));
    }
    return pts;
  }
  function strike() {
    const cz = camera.position.z, finale = cz < zF + 70;
    const top = finale ? new V3(rnd(-40, 40), 150, zF + rnd(-30, 10)) : new V3((Math.random() < .5 ? -1 : 1) * rnd(30, 110), 130, cz - rnd(60, 150));
    const end = finale ? towerTop.clone() : new V3(top.x + rnd(-30, 30), -70, top.z + rnd(-20, 20));
    const main = jag(top, end, 16, 10);
    bolts.forEach((m, i) => {
      let pts = main, r = .26;
      if (i) { const from = main[3 + i * 4]; pts = jag(from, new V3(from.x + rnd(-40, 40), from.y - rnd(25, 60), from.z + rnd(-25, 25)), 7, 4); r = .11; }
      m.geometry.dispose();
      m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .05), pts.length * 3, r, 5);
      m.visible = true;
    });
    mix.copy(cA).lerp(RED, deadK);
    boltMat.color.copy(mix).multiplyScalar(3.2); zapLight.color.copy(mix);
    zapLight.position.lerpVectors(top, end, .62);
    boltLife = 1;
    onZap();
  }

  /* ---------- light ---------- */
  const amb = new THREE.AmbientLight(0x8890ff, .22); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff1e0, 1.5); sun.position.set(6, 5, 4); scene.add(sun);
  const lampA = new THREE.PointLight(0xffffff, 0, 70, 1.7), lampB = new THREE.PointLight(0xffffff, 0, 70, 1.7);
  scene.add(lampA, lampB);

  // music notes that fly out of the boombox
  const noteTexs = ['♪', '♫', '♬'].map(ch => tex(128, 128, g => {
    g.font = 'bold 104px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ch, 64, 70);
  }));
  const notes = Array.from({ length: 12 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTexs[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false; scene.add(s);
    return { s, life: 0, v: new V3() };
  });
  let noteI = 0;
  function throwNote() {
    const n = notes[noteI++ % notes.length], side = noteI % 2 ? -1.32 : 1.32;
    boom.localToWorld(tmpV.set(side, .2, 1));
    n.s.position.copy(tmpV); n.s.material.map = noteTexs[noteI % 3]; n.s.material.color.copy(themeTo ? pal[noteI % 3] : INK).multiplyScalar(themeTo ? 1.6 : 1);
    n.s.scale.setScalar(rnd(.6, .9)); n.s.visible = true; n.life = 1;
    n.v.set(side * rnd(.5, 1.5), rnd(2, 3.4), rnd(.6, 1.6));
  }

  /* ---------- the camera's route: stops per zone ----------
     p: where the camera stands, l: what it looks at, sx/sy: how far the subject is pushed
     right/up on screen to leave room for the cards. A pinned zone glides through its first g
     stops (two unless it says otherwise) while its section stays put; the rest are the way out. */
  const S = (p, l, sx = 0, sy = 0) => ({ p: new V3(...p), l: new V3(...l), sx, sy });
  const tapeEnd = TAPE_Z0 - Math.max(0, tapes.length - 1) * TAPE_GAP;
  const ROUTE = [
    { stops: [S([0, 3.4, 15], [0, 2.9, 0], .82), S([-9.5, 5.2, 5], [0, 2.6, 0], .3)] },
    { stops: [S([-2, 3.6, -9], [7, 3.9, -24], .62)] },
    { pin: true, stops: [S([-4.5, 3.6, TAPE_Z0 + 1.5], [10, 3.3, TAPE_Z0], .5, .75), S([-4.5, 3.6, tapeEnd + 1.5], [10, 3.3, tapeEnd], .5, .75), S([-1, 4.8, tapeEnd - 9], [0, 3, tapeEnd - 26], 0, .3)] },
    { pin: true, g: 8, stops: [
      S([2, 4.3, D0 + 6], [-9, 3.7, D0], .45, .1), S([-2, 4.2, D0 - GAP + 6], [9, 3.6, D0 - GAP], .45, .1),
      S([4, 5, D0 - 2 * GAP + 6.5], [-9, 4.6, D0 - 2 * GAP], .45, -.25), S([-2, 4.2, D0 - 3 * GAP + 6], [9, 3.3, D0 - 3 * GAP], .45, .1),
      S([2, 4.7, D0 - 4 * GAP + 6], [-9, 3.3, D0 - 4 * GAP], .45, .1),
      S([2.5, 4.4, bbZ0 + 27], [0, 6.8, bbZ0 - 8], .34, .1), S([-1, 4.8, bbZ0 - 11], [2.5, 6.9, bbZ0 - 36], .3, .1),
      S([7, 3.2, zG + 24], [-12, 11.5, zG + 1], .3, 0),
      S([1, 4.8, G1 - 8], [1, 3.4, G1 - 26], 0, .2)] },
    { pin: true, g: Math.max(2, hits.length), stops: [
      ...(hits.length > 1 ? hits : [0, 0]).map((_, i) => { const side = i % 2 ? -1 : 1, z = P0 - i * PG; return S([-side * 6.5, 4.4, z + 3.8], [side * 9, 3.5, z], .5, .62); }),
      S([0, 4.8, zP - 10], [0, 3.2, zP - 26], 0, .3)] },
    { stops: [S([2, 5.4, zD + 13], [-8, 2.3, zD], -.62)] },
    { stops: [S([-2, 6.4, zT + 13], [8, 1.6, zT], .86)] },
    { stops: [S([0, 4.4, zF + 30], [0, 10, zF], .62)] },
  ];
  const stops = ROUTE.flatMap(z => z.stops);
  let a0 = 0;
  const zones = ROUTE.map(z => { const o = { a: a0, k: z.stops.length, pin: !!z.pin, g: z.g || 2 }; a0 += o.k; return o; });
  const posCurve = new THREE.CatmullRomCurve3(stops.map(s => s.p), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(stops.map(s => s.l), false, 'centripetal');
  const camP = new V3(), camL = new V3();
  const introP = new V3(-1.584, 2.926, 1.55), introL = new V3(-1.584, 2.926, 0);
  let u = 0, introT0 = reduced ? -1 : null, introDur = 1.5;

  /* ---------- clicking the work, and dragging to turn it ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function hit(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(pickables, false)[0];
    return h && h.distance < 55 ? h.object : null;
  }
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { dragOn = true; dragX = e.clientX; dragMoved = 0; });
  addEventListener('pointerup', () => { dragOn = false; });
  canvas.addEventListener('pointermove', e => {
    if (dragOn) {
      const dx = e.clientX - dragX; dragX = e.clientX; dragMoved += Math.abs(dx); dragV = dx * .011;
      for (const tb of turn[focus] || []) tb.a += dragV;
      canvas.style.cursor = 'grabbing';
    } else canvas.style.cursor = hit(e) ? 'pointer' : (turn[focus] || []).length ? 'grab' : '';
  });
  canvas.addEventListener('click', e => {
    if (dragMoved > 6) return;
    const o = hit(e); if (!o) return;
    const k = o.userData.pick; if (k.fn) k.fn(); else onPick(k.slug);
  });

  const clock = new THREE.Clock();
  let beatAt = -10, beatN = 0, keyI = 0, needleTo = -.45, pointer = { x: 0, y: 0 }, playing = false, deadK = 1, lastW = 0, lastH = 0, nF = 0, slow = 0, q = 0;
  let themeK = 1, themeTo = 1, lungeUntil = 0, snapBg = false; // 1 is dark, 0 is light

  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta(), dt = Math.min(raw, .05), t = clock.elapsedTime;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    // slow machine: first drop the resolution, then the bloom
    if (adaptive && q < 2 && ++nF > 50) {
      slow = raw > .05 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 45) { q++; slow = 0; pr = q === 1 ? 1 : .75; if (q === 2) bloom.enabled = false; renderer.setPixelRatio(pr); composer.setPixelRatio(pr); lastW = 0; }
    }
    if (w !== lastW || h !== lastH) { renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.fov = w < h ? 58 : 40; lastW = w; lastH = h; }
    const b = reduced ? 0 : Math.exp(-(t - beatAt) * 7), live = reduced ? 0 : 1;
    deadK += ((playing || !themeTo ? 0 : 1) - deadK) * Math.min(1, Math.min(raw, .25) * 1.4);

    // theme: night and day share everything but the sky and the light
    themeK += (themeTo - themeK) * Math.min(1, Math.min(raw, .25) * 3);
    const K = themeK;
    cBg.lerp(bgTo, Math.min(1, dt * 3));
    scene.background.copy(cBg).lerp(DARK, K); scene.fog.color.copy(scene.background); scene.fog.density = lerp(.003, .0052, K);
    sky.visible = K < .985; skyMat.opacity = 1 - K; skyMat.color.copy(cBg); sky.position.copy(camera.position); sky.rotateOnWorldAxis(ZAXIS, dt * .025 * live);
    amb.intensity = lerp(1.1, .22, K); amb.color.setRGB(lerp(1, .53, K), lerp(1, .56, K), 1);
    sun.intensity = lerp(2.4, 1.5, K); bloom.strength = lerp(.1, .42, K);

    // colours ease to the stop's palette; dead air bleeds red into everything
    cA.lerp(pal[0], Math.min(1, dt * 3)); cB.lerp(pal[1], Math.min(1, dt * 3));
    for (const n of neons) n.m.color.copy(n.slot ? cB : cA).lerp(RED, deadK * .6).multiplyScalar(lerp(1, n.k * (.7 + b * .3), K));
    for (const s of nebula) s.material.color.copy(s.userData.slot ? cB : cA).lerp(RED, deadK * .75).multiplyScalar(.6);
    scene.environmentIntensity = lerp(.95, lerp(.32, .2, deadK), K);

    // camera
    const n = stops.length - 1, uu = Math.max(0, Math.min(n, u)), i0 = Math.min(n - 1, Math.floor(uu)), f = uu - i0;
    posCurve.getPoint(uu / n, camP); lookCurve.getPoint(uu / n, camL);
    let sx = lerp(stops[i0].sx, stops[i0 + 1].sx, f), sy = lerp(stops[i0].sy, stops[i0 + 1].sy, f);
    if (introT0 !== null && introT0 >= 0) {
      const k = ease(Math.min(1, (t - introT0) / introDur));
      camP.lerpVectors(introP, camP, k); camL.lerpVectors(introL, camL, k); sx *= k; sy *= k;
      boom.rotation.z = (1 - k) * .3;
      if (k >= 1) introT0 = -1;
    } else if (introT0 === null) { camP.copy(introP); camL.copy(introL); sx = sy = 0; }
    camera.position.copy(camP);
    camera.lookAt(camL.x + pointer.x * .5 * live, camL.y - pointer.y * .3 * live, camL.z);
    const wide = w > 860;
    camera.setViewOffset(w, h, wide ? -sx * .2 * w : 0, (wide ? sy * .17 : .1 + sy * .12) * h, w, h);
    lampA.position.set(camL.x + (camP.x - camL.x) * .45 + 2, camL.y + 6, camL.z + (camP.z - camL.z) * .45);
    lampA.color.copy(cA).lerp(RED, deadK * .7); lampA.intensity = lerp(16, 60, K) * (.8 + b * .5);
    lampB.position.set(camP.x, camP.y + 2.5, camP.z); lampB.color.copy(cB); lampB.intensity = lerp(6, 26, K);

    // boombox
    boom.rotation.y = live * Math.sin(t * .7) * .2;
    boom.position.y = 2.95 + b * .14;
    boom.scale.set(1.2 * (1 + b * .015), 1.2 * (1 - b * .03), 1.2 * (1 + b * .015));
    for (const p of pumps) p.scale.set(1 + b * .04, 1 + b * .04, 1 + b * .55);
    for (const s of spinners) s.o.rotation[s.axis] += dt * s.speed * (playing ? 1 : .15);
    needle.position.x = lerp(needle.position.x, needleTo, Math.min(1, dt * 6));
    keys.forEach((k, i) => { k.position.y = lerp(k.position.y, i === keyI && b > .35 ? 1.28 : 1.36, Math.min(1, dt * 20)); });
    const lit = playing ? Math.round(2 + b * 7) : 0;
    leds.forEach((m, i) => { m.material = i < lit ? ledOn : ledOff; });
    ant.rotation.z = -.45 + Math.sin(t * 9) * .05 * b + Math.sin(t * 1.3) * .03;
    bodyMat.color.copy(cA);
    micHead.rotation.z = .5 + Math.sin(t * 1.4) * .06 * live;
    for (const o of bobbers) { o.o.position.y = o.y + Math.sin(t * 1.1 + o.ph) * o.amp * live; if (o.rot) o.o.rotation.y = Math.sin(t * .6 + o.ph) * o.rot; }

    // cassettes: the one being read steps forward and lights up
    tapeObjs.forEach((g, i) => {
      const on = i === tapeOn, s = lerp(g.scale.x, on ? .9 : .66, Math.min(1, dt * 6));
      g.scale.setScalar(s);
      g.position.x = lerp(g.position.x, on ? 9.4 : 10.4, Math.min(1, dt * 6));
      g.position.y = 3.3 + (on ? b * .14 : 0) + Math.sin(t * 1.2 + i) * .08 * live;
      g.rotation.z = on ? Math.sin(t * 2) * .025 * live : 0;
      g.userData.bar.color.copy(cA).multiplyScalar(on ? 2.6 : .15);
    });
    // the district, and the projects after it
    focus = camP.z < P0 + PG * .6 ? 7 + hitOn : exhibitOn;
    if (screens.length && camP.z < P0 + 40 && camP.z > zP - 40 && t - screenAt > .09) { screenAt = t; const sc = screens[hitOn]; if (sc && sc.live) sc.redraw(t); }
    if (rain.mesh) {
      rain.drops.forEach((d, i) => { const f = (t * d.sp + d.ph) % 1; dummy.position.set(d.x - 2.5, 4.6 - f * 3.9, d.z - .5); dummy.rotation.set(0, 0, .08); dummy.scale.setScalar(f > .94 ? 0 : 1); dummy.updateMatrix(); rain.mesh.setMatrixAt(i, dummy.matrix); });
      rain.mesh.instanceMatrix.needsUpdate = true;
    }
    candles.forEach((cg, i) => { cg.scale.y = 1 + b * .1 * (i % 2 ? 1 : .5); });
    if (!dragOn && Math.abs(dragV) > .0004) { for (const tb of turn[focus] || []) tb.a += dragV; dragV *= .94; }
    for (const list of turn) for (const tb of list) { tb.a += tb.spin * dt * live; tb.o.rotation.y = tb.base + tb.a + Math.sin(t * .7 + tb.ph) * tb.sway * live; }
    for (const m of prints) m.emissiveIntensity = m.userData.glow * lerp(.3, 1, K);
    let snow = false; const nowS = performance.now() / 1000;
    for (const tv of tvs) {
      if (!tv.until) continue;
      if (nowS < tv.until) snow = true;
      else { tv.until = 0; const k = tv.k; cover(pool[k].src, 1.25, tx => { if (tv.k === k && !tv.until) tv.scr.material.map = tx; }); }
    }
    if (snow) { const d = noiseD.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 235; d[i + 3] = 255; } noiseG.putImageData(noiseD, 0, 0); noiseTex.needsUpdate = true; }
    crate.list.forEach((c, i) => {
      const on = i === crate.on, e = Math.min(1, dt * 7);
      c.piv.rotation.x = lerp(c.piv.rotation.x, i < crate.on ? .52 : on ? -.03 : -.17, e);
      c.sl.position.y = lerp(c.sl.position.y, on ? 3 : 1.6, e); c.disc.position.y = c.sl.position.y;
      c.disc.position.x = lerp(c.disc.position.x, on ? 1.35 : 0, e); if (on) c.disc.rotation.z -= dt * 2 * (playing ? 1 : .15);
    });
    for (const m of moons) {
      const an = t * m.sp + m.ph;
      m.d.position.set(m.c.x + Math.cos(an) * m.R, m.c.y + Math.sin(an) * m.R * m.tilt, m.c.z + Math.sin(an) * m.R);
      m.d.lookAt(camera.position);
    }
    faders.forEach((fd, i) => {
      const v = Math.sin(t * (1.3 + i * .17) + i * 1.9) * live * (.5 + b * .5);
      fd.position.z = .7 + v * .85;
      const lvl = playing ? Math.round((v * .5 + .5) * 5 + b) : 0;
      meters[i].forEach((m, k) => { m.material = k < lvl ? ledOn : ledOff; });
    });
    beacon.visible = Math.sin(t * 3) > -.3;
    for (const wv of waves) { const ph = (t * .35 + wv.userData.ph) % 1; wv.scale.setScalar(1 + ph * 16); wv.material.opacity = (1 - ph) * (playing ? .7 : .2); }

    // The Static: far and slow while the music plays, close and quick in dead air
    const finaleK = THREE.MathUtils.smoothstep(camP.z, zF + 20, zF + 80);
    const lunge = t < lungeUntil ? 1 : 0; // dead air has gone on too long: it comes for a closer look
    tmpV.subVectors(camL, camP).setY(0).normalize().multiplyScalar(lerp(lerp(lerp(34, 60, finaleK), 30, deadK), 15, lunge)).add(camP);
    tmpV.y = lerp(lerp(15, 10, deadK), camP.y + 3, lunge);
    const slowDt = Math.min(raw, .25); // these follow in real time, even when frames are slow
    cr.c.lerp(tmpV, Math.min(1, slowDt * 1.2));
    cr.R = lerp(cr.R, lerp(lerp(lerp(22, 34, finaleK), 15, deadK), 8, lunge), Math.min(1, slowDt * .8));
    cr.tau += dt * (.5 + deadK * .35 + b * .2 * live);
    for (let i = 0; i <= N; i++) staticP(cr.tau - i * .05, segPos[i]);
    head.position.copy(segPos[0]); staticP(cr.tau + .05, tmpV2); head.lookAt(tmpV2);
    jaws.forEach(j => { j.rotation.y = -.25 - b * .4 - deadK * .25; });
    let si = 0;
    for (let i = 1; i <= N; i++) {
      const k = i / N, s = Math.pow(1 - k, .8) * 2.3 + .22 + Math.sin(t * 3 - i * .5) * .07;
      dummy.position.copy(segPos[i]); dummy.lookAt(segPos[i - 1]); dummy.scale.set(s, s, s * 1.3); dummy.updateMatrix();
      segBody.setMatrixAt(i - 1, dummy.matrix);
      dummy.scale.setScalar(i % 2 ? s : 0); dummy.updateMatrix(); segRing.setMatrixAt(i - 1, dummy.matrix);
      if (i % 3 === 0 && si < spineN) { dummy.translateY(s * 1.15); dummy.scale.set(s * .2, s * 1.5, s * .2); dummy.updateMatrix(); spines.setMatrixAt(si++, dummy.matrix); }
    }
    segBody.instanceMatrix.needsUpdate = segRing.instanceMatrix.needsUpdate = spines.instanceMatrix.needsUpdate = true;
    mix.copy(cA).lerp(RED, deadK);
    veins.color.copy(mix).multiplyScalar(2.4 + b * 1.2); eyeMat.color.copy(mix).multiplyScalar(3.2 + deadK * 2);

    // lightning: a double flash, then dark
    if (boltLife > 0) {
      boltLife -= dt * 2.3;
      const o = boltLife > .72 ? 1 : boltLife > .58 ? .15 : boltLife > .4 ? .85 : Math.max(0, boltLife / .4);
      boltMat.opacity = o; zapLight.intensity = o * 7000;
      if (boltLife <= 0) { for (const m of bolts) m.visible = false; zapLight.intensity = 0; }
    }
    glowMat.opacity = .12 + b * .7;

    for (const { mesh, data } of drifters) {
      data.forEach((d, i) => {
        dummy.position.set(d.x, d.y + Math.sin(t * d.sp + d.ph) * 1.4 * live, d.z);
        dummy.rotation.set(t * d.sp * .5 * live + d.ph, t * d.sp * .35 * live, d.ph);
        dummy.scale.setScalar(d.s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const nt of notes) {
      if (nt.life <= 0) continue;
      nt.life -= dt * .8; nt.s.position.addScaledVector(nt.v, dt);
      nt.s.material.opacity = Math.max(0, nt.life);
      if (nt.life <= 0) nt.s.visible = false;
    }
    composer.render(dt);
  });

  return {
    zones,
    setU(v) { u = v; },
    setTape(i) { tapeOn = i; },
    setHit(i) { hitOn = i; dragV = 0; },
    setExhibit(i) { exhibitOn = [0, 1, 2, 3, 4, 5, 5, 6][i] ?? 0; dragV = 0; }, // i is the stop inside the district
    intro(dur = 1.5) { introDur = dur; introT0 = dur ? clock.elapsedTime : -1; },
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    setPlaying(v) { playing = v; },
    setTrack(i, count) { needleTo = -.45 + (i / Math.max(1, count - 1)) * .9; deckLabel.color.set(CANDY[i % CANDY.length]); },
    setPalette(p) { pal[0].set(p.a); pal[1].set(p.b); pal[2].set(p.c); if (p.bg) { bgTo.set(p.bg); if (snapBg) cBg.copy(bgTo); } snapBg = false; },
    setTheme(name, instant) {
      themeTo = name === 'light' ? 0 : 1; if (instant) { themeK = themeTo; snapBg = true; } // the sky starts in its colour, not on its way there
      for (const o of darkOnly) o.visible = !!themeTo;
      renderer.toneMapping = themeTo ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
      for (const n of notes) { n.s.material.blending = themeTo ? THREE.AdditiveBlending : THREE.NormalBlending; n.s.material.needsUpdate = true; }
      if (!themeTo) { boltLife = 0; boltMat.opacity = 0; zapLight.intensity = 0; for (const m of bolts) m.visible = false; }
    },
    lunge() { lungeUntil = clock.elapsedTime + 6; },
    beat() {
      beatAt = clock.elapsedTime; beatN++; keyI = (keyI + 1) % keys.length;
      if (reduced) return;
      if (playing && beatN % 2 === 0 && camera.position.z > -30) throwNote();
      // light up tiles of the road around the camera
      const row = Math.floor((FZ0 - camera.position.z) / TILE);
      for (let k = 0; k < GLOW; k++) {
        const r = Math.max(0, Math.min(ROWS - 1, row - 3 + Math.floor(Math.random() * 28)));
        dummy.position.set((Math.floor(Math.random() * COLS) - (COLS - 1) / 2) * TILE, .02, FZ0 - r * TILE);
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        glowTiles.setMatrixAt(k, dummy.matrix);
        glowTiles.setColorAt(k, tmpC.copy(playing || !themeTo ? pal[k % 3] : RED).multiplyScalar(playing || !themeTo ? 1.5 : .8));
      }
      glowTiles.instanceMatrix.needsUpdate = true; glowTiles.instanceColor.needsUpdate = true;
      // the district keeps time too: a TV hops channel, the phone swipes, the crate flips
      if (tvs.length && beatN % 4 === 0) { const tv = tvs[Math.floor(Math.random() * tvs.length)]; tune(tv, tv.k + 1 + Math.floor(Math.random() * 3)); }
      if (phone.post && beatN % 6 === 0 && phone.texs.length) { phone.i = (phone.i + 1) % phone.texs.length; if (phone.texs[phone.i]) phone.post.material.map = phone.texs[phone.i]; }
      if (crate.list.length && beatN % 8 === 4 && exhibitOn === 4) crate.on = (crate.on + 1) % crate.list.length;
      // thunder on the bar while the music plays; more often, and red, in dead air
      if (themeTo && (playing ? beatN % 8 === 0 : beatN % 4 === 0 && Math.random() < .75)) strike();
    },
  };
}

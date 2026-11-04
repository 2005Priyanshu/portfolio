/* =====================================================================
   STORY MODE
   The opening: a sage by a campfire welcomes you to the forest and wakes
   the four keepers, who each look after one part of the page. Pick one,
   or take the whole walk, and they lead you down the trail at ground level
   to their corner of the forest. From there the camera rises back over the
   canopy with that section on screen, so the story and the page are one
   continuous journey.
   forest3d.js carves the trail and the glades into the land (planStory),
   then hands over its scene and calls update() every frame (startStory).
   ===================================================================== */

import { sound } from './forestsound.js?v=20261104b';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const SEEN = 'forest-story-seen';
const CAMP_Z = 8;

const CAST = {
  sage: { name: 'The Sage', color: '#9fd8ff' },
  owl:  { name: 'Ledger', color: '#ffc93c' },
  fox:  { name: 'Ember', color: '#ff8a4c' },
  deer: { name: 'Fern', color: '#ffb8cf' },
  wisp: { name: 'Lumen', color: '#d6ff8a' }
};

// One keeper per part of the page, in the order the trail reaches them.
const STOPS = [
  { who: 'owl', id: 'experience', sign: ['Experience', 'Ledger · the archive'], show: 'Show me the experience' },
  { who: 'fox', id: 'work', sign: ['Work', 'Ember · the workshop'], show: 'Show me the work' },
  { who: 'deer', id: 'design', sign: ['Design', 'Fern · the studio'], show: 'Show me the designs' },
  { who: 'wisp', id: 'contact', sign: ['Contact', 'Lumen · the mailbox'], show: 'Show me how to get in touch' }
];

// Each line: what's said, the mood it's said in (forestsound.js tunes the voice to it), and
// optionally the keeper's own sound just before it.
const l = (text, mood, sfx) => ({ text, mood, sfx });
const SCRIPT = {
  owl: {
    greet: l('There you are. This way, and mind the roots.', 'warm', 'owl'),
    chatter: l('I’ve kept the records since the very first internship. Indian Railways, of all places.', 'proud'),
    lines: [
      l('Here we are. The archive.', 'proud'),
      l('Right now: Gen AI Queue Manager at Scale AI. RLHF, SFT and coding workflows, with a QA failure rate under five percent.', 'proud'),
      l('Before that, AI Expert at Outlier: more than twenty LLM projects, including work for Google and Apple.', 'warm')
    ],
    cameo: [['fox', l('Psst. Is it my turn yet?', 'playful', 'fox')], ['owl', l('Nearly, Ember. Nearly.', 'stern')]]
  },
  fox: {
    greet: l('Finally! Follow me. Keep up!', 'excited', 'fox'),
    chatter: l('The rain model runs on Random Forest and XGBoost, served with FastAPI. I helped. Mostly.', 'playful'),
    lines: [
      l('Welcome to the workshop!', 'excited'),
      l('Rainfall prediction, time series forecasting, stock market models. Data in, decisions out.', 'excited'),
      l('Just before the projects there’s a game: you judge two AI answers, the way Priyanshu does every day.', 'playful')
    ],
    cameo: [['deer', l('Ember, are you telling them about my Figma files?', 'gentle', 'deer')], ['fox', l('No! Your turn. Your turn.', 'sheepish')]]
  },
  deer: {
    greet: l('Walk with me. Slowly, there’s a lot to look at.', 'gentle', 'deer'),
    chatter: l('Most good design is taking things away.', 'hushed'),
    lines: [
      l('This is the studio.', 'gentle'),
      l('Each case study runs start to finish: the problem, the flows, the screens, and why each choice was made.', 'gentle'),
      l('Look for the floating island beside them. You can drag it, and it shares this sky.', 'playful')
    ],
    cameo: [['wisp', l('It’s getting dark, Fern. I can take it from here.', 'playful', 'wisp')], ['deer', l('Keep them warm, Lumen.', 'warm')]]
  },
  wisp: {
    greet: l('Stay close to my light.', 'hushed', 'wisp'),
    chatter: l('The forest is quietest at night. A good time to write to someone.', 'hushed'),
    lines: [
      l('The end of the path. This is the mailbox.', 'warm'),
      l('Priyanshu is open to roles in LLM evaluation, data science and product design.', 'warm'),
      l('Write to 2005priyanshu@gmail.com, or find the code on GitHub. I’ll carry it.', 'playful')
    ],
    cameo: [['fox', l('Will they write? Say they’ll write.', 'excited', 'fox')], ['wisp', l('Ember. Let them decide.', 'gentle')]]
  }
};

/* ---------- where the glades go ----------
   Each keeper's glade sits just ahead of where the page's camera flies when
   that section is on screen, so rising out of a glade lands on the section. */
export function planStory({ Z0, Z1, pathX }) {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const zOf = y => lerp(Z0, Z1, clamp(y / max, 0, 1));
  const glades = [{ key: 'camp', x: pathX(CAMP_Z), z: CAMP_Z, r: 12 }];
  STOPS.forEach((s, i) => {
    const el = document.getElementById(s.id), y = el ? Math.min(el.offsetTop, max) : max;
    const z = Math.min(zOf(y) - 34, glades[glades.length - 1].z - 32), side = i % 2 ? 1 : -1;
    glades.push({ key: s.who, x: pathX(z) + side * 3.6, z, r: 9, side });
  });
  return { glades, trail: { z0: Z0 + 30, z1: Z1 - 70, half: 5.5 } };
}

export function startStory(api) {
  const { THREE, scene, camera, lite, groundAt, pathX, glowTex, time, rig, plan, scrollPose } = api;
  const reduce = api.reduceMotion;
  const html = document.documentElement;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  let seed = 4111;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const camp = plan.glades[0];
  const C = V(camp.x, groundAt(camp.x, camp.z), camp.z);
  const at = (x, z, lift = 0) => V(x, groundAt(x, z) + lift, z);
  let night = 0;

  /* ---------- materials and small helpers ---------- */
  const mats = {};
  const M = (color, o) => mats[color + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, flatShading: true, ...o });
  const B = color => mats['b' + color] ||= new THREE.MeshBasicMaterial({ color });
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null) {
    const m = new THREE.Mesh(geo, mat), basic = !Array.isArray(mat) && mat.isMeshBasicMaterial;
    m.position.set(x, y, z); m.castShadow = !lite && !basic; m.receiveShadow = !basic;
    if (parent) parent.add(m);
    return m;
  }
  function glow(color, size, opacity, parent) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); if (parent) parent.add(s);
    return s;
  }
  function seg(a, b, r0, r1, mat, parent) { // a tapered cylinder from a to b
    const d = V().subVectors(b, a), m = mesh(new THREE.CylinderGeometry(r1, r0, d.length(), 5), mat, 0, 0, 0, parent);
    m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  }
  const canvasTex = (w, h, paint) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), c);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const blobTex = canvasTex(64, 64, g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.55, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /* =====================================================================
     THE CAST
     Low-poly, built from primitives. Each faces +z; its head turns toward
     whoever it is listening to.
     ===================================================================== */
  const chars = {};
  function character(key, o, build) {
    const g = new THREE.Group(); scene.add(g);
    const c = Object.assign({
      key, g, pos: V(), y: 0, yaw: 0, goal: V(), lift: 0, liftGoal: 0, walkLift: 0, speed: 0, gait: 0, stride: 2.4, gain: 2.4, maxSpeed: 7,
      talk: 0, talking: false, emote: null, emoteT: 0, emoteD: 1, asleep: 0, sleepy: false, lookAt: null, faceAt: null, headYaw: 0, headPitch: 0, leash: false
    }, CAST[key], o);
    Object.assign(c, build(g, c));
    c.blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    c.blob.scale.setScalar(c.blobSize); scene.add(c.blob);
    g.traverse(m => { m.userData.who = key; });
    chars[key] = c;
    return c;
  }
  const emote = (c, name, d = .6) => { c.emote = name; c.emoteT = 0; c.emoteD = d; };
  const em = (c, name) => c.emote === name ? Math.sin(Math.PI * clamp(c.emoteT / c.emoteD, 0, 1)) : 0;

  character('sage', { headH: 1.8, size: 3.6, neck: .9, blobSize: 1.5 }, g => {
    const robe = M('#2d3a55'), robeD = M('#1f2940'), cloth = M('#b8a684'), skin = M('#b98d6b'), wood = M('#5b4231');
    const body = new THREE.Group(); g.add(body);
    mesh(new THREE.LatheGeometry([[0, 0], [.56, 0], [.53, .12], [.44, .55], [.34, 1.05], [.27, 1.4], [.2, 1.6], [0, 1.66]].map(p => new THREE.Vector2(p[0], p[1])), 10), robe, 0, 0, 0, body);
    mesh(new THREE.CylinderGeometry(.365, .385, .07, 10), cloth, 0, .95, 0, body);   // sash
    mesh(new THREE.ConeGeometry(.47, .52, 10), cloth, 0, 1.4, 0, body);              // mantle
    const head = new THREE.Group(); head.position.set(0, 1.72, .02); body.add(head);
    mesh(new THREE.SphereGeometry(.25, 10, 8), robeD, 0, .05, -.03, head).scale.set(1, 1.08, 1.1);
    mesh(new THREE.ConeGeometry(.12, .34, 7), robeD, 0, .22, -.19, head).rotation.x = -1;
    mesh(new THREE.SphereGeometry(.165, 10, 8), B('#07080b'), 0, .02, .17, head).scale.set(1, 1.08, .62); // the shadow inside the hood
    mesh(new THREE.TorusGeometry(.17, .04, 6, 14), robeD, 0, .03, .2, head);
    [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.021, 6, 4), B('#d2f1ff'), s * .058, .05, .27, head));
    const beard = M('#e8e3d8'); // a full beard: a soft mass under the hood, tapering to a point
    mesh(new THREE.SphereGeometry(.15, 9, 7), beard, 0, -.15, .17, head).scale.set(1, 1.15, .62);
    mesh(new THREE.ConeGeometry(.13, .3, 8), beard, 0, -.36, .16, head).rotation.x = Math.PI + .1;
    const arm = s => {
      const a = new THREE.Group(); a.position.set(s * .29, 1.47, .02); body.add(a);
      mesh(new THREE.CylinderGeometry(.075, .14, .6, 7), robe, 0, -.3, 0, a);
      mesh(new THREE.SphereGeometry(.06, 6, 5), skin, 0, -.62, 0, a);
      return a;
    };
    const armL = arm(-1), armR = arm(1);
    armL.rotation.set(-.2, 0, -.16); armR.rotation.set(-.55, 0, .2);
    const staff = new THREE.Group(); staff.position.set(.44, 0, .3); body.add(staff);
    mesh(new THREE.CylinderGeometry(.026, .038, 2.2, 6), wood, 0, 1.1, 0, staff);
    mesh(new THREE.TorusGeometry(.085, .024, 5, 9, 4.4), wood, 0, 2.26, 0, staff);
    mesh(new THREE.IcosahedronGeometry(.07, 1), B('#e6f8ff'), 0, 2.27, 0, staff);
    const halo = glow('#8fd0ff', .95, .8, staff); halo.position.y = 2.27;
    return {
      head, anim(c, t) {
        body.scale.y = 1 + Math.sin(t * 1.5) * .008;
        head.rotation.y = c.headYaw;
        head.rotation.x = c.headPitch + Math.sin(t * 7.5) * .045 * c.talk;
        const raise = em(c, 'raise'), present = em(c, 'present');
        staff.position.y = raise * .28; armR.rotation.x = -.55 - raise * .35;
        armL.rotation.x = -.2 - present * .95 - c.talk * (.12 + .1 * Math.sin(t * 2.3));
        armL.rotation.z = -.16 - present * .45;
        halo.scale.setScalar(.95 * (.9 + Math.sin(t * 2) * .06 + c.talk * .25 + raise * 1.4));
        halo.material.opacity = .7 + .3 * c.talk;
      }
    };
  });

  character('owl', { headH: .6, size: 2.2, neck: 2.6, blobSize: .7, maxSpeed: 9, gain: 3, walkLift: 1.85 }, g => {
    const brown = M('#6e5034'), dark = M('#4a3524'), cream = M('#d9c39d'), disc = M('#c4a782'), beak = M('#d6a04a');
    const eyeM = new THREE.MeshStandardMaterial({ color: '#ffc63a', emissive: '#ffae00', emissiveIntensity: .45, roughness: .3 });
    const body = new THREE.Group(); g.add(body);
    mesh(new THREE.SphereGeometry(.24, 9, 7), brown, 0, .3, 0, body).scale.set(1, 1.22, .92);
    mesh(new THREE.SphereGeometry(.19, 9, 7), cream, 0, .27, .1, body).scale.set(1, 1.15, .7);
    mesh(new THREE.ConeGeometry(.09, .2, 6), dark, 0, .12, -.2, body).rotation.x = -2.3;
    [-1, 1].forEach(s => mesh(new THREE.ConeGeometry(.035, .07, 5), beak, s * .08, .03, .08, body).rotation.x = Math.PI);
    const wings = [-1, 1].map(s => {
      const w = new THREE.Group(); w.position.set(s * .21, .45, -.01); w.userData.s = s; body.add(w);
      mesh(new THREE.SphereGeometry(.2, 8, 6), dark, 0, -.17, 0, w).scale.set(.3, 1, .75);
      return w;
    });
    const head = new THREE.Group(); head.position.set(0, .6, 0); body.add(head);
    mesh(new THREE.SphereGeometry(.21, 10, 8), brown, 0, 0, 0, head).scale.set(1.12, .95, 1);
    const eyes = [-1, 1].map(s => {
      mesh(new THREE.SphereGeometry(.095, 9, 7), disc, s * .078, 0, .17, head).scale.set(1, 1, .38);
      const e = new THREE.Group(); e.position.set(s * .078, .01, .205); head.add(e);
      mesh(new THREE.SphereGeometry(.056, 10, 8), eyeM, 0, 0, 0, e);
      mesh(new THREE.SphereGeometry(.03, 8, 6), B('#0a0a0a'), 0, 0, .04, e);
      return e;
    });
    mesh(new THREE.ConeGeometry(.026, .09, 5), beak, 0, -.05, .22, head).rotation.x = Math.PI * .82;
    [-1, 1].forEach(s => mesh(new THREE.ConeGeometry(.05, .15, 5), brown, s * .13, .17, -.02, head).rotation.z = -s * .45);
    let blinkIn = 2, flyK = 0;
    return {
      head, anim(c, t, dt) {
        flyK = lerp(flyK, c.liftGoal > 1.2 ? 1 : 0, 1 - Math.exp(-dt * 4));
        const flap = em(c, 'flap');
        wings.forEach(w => { w.rotation.z = w.userData.s * lerp(.08 + flap * 1.1 * Math.abs(Math.sin(t * 14)), 1.35 + Math.sin(t * 15) * .7, flyK); });
        body.rotation.x = flyK * .35;
        blinkIn -= dt;
        let open = blinkIn < 0 ? .1 : 1;
        if (blinkIn < -.13) blinkIn = 2.4 + Math.random() * 3;
        open = lerp(open, .08, c.asleep);
        eyes.forEach(e => { e.scale.y = open; });
        head.rotation.y = c.headYaw;
        head.rotation.z = em(c, 'tilt') * .45 + Math.sin(t * 9) * .03 * c.talk;
        head.rotation.x = c.headPitch + c.asleep * .4 - c.talk * Math.abs(Math.sin(t * 8)) * .06;
        body.position.y = Math.abs(Math.sin(t * 8)) * .02 * c.talk + flyK * Math.sin(t * 3) * .06;
      }
    };
  });

  character('fox', { headH: .66, size: 2.4, neck: 1.3, blobSize: .95, maxSpeed: 10, stride: 3.4, gain: 3 }, g => {
    const fur = M('#d3612a'), white = M('#efe5d5'), black = M('#1d1512');
    const body = new THREE.Group(); g.add(body);
    mesh(new THREE.CapsuleGeometry(.15, .4, 4, 8), fur, 0, .44, -.02, body).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.13, 8, 6), white, 0, .42, .2, body).scale.set(.95, 1.1, .9);
    const legs = [[-.08, .2, 0], [.08, .2, Math.PI], [-.08, -.22, Math.PI], [.08, -.22, 0]].map(([x, z, ph]) => {
      const L = new THREE.Group(); L.position.set(x, .38, z); L.userData.ph = ph; body.add(L);
      mesh(new THREE.CylinderGeometry(.036, .03, .28, 5), fur, 0, -.14, 0, L);
      mesh(new THREE.CylinderGeometry(.03, .034, .11, 5), black, 0, -.32, 0, L);
      return L;
    });
    mesh(new THREE.CylinderGeometry(.08, .11, .22, 6), fur, 0, .56, .24, body).rotation.x = .6;
    const head = new THREE.Group(); head.position.set(0, .66, .32); body.add(head);
    mesh(new THREE.SphereGeometry(.13, 9, 7), fur, 0, 0, 0, head).scale.set(1.05, .92, 1);
    mesh(new THREE.SphereGeometry(.09, 8, 6), white, 0, -.05, .07, head).scale.set(1.3, .7, 1);
    mesh(new THREE.ConeGeometry(.066, .2, 7), fur, 0, -.025, .18, head).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.026, 6, 5), black, 0, -.025, .28, head);
    [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.022, 6, 5), B('#120d0a'), s * .058, .035, .105, head));
    const ears = [-1, 1].map(s => {
      const e = new THREE.Group(); e.position.set(s * .075, .09, -.02); e.rotation.z = -s * .28; e.userData.s = s; head.add(e);
      mesh(new THREE.ConeGeometry(.056, .17, 5), fur, 0, .085, 0, e);
      mesh(new THREE.ConeGeometry(.026, .065, 5), black, 0, .15, 0, e);
      return e;
    });
    const tail = new THREE.Group(); tail.position.set(0, .48, -.32); body.add(tail);
    mesh(new THREE.CapsuleGeometry(.09, .3, 4, 8), fur, 0, 0, -.24, tail).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.085, 8, 6), white, 0, 0, -.47, tail);
    return {
      head, anim(c, t) {
        const mv = clamp(c.speed / 2, 0, 1), droop = em(c, 'droop'), sleep = c.asleep;
        legs.forEach(L => { L.rotation.x = Math.sin(c.gait + L.userData.ph) * .65 * mv; });
        body.position.y = Math.abs(Math.sin(c.gait)) * .035 * mv - sleep * .1;
        tail.rotation.x = .35 - droop * .5 - sleep * .3 + mv * .15;
        tail.rotation.y = Math.sin(t * (c.talk > .3 ? 9 : 3.2)) * (.25 + c.talk * .2) * (1 - sleep);
        ears.forEach(e => { e.rotation.x = -droop * .9 - sleep * .4 + Math.max(0, Math.sin(t * .7 + e.userData.s * 2) - .96) * 6; });
        head.rotation.y = c.headYaw;
        head.rotation.x = c.headPitch + sleep * .55 + droop * .25 + Math.sin(t * 8) * .04 * c.talk;
      }
    };
  });

  character('deer', { headH: 1.52, size: 3.6, neck: 1.1, blobSize: 1.5, maxSpeed: 6, stride: 2.2 }, g => {
    const fur = M('#8a5d3b'), furL = M('#b78a61'), white = M('#ece2d2'), black = M('#17110d'), bone = M('#ddd0b4');
    const body = new THREE.Group(); g.add(body);
    mesh(new THREE.CapsuleGeometry(.2, .62, 4, 9), fur, 0, .98, 0, body).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.15, 8, 6), white, 0, .98, -.47, body).scale.set(1, 1.05, .55);
    mesh(new THREE.ConeGeometry(.05, .13, 5), white, 0, 1.12, -.52, body).rotation.x = -2.2;
    const legs = [[-.11, .3, 0], [.11, .3, Math.PI], [-.11, -.3, Math.PI], [.11, -.3, 0]].map(([x, z, ph]) => {
      const L = new THREE.Group(); L.position.set(x, .92, z); L.userData.ph = ph; body.add(L);
      mesh(new THREE.CylinderGeometry(.055, .035, .5, 5), fur, 0, -.25, 0, L);
      mesh(new THREE.CylinderGeometry(.03, .026, .36, 5), furL, 0, -.68, 0, L);
      mesh(new THREE.CylinderGeometry(.03, .036, .06, 5), black, 0, -.89, 0, L);
      return L;
    });
    mesh(new THREE.CylinderGeometry(.08, .12, .55, 7), fur, 0, 1.24, .38, body).rotation.x = .55;
    const head = new THREE.Group(); head.position.set(0, 1.5, .52); body.add(head);
    mesh(new THREE.SphereGeometry(.11, 9, 7), fur, 0, 0, 0, head).scale.set(.95, .95, 1.25);
    mesh(new THREE.ConeGeometry(.062, .18, 7), furL, 0, -.035, .15, head).rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(.026, 6, 5), black, 0, -.035, .245, head);
    [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.019, 6, 5), B('#0f0b08'), s * .072, .03, .07, head));
    const ears = [-1, 1].map(s => {
      const e = new THREE.Group(); e.position.set(s * .1, .06, -.04); e.rotation.z = -s * 1.05; e.userData.s = s; head.add(e);
      mesh(new THREE.SphereGeometry(.075, 7, 5), furL, 0, .07, 0, e).scale.set(.38, 1, .6);
      return e;
    });
    // antlers with blossoms: Fern keeps the designs
    const blM = ['#ffd3e2', '#fff3d1', '#d2c2ff'].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .25, roughness: .6, flatShading: true }));
    [-1, 1].forEach(s => {
      const P = (x, y, z) => V(s * x, y, z);
      const a = P(.05, .09, -.03), b = P(.13, .3, -.08), tip = P(.2, .47, -.15), t1 = P(.07, .43, .04), mid = V().lerpVectors(b, tip, .5), t2 = P(.28, .5, -.05);
      seg(a, b, .02, .016, bone, head); seg(b, tip, .016, .011, bone, head); seg(b, t1, .013, .009, bone, head); seg(mid, t2, .012, .008, bone, head);
      [tip, t1, t2].forEach((p, i) => mesh(new THREE.IcosahedronGeometry(.027, 0), blM[(i + (s > 0 ? 1 : 0)) % 3], p.x, p.y, p.z, head));
      mesh(new THREE.IcosahedronGeometry(.032, 0), M('#7fa356'), b.x, b.y, b.z, head);
    });
    return {
      head, anim(c, t) {
        const mv = clamp(c.speed / 1.5, 0, 1);
        legs.forEach(L => { L.rotation.x = Math.sin(c.gait + L.userData.ph) * .5 * mv; });
        body.position.y = Math.abs(Math.sin(c.gait)) * .03 * mv;
        head.rotation.y = c.headYaw;
        head.rotation.x = c.headPitch + c.asleep * 1.05 + Math.sin(t * 6) * .03 * c.talk + em(c, 'nod') * .3;
        ears.forEach(e => { e.rotation.x = Math.max(0, Math.sin(t * .9 + e.userData.s * 1.7) - .97) * 10; });
        for (const m of blM) m.emissiveIntensity = .25 + night * .9;
      }
    };
  });

  character('wisp', { headH: 0, size: 2, neck: 0, blobSize: .5, maxSpeed: 9, gain: 3, walkLift: 1.45 }, g => {
    const body = new THREE.Group(); g.add(body);
    const core = mesh(new THREE.IcosahedronGeometry(.13, 2), B('#f6ffd8'), 0, 0, 0, body);
    const flame = mesh(new THREE.ConeGeometry(.1, .34, 9, 1, true), new THREE.MeshBasicMaterial({ color: '#d4ff8e', transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, -.17, -.06, body);
    flame.rotation.x = Math.PI + .5;
    [-1, 1].forEach(s => mesh(new THREE.SphereGeometry(.02, 6, 4), B('#2b3520'), s * .042, .02, .118, body));
    const halo = glow('#d6ff8a', 1.1, .95, body), aura = glow('#9effc9', 3.4, .22, body);
    const sparks = Array.from({ length: 5 }, (_, i) => { const s = glow('#f1ffc4', .14, 1, g); s.userData.i = i; return s; });
    const light = lite ? null : new THREE.PointLight('#dcff9a', 0, 9, 1.6);
    if (light) body.add(light);
    return {
      head: null, bob: body.position, anim(c, t) {
        body.position.y = Math.sin(t * 1.8) * .09;
        const dim = 1 - c.asleep * .55, pulse = (1 + Math.sin(t * 3.1) * .05 + c.talk * Math.abs(Math.sin(t * 9)) * .12) * dim;
        core.scale.setScalar(pulse); halo.scale.setScalar(1.1 * pulse); aura.material.opacity = .22 * dim;
        flame.scale.set(1, 1 + Math.sin(t * 7) * .12, 1); flame.rotation.z = Math.sin(t * 2.3) * .2;
        sparks.forEach(s => {
          const i = s.userData.i, a = t * (1.2 + i * .17) + i * 1.26, r = .32 + .08 * Math.sin(t + i);
          s.position.set(Math.cos(a) * r, body.position.y + Math.sin(a * 1.3) * .14, Math.sin(a) * r);
          s.material.opacity = (.5 + .5 * Math.sin(t * 4 + i)) * dim;
        });
        if (light) light.intensity = (1.5 + night * 5) * dim;
      }
    };
  });

  /* =====================================================================
     THE PLACES: campfire glade, the keepers' glades, the trail between
     ===================================================================== */
  const BARK = M('#4e3a2b'), BARK_L = M('#9c7c58'), STONE = M('#7a786e'), WOOD = M('#6b4c34');
  const lanterns = [], glowCaps = [];
  const fam = () => getComputedStyle(document.body).fontFamily;

  function group(x, z, yaw = 0) { const g = new THREE.Group(); g.position.set(x, groundAt(x, z), z); g.rotation.y = yaw; scene.add(g); return g; }
  const facing = (x, z, P) => Math.atan2(P.x - x, P.z - z);
  function stump(x, z, r, h) {
    const s = group(x, z, rnd() * 6);
    mesh(new THREE.CylinderGeometry(r, r * 1.2, h + .15, 9), BARK, 0, (h - .15) / 2, 0, s);
    mesh(new THREE.CylinderGeometry(r * .93, r * .93, .02, 9), BARK_L, 0, h + .005, 0, s);
    for (let i = 0; i < 4; i++) {
      const rg = new THREE.Group(); rg.rotation.y = -(i / 4 * 6.28 + .4); s.add(rg);
      mesh(new THREE.ConeGeometry(r * .32, r * 1.3, 5), BARK, r * .95, .06, 0, rg).rotation.z = -1.3;
    }
    return s;
  }
  function log(x, z, yaw, len = 1.7, r = .19) {
    const g = group(x, z, yaw);
    mesh(new THREE.CylinderGeometry(r, r * 1.05, len, 8), BARK, 0, r * .8, 0, g).rotation.z = Math.PI / 2;
    [-1, 1].forEach(s => mesh(new THREE.CylinderGeometry(r * .9, r * .9, .02, 8), BARK_L, s * len / 2, r * .8, 0, g).rotation.z = Math.PI / 2);
  }
  function lantern(x, z, toward, h = 1.9) {
    const L = group(x, z, facing(x, z, toward) + Math.PI / 2);
    mesh(new THREE.CylinderGeometry(.045, .06, h + .2, 6), WOOD, 0, h / 2 - .1, 0, L);
    mesh(new THREE.BoxGeometry(.42, .05, .05), WOOD, .17, h - .05, 0, L);
    const box = new THREE.Group(); box.position.set(.34, h - .34, 0); L.add(box);
    mesh(new THREE.BoxGeometry(.18, .03, .18), M('#2b2622'), 0, .1, 0, box);
    mesh(new THREE.BoxGeometry(.18, .03, .18), M('#2b2622'), 0, -.12, 0, box);
    const core = mesh(new THREE.BoxGeometry(.12, .19, .12), B('#ffd08a'), 0, -.01, 0, box);
    const gl = glow('#ffb35a', 1.7, .3, box);
    lanterns.push({ core, gl });
  }
  function mushrooms(x, z, n, pale) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, d = rnd() * .7, s = .6 + rnd() * .7, g = group(x + Math.cos(a) * d, z + Math.sin(a) * d);
      mesh(new THREE.CylinderGeometry(.025 * s, .032 * s, .14 * s, 5), M('#e9e0cf'), 0, .07 * s, 0, g);
      const cap = mesh(new THREE.SphereGeometry(.075 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), pale ? M('#dfe9d8', { emissive: '#9fffd8', emissiveIntensity: 0 }) : M('#b8452f'), 0, .13 * s, 0, g);
      if (pale) glowCaps.push(cap.material);
    }
  }
  const signDraws = [];
  function sign(x, z, toward, title, sub) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 176;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const grain = Array.from({ length: 24 }, () => [rnd() * 176, (rnd() - .5) * 14, (rnd() - .5) * 14, .12 + rnd() * .2, 1 + rnd() * 2]);
    const draw = () => {
      const g = c.getContext('2d');
      g.fillStyle = '#6a4a31'; g.fillRect(0, 0, 512, 176);
      for (const [y, a, b, o, w] of grain) { g.strokeStyle = `rgba(36,22,12,${o})`; g.lineWidth = w; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + a, 340, y + b, 512, y + a * .5); g.stroke(); }
      g.textAlign = 'center'; g.fillStyle = '#f3e6c8'; g.font = `500 62px ${fam()}`; g.fillText(title.toUpperCase(), 256, 94);
      g.fillStyle = 'rgba(243,230,200,.66)'; g.font = `400 22px 'Geist Mono', ui-monospace, monospace`; g.fillText(sub.toUpperCase(), 256, 138);
      tex.needsUpdate = true;
    };
    draw(); signDraws.push(draw);
    const S = group(x, z, facing(x, z, toward));
    mesh(new THREE.CylinderGeometry(.05, .065, 1.55, 6), WOOD, 0, .7, 0, S);
    const face = new THREE.MeshStandardMaterial({ map: tex, roughness: .9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .22 }); // readable after dark
    mesh(new THREE.BoxGeometry(1.1, .38, .05), [WOOD, WOOD, WOOD, WOOD, face, face], 0, 1.28, .04, S);
  }
  if (document.fonts) document.fonts.ready.then(() => signDraws.forEach(d => d()));

  // the campfire
  const fire = (() => {
    const F = new THREE.Group(); F.position.copy(C); scene.add(F);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.28, s = mesh(new THREE.IcosahedronGeometry(.13 + rnd() * .05, 0), STONE, Math.cos(a) * .55, .04, Math.sin(a) * .55, F);
      s.scale.y = .7; s.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    }
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * 6.28 + .3;
      mesh(new THREE.CylinderGeometry(.05, .065, .8, 6), M('#3e2c20'), Math.cos(a) * .16, .26, Math.sin(a) * .16, F).rotation.set(-Math.sin(a) * .85, 0, Math.cos(a) * .85);
    }
    const flames = ['#ff6a1f', '#ffa53a', '#ffe39a'].map((col, i) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(.24 - i * .065, .64 - i * .12, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      F.add(m); return m;
    });
    const g1 = glow('#ff9a3c', 2.6, .75, F); g1.position.y = .45;
    const g2 = glow('#ff7a2a', 9, .2, F); g2.position.y = .7;
    const EN = 36, ep = new Float32Array(EN * 3), embers = Array.from({ length: EN }, () => ({ t: rnd() * 1.6, x: 0, z: 0, s: .5 + rnd() }));
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    const pts = new THREE.Points(eg, new THREE.PointsMaterial({ size: .07, map: glowTex, color: '#ffb35a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; F.add(pts);
    const light = new THREE.PointLight('#ff8b3d', 0, 26, 1.7); light.position.set(0, .9, 0); F.add(light);
    return {
      update(t, dt) {
        flames.forEach((f, i) => {
          const k = 1 + Math.sin(t * (9 + i * 3) + i) * .12 + Math.sin(t * 23 + i * 2) * .06;
          f.scale.set(1 + Math.sin(t * 5 + i) * .07, k, 1 + Math.cos(t * 6 + i) * .07);
          f.position.y = (.32 - i * .06) * k + .02; f.rotation.y = t * (.6 + i * .4);
        });
        const fl = .85 + Math.sin(t * 11) * .08 + Math.sin(t * 27) * .05;
        light.intensity = 24 * fl; g1.scale.setScalar(2.6 * fl);
        embers.forEach((e, i) => {
          e.t += dt * e.s * .55;
          if (e.t > 1.6) { e.t = 0; e.x = (rnd() - .5) * .3; e.z = (rnd() - .5) * .3; }
          ep[i * 3] = e.x + Math.sin(e.t * 3 + i) * .1; ep[i * 3 + 1] = .35 + e.t * 1.3; ep[i * 3 + 2] = e.z + Math.cos(e.t * 2.4 + i) * .1;
        });
        eg.attributes.position.needsUpdate = true;
      }
    };
  })();
  log(C.x - 2, C.z + 1.1, .7); log(C.x + 2.7, C.z - 1.9, -.45, 1.5);
  stump(C.x - 2.5, C.z - 1.1, .27, .5);
  mushrooms(C.x - 3.6, C.z - 2.4, 5, false); mushrooms(C.x + 4.6, C.z - .6, 4, false);

  // the keepers' glades
  const stops = STOPS.map((s, i) => {
    const g = plan.glades[i + 1], side = g.side, G = V(g.x, 0, g.z), S = V(pathX(g.z + 7), 0, g.z + 7);
    const aud = V(S.x - G.x, 0, S.z - G.z).normalize();
    return {
      ...s, i, g, side, G, S, zA: g.z + 38,
      stage: { center: V().lerpVectors(G, S, .3), aud, wideD: 6.4 },
      cameo: V(pathX(g.z - 1.4) - side * .4, 0, g.z - 1.4),
      cameoFrom: V(pathX(g.z - 16), 0, g.z - 16),
      perch: s.who === 'owl' ? .76 : s.who === 'wisp' ? 1.5 : 0
    };
  });
  for (const st of stops) {
    const { G, S, side, g } = st;
    sign(pathX(g.z - 2.6) - side * 1.9, g.z - 2.6, S, st.sign[0], st.sign[1]);
    if (st.who === 'owl') { stump(G.x, G.z, .42, .75); lantern(G.x + side * 1.4, G.z - 1.5, S); mushrooms(G.x - side * .9, G.z - .8, 4, false); }
    if (st.who === 'fox') {
      const b = mesh(new THREE.IcosahedronGeometry(1, 0), M('#6f7166'), G.x + side * 1.7, groundAt(G.x + side * 1.7, G.z - 1.1) + .2, G.z - 1.1, scene); b.scale.set(1.25, .7, 1);
      const moss = mesh(new THREE.IcosahedronGeometry(.9, 0), M('#55703a'), b.position.x, b.position.y + .2, b.position.z, scene); moss.scale.set(1.1, .45, .9);
      for (let i = 0; i < 3; i++) mesh(new THREE.IcosahedronGeometry(.16 - i * .035, 0), STONE, G.x - side * 1.2, groundAt(G.x - side * 1.2, G.z - .4) + .1 + i * .19, G.z - .4, scene);
      mushrooms(G.x + side * .8, G.z + .9, 3, false);
    }
    if (st.who === 'deer') {
      for (const dx of [1.8, -1.6]) {
        const bush = group(G.x + side * dx, G.z - 1.2 + dx * .2);
        mesh(new THREE.IcosahedronGeometry(.55, 1), M('#3f5f2e'), 0, .35, 0, bush).scale.set(1.2, .8, 1);
        for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, e = rnd() * 1.2; mesh(new THREE.IcosahedronGeometry(.05, 0), M(['#ffd3e2', '#fff3d1', '#d2c2ff'][i % 3], { emissive: '#ffe1ea', emissiveIntensity: .2 }), Math.cos(a) * .55 * Math.cos(e), .35 + Math.sin(e) * .42, Math.sin(a) * .5 * Math.cos(e), bush); }
      }
    }
    if (st.who === 'wisp') {
      const mb = group(G.x + side * 1.25, G.z - .3, facing(G.x + side * 1.25, G.z - .3, S));
      mesh(new THREE.CylinderGeometry(.045, .055, 1.05, 6), WOOD, 0, .5, 0, mb);
      mesh(new THREE.BoxGeometry(.3, .24, .46), M('#9c3f2b'), 0, 1.1, 0, mb);
      mesh(new THREE.CylinderGeometry(.15, .15, .46, 10, 1, false, Math.PI / 2, Math.PI), M('#9c3f2b'), 0, 1.22, 0, mb).rotation.x = Math.PI / 2;
      mesh(new THREE.BoxGeometry(.02, .2, .1), M('#e9c46a'), .16, 1.28, -.1, mb);
      mesh(new THREE.BoxGeometry(.16, .015, .12), M('#f2ede2'), 0, 1.13, .24, mb).rotation.x = -.3;
      lantern(G.x - side * 1.5, G.z - 1.6, S);
      mushrooms(G.x + side * .3, G.z - 1.4, 6, true); mushrooms(G.x - side * 2.2, G.z + .6, 4, true);
    }
  }

  /* ---------- the trail and what grows beside it ---------- */
  (function trailAndGround() {
    const { z0, z1 } = plan.trail, step = 1.6, n = Math.ceil((z0 - z1) / step);
    const dirt = canvasTex(64, 256, (g, c) => {
      const img = g.createImageData(64, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
        const u = x / 63, a = sstep(0, .32, u) * sstep(1, .68, u) * (.78 + rnd() * .22), v = (rnd() - .5) * 26, i = (y * 64 + x) * 4;
        img.data[i] = 96 + v; img.data[i + 1] = 76 + v * .9; img.data[i + 2] = 56 + v * .8; img.data[i + 3] = a * 255;
      }
      g.putImageData(img, 0, 0);
    });
    dirt.wrapT = THREE.RepeatWrapping;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const z = z0 - i * step, x = pathX(z);
      for (let j = 0; j < 3; j++) { const xx = x + (j - 1) * 1.3; pos.push(xx, groundAt(xx, z) + .05, z); uv.push(j / 2, i * step / 5); }
      if (i) { const a = (i - 1) * 3, b = i * 3; idx.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1); }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
    const trail = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: dirt, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    trail.receiveShadow = true; scene.add(trail);

    // where things grow: along both sides of the trail, and thickly in the glades
    const spot = (minD, spread) => {
      for (let tries = 0; tries < 20; tries++) {
        let x, z;
        if (rnd() < .45) { const g = plan.glades[(rnd() * plan.glades.length) | 0], a = rnd() * 6.28, d = Math.sqrt(rnd()) * (g.r + 5); x = g.x + Math.cos(a) * d; z = g.z + Math.sin(a) * d; }
        else { z = lerp(z0, z1, rnd()); x = pathX(z) + (rnd() < .5 ? -1 : 1) * (minD + Math.pow(rnd(), 1.6) * spread); }
        if (Math.abs(x - pathX(z)) < minD || Math.hypot(x - C.x, z - C.z) < 1.5) continue;
        return [x, z];
      }
      return [C.x + 30, C.z];
    };
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const wind = (mat, k) => {
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTime = time;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 ip = instanceMatrix[3].xyz;
          float w = sin(uTime * 1.9 + ip.x * .5 + ip.z * .37) + .5 * sin(uTime * 3.7 + ip.x * 1.3);
          transformed.x += w * position.y * ${k}; transformed.z += w * position.y * ${k * .6};`);
      };
      return mat;
    };
    function scatter(geo, mat, count, minD, spread, place) {
      const m = new THREE.InstancedMesh(geo, mat, count);
      for (let i = 0; i < count; i++) { const [x, z] = spot(minD, spread); place(dummy, x, z, i); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (m.instanceColor || place.color) m.setColorAt(i, place.color(col, i)); }
      m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
      return m;
    }

    // grass tufts
    const gp = [], gc = [], gn = [], base = new THREE.Color('#22341b'), tip = new THREE.Color('#728f45');
    for (let b = 0; b < 7; b++) {
      const a = b / 7 * 6.28 + rnd() * .5, r0 = .02 + rnd() * .06, h = .28 + rnd() * .38, lean = .08 + rnd() * .14, w = .035, cx = Math.cos(a), cz = Math.sin(a);
      gp.push(cx * r0 + cz * w, 0, cz * r0 - cx * w, cx * r0 - cz * w, 0, cz * r0 + cx * w, cx * (r0 + lean), h, cz * (r0 + lean));
      gc.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b); gn.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }
    const grassGeo = new THREE.BufferGeometry();
    grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); grassGeo.setAttribute('normal', new THREE.Float32BufferAttribute(gn, 3));
    const grassPlace = (d, x, z) => { d.position.set(x, groundAt(x, z) - .02, z); d.rotation.set(0, rnd() * 6.28, 0); const s = .7 + rnd() * .7; d.scale.set(s, s * (.8 + rnd() * .5), s); };
    grassPlace.color = c => c.setRGB(.8 + rnd() * .35, .85 + rnd() * .3, .75 + rnd() * .25);
    scatter(grassGeo, wind(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), .09), lite ? 2600 : 7000, 1.25, 14, grassPlace);

    // flowers: a stem and a head, sharing one placement
    const FN = lite ? 300 : 800, heads = [], FLOWER = ['#f4f0e6', '#f6d36b', '#e9a0b9', '#b9a6f0', '#f29a6a'].map(h => new THREE.Color(h));
    const stemGeo = new THREE.CylinderGeometry(.006, .009, .3, 3).translate(0, .15, 0), headGeo = new THREE.IcosahedronGeometry(.045, 0).translate(0, .31, 0);
    const deer = plan.glades.find(g => g.key === 'deer');
    const flowerPlace = (d, x, z, i) => {
      if (deer && i % 3 === 0) { const a = rnd() * 6.28, r = 1.2 + Math.sqrt(rnd()) * 5; x = deer.x + Math.cos(a) * r; z = deer.z + Math.sin(a) * r; }
      d.position.set(x, groundAt(x, z) - .01, z); d.rotation.set((rnd() - .5) * .3, rnd() * 6.28, (rnd() - .5) * .3); d.scale.setScalar(.75 + rnd() * .6);
      heads.push(d.matrix.clone().compose(d.position, d.quaternion, d.scale));
    };
    scatter(stemGeo, wind(new THREE.MeshStandardMaterial({ color: '#4d6a32', roughness: 1 }), .12), FN, 1.4, 9, flowerPlace);
    const hm = new THREE.InstancedMesh(headGeo, wind(new THREE.MeshStandardMaterial({ roughness: .8, flatShading: true }), .12), FN);
    heads.forEach((m, i) => { hm.setMatrixAt(i, m); hm.setColorAt(i, FLOWER[(rnd() * FLOWER.length) | 0]); });
    hm.frustumCulled = false; scene.add(hm);

    // rocks, half sunk into the ground
    const rockPlace = (d, x, z) => { const s = .12 + Math.pow(rnd(), 2) * .5; d.position.set(x, groundAt(x, z) - s * .25, z); d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); d.scale.set(s * (1 + rnd() * .5), s * .6, s); };
    rockPlace.color = c => c.setScalar(.75 + rnd() * .4);
    const rocks = scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#7a786c', roughness: .95, flatShading: true }), lite ? 70 : 150, 1.5, 9, rockPlace);
    rocks.castShadow = !lite;
  })();

  /* ---------- lights that follow the action ---------- */
  const keyLight = new THREE.PointLight('#ffe6c8', 0, 14, 2); scene.add(keyLight);

  /* =====================================================================
     DIRECTOR: characters, camera, dialogue
     ===================================================================== */
  const CANCEL = Symbol('cancel');
  let run = 0, pending = [], active = false, where = 'page', stage = null, fast = false, hourGoal = 8.8, current = null;
  const swallow = e => { if (e !== CANCEL) console.error(e); };
  const pend = (rej, id) => { if (id !== run) rej(CANCEL); else pending.push(rej); };
  function cancel() { run++; const p = pending; pending = []; p.forEach(r => r(CANCEL)); line = null; choosing = null; cam.drive = null; sound.hush(); return run; }

  const ref = (r, out) => r === 'cam' ? out.copy(camera.position) : r === 'fire' ? out.copy(C) : typeof r === 'string' ? headPos(chars[r], out) : out.copy(r);
  function headPos(c, out = V()) { return out.set(c.pos.x, c.y + c.headH + (c.bob ? c.bob.y : 0), c.pos.z); }
  const _t = V();
  function stepChar(c, dt, t) {
    const dx = c.goal.x - c.pos.x, dz = c.goal.z - c.pos.z, d = Math.hypot(dx, dz);
    if (d > 40) { c.pos.x = c.goal.x; c.pos.z = c.goal.z; c.lift = c.liftGoal; c.speed = 0; } // too far away to watch: just be there
    else if (c.leash) { // leading the walk: stay just ahead of the camera
      const k = 1 - Math.exp(-dt * 8), px = c.pos.x, pz = c.pos.z;
      c.pos.x += dx * k; c.pos.z += dz * k;
      c.speed = Math.hypot(c.pos.x - px, c.pos.z - pz) / Math.max(dt, 1e-4);
    } else {
      c.speed = lerp(c.speed, d > .03 ? Math.min(c.maxSpeed, d * c.gain) : 0, 1 - Math.exp(-dt * 6));
      if (d > .001) { const s = Math.min(d, c.speed * dt); c.pos.x += dx / d * s; c.pos.z += dz / d * s; }
    }
    let yawT = c.yaw;
    if (c.speed > .3 && d > .05) yawT = Math.atan2(dx, dz);
    else if (c.faceAt) { ref(c.faceAt, _t); yawT = Math.atan2(_t.x - c.pos.x, _t.z - c.pos.z); }
    c.yaw += wrap(yawT - c.yaw) * (1 - Math.exp(-dt * 5));
    c.lift = lerp(c.lift, c.liftGoal, 1 - Math.exp(-dt * 3));
    c.gait += c.speed * dt * c.stride;
    c.talk = lerp(c.talk, c.talking ? 1 : 0, 1 - Math.exp(-dt * 8));
    c.asleep = lerp(c.asleep, c.sleepy ? 1 : 0, 1 - Math.exp(-dt * 2.5));
    let hop = 0;
    if (c.emote) { c.emoteT += dt; if (c.emoteT > c.emoteD) c.emote = null; else if (c.emote === 'hop') hop = em(c, 'hop') * .3; }
    const ground = groundAt(c.pos.x, c.pos.z);
    c.y = ground + c.lift + hop;
    c.g.position.set(c.pos.x, c.y, c.pos.z); c.g.rotation.y = c.yaw;
    let hy = 0, hp = 0;
    if (c.lookAt && c.neck) {
      ref(c.lookAt, _t);
      hy = clamp(wrap(Math.atan2(_t.x - c.pos.x, _t.z - c.pos.z) - c.yaw), -c.neck, c.neck);
      hp = clamp(-Math.atan2(_t.y - (c.y + c.headH), Math.hypot(_t.x - c.pos.x, _t.z - c.pos.z)), -.5, .5);
    }
    const hk = 1 - Math.exp(-dt * 5);
    c.headYaw = lerp(c.headYaw, hy, hk); c.headPitch = lerp(c.headPitch, hp, hk);
    c.anim(c, t, dt);
    c.blob.position.set(c.pos.x, ground + .03, c.pos.z);
    c.blob.material.opacity = 1 / (1 + c.lift * .9);
  }

  const CAMP = { sage: [0, -2.7, 0], owl: [-2.5, -1.1, .5], fox: [2.2, -.4, 0], deer: [3.5, -2.9, 0], wisp: [-1.3, -3, 1.55] };
  function campPositions(sleep, snap) {
    for (const [k, [dx, dz, lift]] of Object.entries(CAMP)) {
      const c = chars[k];
      c.goal.set(C.x + dx, 0, C.z + dz); c.liftGoal = lift; c.leash = false; c.lookAt = null;
      c.faceAt = k === 'sage' ? 'cam' : 'fire'; c.sleepy = sleep && k !== 'sage';
      if (snap) { c.pos.copy(c.goal); c.lift = lift; c.asleep = c.sleepy ? 1 : 0; c.yaw = k === 'sage' ? 0 : Math.atan2(-dx, -dz); }
    }
  }
  campPositions(false, true);

  /* ---------- camera ----------
     Either driven along a move (flight, walk) or eased toward a shot that
     can follow moving characters. Its pose goes to forest3d.js via rig. */
  const cam = { pos: V(), quat: new THREE.Quaternion(), wantPos: V(), wantLook: V(), lookNow: V(), k: 2, shot: null, drive: null, follow: false };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _f = V(), _e = new THREE.Euler();
  const quatLook = (pos, look, out) => out.setFromRotationMatrix(_m.lookAt(pos, look, UP));
  function follow(shot, k = 1.6) {
    cam.shot = shot; shot();
    if (!cam.follow) { _f.set(0, 0, -1).applyQuaternion(cam.quat); cam.lookNow.copy(cam.pos).addScaledVector(_f, cam.wantLook.distanceTo(cam.pos) || 6); }
    cam.follow = true; cam.k = k;
  }
  function drive(fn, id) { cam.follow = false; cam.shot = null; return new Promise((res, rej) => { cam.drive = { fn, res }; pend(rej, id); }); }

  const _a = V(), _b = V();
  function aim(look, angle, dist, h) {
    const a = Math.atan2(stage.aud.x, stage.aud.z) + angle;
    cam.wantLook.copy(look);
    cam.wantPos.set(look.x + Math.sin(a) * dist, look.y + h, look.z + Math.cos(a) * dist);
    cam.wantPos.y = Math.max(cam.wantPos.y, groundAt(cam.wantPos.x, cam.wantPos.z) + .45);
  }
  const SHOT = {
    wide: () => { _a.copy(stage.center); _a.y = groundAt(_a.x, _a.z) + .95; aim(_a, 0, stage.wideD, .8); },
    high: () => { _a.copy(stage.center); _a.y = groundAt(_a.x, _a.z) + .2; aim(_a, 0, stage.wideD + 1.6, 2.6); }, // the group sits above the choices
    on: (who, angle = .22, k = 1) => () => { const c = chars[who], d = c.size * k; headPos(c, _a); _a.y -= d * .14; aim(_a, angle, d, d * .24); }, // head sits a third of the way down
    two: (a, b, angle = 0) => () => { headPos(chars[a], _a); headPos(chars[b], _b); const d = _a.distanceTo(_b); _a.lerp(_b, .5); aim(_a, angle, Math.max(2.6, d * 1.15 + 1.6), .35); }
  };

  // a walk along the trail at eye height
  const _lk = V();
  function walkPose(z, pos, quat, bob = 0) {
    const x = pathX(z), gy = (groundAt(x, z) * 2 + groundAt(pathX(z - 3), z - 3) + groundAt(pathX(z + 3), z + 3)) / 4;
    pos.set(x, gy + 1.7 + bob, z);
    const la = z - 12; _lk.set(pathX(la), groundAt(pathX(la), la) + 1.25, la);
    quatLook(pos, _lk, quat);
  }
  function walk(z0, z1, id, speed, each) {
    const D = (Math.abs(z1 - z0) / speed + 1.2) * (reduce ? .15 : 1);
    let t = 0; fast = false;
    return drive(dt => {
      t += dt * (fast ? 3 : 1);
      const u = clamp(t / D, 0, 1), e = u * u * (3 - 2 * u), z = lerp(z0, z1, e);
      walkPose(z, cam.pos, cam.quat, reduce ? 0 : Math.sin((z0 - z) * 1.3) * .025);
      if (each) each(z, e);
      return u >= 1;
    }, id);
  }
  // a flight that follows the trail, rising over the canopy as far as it needs to
  function flight(end, id, o = {}) {
    const p0 = cam.pos.clone(), q0 = cam.quat.clone(), p3 = V(), q3 = new THREE.Quaternion();
    end(p3, q3);
    const off0 = p0.x - pathX(p0.z), off3 = p3.x - pathX(p3.z), dist = p0.distanceTo(p3);
    const D = (o.dur ?? clamp(2.4 + dist / 55, 2.6, 6)) * (reduce ? .25 : 1);
    let bump = 0;
    for (let i = 1; i < 24; i++) {
      const e = i / 24, z = lerp(p0.z, p3.z, e), x = pathX(z) + lerp(off0, off3, e);
      const need = groundAt(x, z) + 2.2 + (o.low ? 1 : 15) * sstep(0, .22, Math.min(e, 1 - e));
      bump = Math.max(bump, (need - lerp(p0.y, p3.y, e)) / Math.max(Math.sin(Math.PI * e), .2));
    }
    const dir = Math.sign(p3.z - p0.z) || -1, travel = Math.abs(p3.z - p0.z) > 60;
    const qT = quatLook(V(), V(0, -.14, dir), new THREE.Quaternion());
    let t = 0;
    return drive(dt => {
      t += dt;
      const u = clamp(t / D, 0, 1), e = easeIO(u);
      end(p3, q3); // the page's camera keeps easing, so its pose is read live
      const z = lerp(p0.z, p3.z, e);
      cam.pos.set(pathX(z) + lerp(off0, off3, e), lerp(p0.y, p3.y, e) + bump * Math.sin(Math.PI * e), z);
      if (u >= 1) cam.pos.copy(p3);
      if (travel) { _q.slerpQuaternions(q0, qT, sstep(0, .3, e)); cam.quat.slerpQuaternions(_q, q3, sstep(.68, 1, e)); }
      else cam.quat.slerpQuaternions(q0, q3, sstep(0, 1, e));
      if (o.sync) o.sync(e);
      return u >= 1;
    }, id);
  }

  /* ---------- the dialogue box ---------- */
  const ui = document.createElement('div');
  ui.className = 'story'; ui.hidden = true;
  ui.innerHTML = `
    <div class="story__bar story__bar--top"><span class="story__chapter"></span><button class="story__snd" type="button" aria-pressed="false" data-cursor="Sound"><i aria-hidden="true"></i><span>Sound off</span></button><button class="story__skip" type="button" data-cursor="Skip"><span>Skip intro</span><kbd>Esc</kbd></button></div>
    <div class="story__title" hidden>
      <p class="story__eyebrow">A short walk through the forest</p>
      <h2 class="story__name">Priyanshu Singh</h2>
      <p class="story__lede">Language models, data and design, as told by the keepers of the forest.</p>
      <div class="story__start">
        <button class="story__enter" type="button" data-cursor="Enter">Enter the forest</button>
        <button class="story__snd story__snd--big" type="button" aria-pressed="true" data-cursor="Sound"><i aria-hidden="true"></i><span>Sound on</span></button>
      </div>
      <p class="story__note">Best with sound: the keepers speak. <button class="story__out" type="button" data-cursor="Skip">Skip to the portfolio</button></p>
    </div>
    <div class="story__bar story__bar--bottom"></div>
    <div class="story__stage" data-cursor="Next"></div>
    <div class="story__box">
      <p class="story__who"><i></i><span></span></p>
      <p class="story__text"><span></span><span class="story__ghost" aria-hidden="true"></span></p>
      <div class="story__choices"></div>
      <span class="story__hint" aria-hidden="true">Space</span>
    </div>
    <p class="sr-only" aria-live="polite"></p>`;
  document.body.appendChild(ui);
  const $ = s => ui.querySelector(s);
  const box = $('.story__box'), whoEl = $('.story__who span'), shownEl = $('.story__text span'), ghostEl = $('.story__ghost'), choicesEl = $('.story__choices');
  const chapterEl = $('.story__chapter'), skipEl = $('.story__skip'), skipLabel = $('.story__skip span'), stageEl = $('.story__stage'), srEl = $('.sr-only');
  $('.story__hint').textContent = matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Space';
  const chapter = s => { chapterEl.textContent = s; };
  const titleEl = $('.story__title'), sndEls = ui.querySelectorAll('.story__snd');
  let wantSound = true; // the title card's choice, before sound can start
  const showSound = v => sndEls.forEach(b => { b.setAttribute('aria-pressed', String(v)); b.querySelector('span').textContent = v ? 'Sound on' : 'Sound off'; });
  const soundIsOn = () => !!(window.PS && PS.soundOn && PS.soundOn());
  function setSound(v) { // the page's Sound button is the one switch for everything
    if (v !== soundIsOn() && window.PS && PS.toggleSound) PS.toggleSound(); else sound.setOn(v);
    if (v) sound.unlockSpeech();
    showSound(v);
  }
  document.addEventListener('ps:sound', e => { sound.setOn(e.detail); showSound(e.detail); if (!e.detail) sound.hush(); });
  sndEls.forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (!titleEl.hidden) { wantSound = !wantSound; showSound(wantSound); } else setSound(!soundIsOn());
  }));
  const hideBox = () => box.classList.remove('show', 'done', 'choosing');

  let line = null, choosing = null;
  function speaker(c) {
    current = c;
    for (const o of Object.values(chars)) if (!o.sleepy) o.lookAt = o === c ? 'cam' : c.key;
    c.faceAt = 'cam';
  }
  function say(b, id) {
    const c = chars[b.who];
    speaker(c);
    box.style.setProperty('--c', c.color); whoEl.textContent = c.name;
    shownEl.textContent = ''; ghostEl.textContent = b.text; srEl.textContent = `${c.name}: ${b.text}`;
    box.classList.remove('done', 'choosing'); box.classList.add('show');
    sound.hush();
    if (b.sfx) sound.sfx(b.sfx); // the keeper's own sound first, then the words
    return new Promise((res, rej) => {
      line = { text: b.text, mood: b.mood, who: b.who, n: 0, t: 0, wait: b.sfx && sound.on ? .75 : .1, spk: null, cps: 44, blipAt: 0, auto: b.auto, hold: b.hold, res, c };
      pend(rej, id);
    });
  }
  function typed() { shownEl.textContent = line.text; ghostEl.textContent = ''; line.n = line.text.length; box.classList.add('done'); if (line.hold) { const l = line; line = null; l.res(); } }
  function advance() {
    if (!line) { fast = true; return; }
    if (line.wait > 0 || line.n < line.text.length) { if (line.wait > 0) startLine(); return typed(); }
    const l = line; line = null; sound.hush(); l.res();
  }
  function startLine() { // the voice starts, and the caption types along at the voice's pace
    line.wait = 0;
    line.spk = sound.speak(line.who, line.text, line.mood);
    if (line.spk) line.cps = clamp(line.text.length / line.spk.secs, 16, 60);
  }
  function choose(opts, id) {
    box.classList.add('show', 'done', 'choosing');
    choicesEl.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'story__opt'; b.dataset.cursor = 'Choose'; b.style.setProperty('--c', o.color);
      b.innerHTML = '<span class="story__n"></span><span class="story__label"></span><span class="story__sub"></span>';
      b.children[0].textContent = String(i + 1).padStart(2, '0'); b.children[1].textContent = o.label; b.children[2].textContent = o.sub;
      b.addEventListener('click', e => { e.stopPropagation(); pick(o); });
      b.addEventListener('pointerenter', () => hot(o.who));
      b.addEventListener('focus', () => hot(o.who));
      o.el = b; choicesEl.appendChild(b);
    });
    setTimeout(() => opts[0].el.focus({ preventScroll: true }), 60);
    return new Promise((res, rej) => { choosing = { opts, res }; pend(rej, id); });
  }
  function pick(o) { if (!choosing) return; const ch = choosing; choosing = null; hideBox(); hot(null); ch.res(o.v); }
  let hotWho = null;
  function hot(who) {
    if (who === hotWho) return;
    hotWho = who;
    if (choosing) choosing.opts.forEach(o => o.el.classList.toggle('is-hot', !!who && o.who === who));
    if (who) {
      const c = chars[who]; emote(c, c.key === 'owl' ? 'flap' : 'hop', .5); c.lookAt = 'cam';
      if (performance.now() - (c.sfxAt || 0) > 2500) { c.sfxAt = performance.now(); sound.sfx(who, { vol: .6 }); }
    }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function charAt(e) {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(Object.values(chars).map(c => c.g), true)[0];
    return hit ? hit.object.userData.who : null;
  }
  const cursorEl = document.querySelector('.cursor'), cursorLabel = document.querySelector('.cursor__label');
  stageEl.addEventListener('pointermove', e => {
    if (!choosing) return;
    const who = charAt(e), o = who && choosing.opts.find(x => x.who === who);
    hot(o ? who : null);
    stageEl.style.cursor = o ? 'pointer' : '';
    if (cursorEl) { cursorEl.classList.toggle('is-hover', !!o); if (cursorLabel) cursorLabel.textContent = o ? CAST[who].name : ''; }
  });
  stageEl.addEventListener('click', e => {
    if (choosing) { const who = charAt(e), o = who && choosing.opts.find(x => x.who === who); if (o) pick(o); return; }
    advance();
  });
  box.addEventListener('click', () => { if (!choosing) advance(); });
  skipEl.addEventListener('click', () => skip());
  const closeGate = () => { titleEl.hidden = true; ui.classList.remove('gate'); const g = gateOpen; gateOpen = null; return g; };
  $('.story__enter').addEventListener('click', e => { e.stopPropagation(); if (!gateOpen) return; setSound(wantSound); closeGate()(); });
  $('.story__out').addEventListener('click', e => { e.stopPropagation(); closeGate(); skip(); });
  addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); if (gateOpen) closeGate(); skip(); return; }
    if (gateOpen) { if ((e.key === 'Enter' || e.key === ' ') && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); $('.story__enter').click(); } return; }
    if (choosing) {
      const n = parseInt(e.key, 10), els = choosing.opts.map(o => o.el), i = els.indexOf(document.activeElement);
      if (n >= 1 && n <= els.length) { e.preventDefault(); pick(choosing.opts[n - 1]); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length].focus(); }
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
  });
  // the page doesn't scroll under the story; the story scrolls it
  addEventListener('wheel', e => { if (active) { e.preventDefault(); e.stopImmediatePropagation(); } }, { capture: true, passive: false });
  addEventListener('touchmove', e => { if (active && !e.target.closest('.story__box')) e.preventDefault(); }, { passive: false });

  /* ---------- the dock: picks the walk back up from the page ---------- */
  const dock = document.createElement('div');
  dock.className = 'story-dock glass'; dock.hidden = true;
  dock.innerHTML = '<i class="story-dock__dot"></i><span class="story-dock__text"></span><button class="story-dock__go" type="button" data-cursor="Walk"></button><button class="story-dock__x" type="button" aria-label="Hide the guide" data-cursor="Hide">×</button>';
  document.body.appendChild(dock);
  const dockText = dock.querySelector('.story-dock__text'), dockGo = dock.querySelector('.story-dock__go');
  let tourNext = -1;
  function setDock(next) {
    tourNext = next;
    const c = next >= 0 ? chars[STOPS[next].who] : chars.sage;
    dockText.textContent = next >= 0 ? `${c.name} is waiting at ${STOPS[next].sign[0]}` : '';
    dockText.hidden = next < 0;
    dockGo.textContent = next >= 0 ? 'Continue the walk' : 'Walk with a guide';
    dock.style.setProperty('--c', c.color);
    dock.hidden = false;
  }
  dockGo.addEventListener('click', () => open(tourNext));
  dock.querySelector('.story-dock__x').addEventListener('click', () => { dock.hidden = true; tourNext = -1; });

  /* ---------- entering and leaving ---------- */
  const pageEls = () => document.querySelectorAll('.header, main, .footer, .ask');
  function enter() {
    active = true;
    html.classList.add('story-on'); html.classList.remove('story-boot');
    pageEls().forEach(el => { el.inert = true; });
    ui.hidden = false; requestAnimationFrame(() => ui.classList.add('on'));
    dock.hidden = true;
    window.PS?.audio?.hush?.(0, .8);
  }
  function enterFromPage() { scrollPose(cam.pos, cam.quat); rig.w = 1; enter(); }
  function sectionY(k) {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight), el = k >= 0 && document.getElementById(STOPS[k].id);
    return el ? Math.min(el.offsetTop, max) : 0;
  }
  async function exitToPage(id, y, next) {
    hideBox(); chapter(''); current = null;
    const y0 = scrollY, hw = rig.hourW;
    let shown = false;
    await flight((p, q) => scrollPose(p, q), id, {
      sync: e => {
        scrollTo(0, lerp(y0, y, e)); rig.hourW = hw * (1 - sstep(0, .9, e));
        if (!shown && e > .42) { shown = true; window.PS?.audio?.hush?.(1, 3); html.classList.remove('story-on'); ui.classList.remove('on'); pageEls().forEach(el => { el.inert = false; }); }
      }
    });
    rig.w = 0; rig.hourW = 0; active = false; where = 'page';
    window.PS?.audio?.hush?.(1, 3);
    html.classList.remove('story-on'); ui.classList.remove('on'); pageEls().forEach(el => { el.inert = false; });
    setTimeout(() => { if (!active) ui.hidden = true; }, 1300);
    try { localStorage.setItem(SEEN, '1'); } catch (e) {}
    setDock(next);
  }
  function skip() {
    if (!active) return;
    if (gateOpen) closeGate();
    const id = cancel(), y = where === 'camp' ? 0 : scrollY;
    exitToPage(id, y, -1).catch(swallow);
  }
  function open(k = -1) {
    if (active) return;
    if (sound.on) sound.unlockSpeech();
    const id = cancel();
    enterFromPage();
    (k >= 0 ? tour(k, id, true) : backToCamp(id)).catch(swallow);
  }

  /* ---------- the script ---------- */
  const campStage = { center: V(C.x, 0, C.z - 1.3), aud: V(0, 0, 1), wideD: 8.4 };
  const wakeAll = () => { for (const c of Object.values(chars)) c.sleepy = false; };
  const INTRO = [
    { who: 'sage', shot: SHOT.on('sage', .2, 1.05), text: 'Ah. A traveller, and before sunrise too.', mood: 'warm', sfx: 'sage' },
    { who: 'sage', shot: SHOT.wide, text: 'Welcome to the forest. Every path here leads to the work of one person: Priyanshu Singh.', mood: 'grand', emote: ['sage', 'present', 1.8] },
    { who: 'sage', shot: SHOT.on('sage', -.25, .9), text: 'Priyanshu trains and evaluates language models for Scale AI and Outlier, and designs the products people use them through.', mood: 'warm' },
    { who: 'sage', shot: SHOT.wide, text: 'I only tell the story. The keepers of this forest show the way. Wake up, you lot.', mood: 'grand', emote: ['sage', 'raise', 1.5], then: wakeAll },
    { who: 'owl', shot: SHOT.on('owl', .3), text: 'Hoo! Awake. I’m awake. Ledger, keeper of records: every role, every year.', mood: 'sleepy', sfx: 'owl', emote: ['owl', 'flap', .9] },
    { who: 'fox', shot: SHOT.on('fox', -.2), text: 'And I’m Ember! I’ve got the projects. Rainfall models, stock forecasts, a whole gaming hub...', mood: 'excited', sfx: 'fox', emote: ['fox', 'hop', .5] },
    { who: 'owl', shot: SHOT.two('owl', 'fox'), text: 'Ember. Let the traveller breathe.', mood: 'stern', then: () => { emote(chars.fox, 'droop', 2.6); sound.sfx('whimper', { delay: .15 }); } },
    { who: 'fox', shot: SHOT.on('fox', .25, .85), text: '...Hi. Sorry. Hi.', mood: 'sheepish' },
    { who: 'deer', shot: SHOT.on('deer', .2), text: 'I’m Fern. I look after the designs: Figma files, product flows, and the small details nobody notices until they’re wrong.', mood: 'gentle', sfx: 'deer', emote: ['deer', 'nod', .8] },
    { who: 'wisp', shot: SHOT.on('wisp', -.2), text: 'And I’m Lumen. When the sun goes down I carry messages, all the way to Priyanshu’s inbox.', mood: 'playful', sfx: 'wisp' },
    { who: 'fox', shot: SHOT.two('fox', 'wisp'), text: 'Show-off.', mood: 'playful' },
    { who: 'sage', shot: SHOT.high, k: 1.1, text: 'The sun is up. Choose a guide, or find your own way.', mood: 'warm', hold: true }
  ];
  async function play(beats, id, hours) {
    for (let i = 0; i < beats.length; i++) {
      const b = beats[i];
      if (hours) hourGoal = lerp(hours[0], hours[1], (i + 1) / beats.length);
      if (b.shot) follow(b.shot, b.k ?? 1.5);
      if (b.emote) emote(chars[b.emote[0]], b.emote[1], b.emote[2]);
      await say(b, id);
      if (b.then) b.then();
    }
  }
  const campOptions = () => [
    { v: 'all', label: 'Take the whole walk', sub: 'All four guides', color: CAST.sage.color },
    ...STOPS.map((s, i) => ({ v: i, who: s.who, label: CAST[s.who].name, sub: s.sign[0], color: CAST[s.who].color })),
    { v: 'own', label: 'Find my own way', sub: 'Straight to the page', color: '#f3efe6' }
  ];

  // gate: open on a title card first. Browsers only let sound start from a click, and the voices are half the story.
  let gateOpen = null;
  async function intro(id, gate) {
    scrollTo(0, 0);
    enter(); where = 'camp'; stage = campStage;
    skipLabel.textContent = 'Skip intro'; chapter('Prologue');
    rig.w = 1; rig.hourW = 1; rig.hour = hourGoal = 5.9;
    campPositions(true, true);
    cam.pos.copy(at(C.x + 1.6, C.z + 12.8, 1.15)); quatLook(cam.pos, V(C.x, C.y + 1, C.z - 1.5), cam.quat);
    follow(() => { cam.wantPos.copy(at(C.x + .4, C.z + 8.6, 1.45)); cam.wantLook.set(C.x, C.y + 1.05, C.z - 1.6); }, gate ? .06 : .45);
    if (gate) {
      titleEl.hidden = false; ui.classList.add('gate'); showSound(wantSound);
      setTimeout(() => titleEl.querySelector('.story__enter').focus({ preventScroll: true }), 400);
      await new Promise((res, rej) => { gateOpen = res; pend(rej, id); });
      cam.k = .45;
      await wait(reduce ? .2 : 1.4, id);
    } else await wait(reduce ? .3 : 2.6, id);
    await play(INTRO, id, [5.9, 8.8]);
    return campChoice(id);
  }
  async function campChoice(id) {
    const v = await choose(campOptions(), id);
    skipLabel.textContent = 'End the walk';
    if (v === 'own') { await say({ who: 'sage', text: 'Then go well. Call on us whenever you want a guide.', auto: 1.3 }, id); return exitToPage(id, 0, -1); }
    if (v === 'all') { await say({ who: 'sage', text: 'Then we begin where every story begins: with a name. Ledger will meet you further on.', auto: 1.6 }, id); return exitToPage(id, 0, 0); }
    const host = chars[STOPS[v].who];
    await say({ who: 'sage', text: `${host.name} it is. Go on ahead, ${host.name}.`, auto: 1.1 }, id);
    host.faceAt = null; host.lookAt = null; host.liftGoal = host.walkLift; host.goal.set(pathX(C.z - 24), 0, C.z - 24);
    return tour(v, id, false);
  }
  async function backToCamp(id) {
    hideBox(); chapter('The campfire'); skipLabel.textContent = 'End the walk';
    const y0 = scrollY;
    campPositions(false, false);
    stage = campStage;
    await flight((p, q) => { p.copy(at(C.x + .4, C.z + 8.6, 1.45)); quatLook(p, _b.set(C.x, C.y + 1.05, C.z - 1.6), q); }, id, { sync: e => scrollTo(0, lerp(y0, 0, e)) });
    where = 'camp';
    follow(SHOT.high, 1.2);
    await say({ who: 'sage', text: 'Back again? Choose a guide, or find your own way.', hold: true }, id);
    return campChoice(id);
  }
  async function tour(k, id, fromPage) {
    for (;;) {
      await journey(k, id, fromPage); fromPage = false;
      const r = await atStation(k, id);
      if (r === 'next') { k++; continue; }
      if (r === 'camp') return backToCamp(id);
      return exitToPage(id, sectionY(k), r === 'show' && k + 1 < STOPS.length ? k + 1 : -1);
    }
  }
  async function journey(k, id, fromPage) {
    const st = stops[k], host = chars[st.who], sc = SCRIPT[st.who], y0 = scrollY, y1 = sectionY(k), hw = rig.hourW;
    hideBox(); current = null; stage = null; skipLabel.textContent = 'End the walk';
    chapter(`${host.name} · ${st.sign[0]}`);
    const onTrail = !fromPage && where === 'trail' && cam.pos.z > st.g.z + 8 && cam.pos.z - st.g.z < 140;
    const z0 = onTrail ? cam.pos.z : st.zA;
    let placed = onTrail;
    const place = () => { // the keeper waits on the trail, a few steps ahead of where we land
      placed = true;
      host.pos.set(pathX(z0 - 4.6), 0, z0 - 4.6); host.goal.copy(host.pos);
      host.liftGoal = host.lift = host.walkLift; host.leash = false; host.sleepy = false; host.asleep = 0;
      host.faceAt = 'cam'; host.yaw = 0;
    };
    await flight((p, q) => walkPose(z0, p, q), id, {
      low: onTrail, dur: onTrail ? 1.4 : undefined,
      sync: e => {
        if (!placed && e > .35) place(); // once the camera is up over the trees
        if (!onTrail) scrollTo(0, lerp(y0, y1, e));
        rig.hourW = hw * (1 - e);
      }
    });
    if (!placed) place();
    where = 'trail';
    host.liftGoal = host.walkLift;
    await say({ who: st.who, ...sc.greet }, id);
    hideBox();
    host.faceAt = null; host.lookAt = null; host.leash = true;
    const start = host.pos.z;
    const chatter = (async () => { await wait(1.1, id); await say({ who: st.who, ...sc.chatter, auto: 2.2 }, id); hideBox(); })();
    await walk(z0, st.g.z + 7, id, st.who === 'deer' ? 6.5 : 8.5, (z, e) => {
      const lz = Math.min(z - 5.5, start);
      host.goal.set(pathX(lz) + Math.sin(lz * .21) * .35, 0, lz);
      if (onTrail) scrollTo(0, lerp(y0, y1, e));
    });
    await chatter;
    host.leash = false;
  }
  async function atStation(k, id) {
    const st = stops[k], host = chars[st.who], sc = SCRIPT[st.who], next = STOPS[k + 1];
    stage = st.stage; chapter(st.sign[1]);
    host.goal.copy(st.G); host.liftGoal = st.perch; host.faceAt = 'cam';
    follow(SHOT.wide, 1.3);
    await wait(.9, id);
    await play(sc.lines.map((ln, i) => ({ who: st.who, ...ln, shot: i === 0 ? SHOT.wide : i % 2 ? SHOT.on(st.who, .28) : SHOT.on(st.who, -.22, .85) })), id);
    // whoever comes next can't wait
    const [[w1, b1], [w2, b2]] = sc.cameo, v = chars[w1];
    v.pos.copy(st.cameoFrom); v.goal.copy(st.cameo); v.lift = v.liftGoal = v.walkLift; v.leash = false; v.sleepy = false; v.asleep = 0; v.faceAt = 'cam';
    follow(SHOT.two(st.who, w1), 1.1);
    await wait(1.8, id);
    await play([{ who: w1, ...b1, emote: [w1, 'hop', .5] }, { who: w2, ...b2, hold: true }], id);
    const opts = [{ v: 'show', label: st.show, sub: st.sign[0], color: host.color }];
    if (next) opts.push({ v: 'next', label: `On to ${CAST[next.who].name}`, sub: next.sign[0], color: CAST[next.who].color, who: next.who });
    else opts.push({ v: 'camp', label: 'Back to the campfire', sub: 'Choose again', color: CAST.sage.color });
    opts.push({ v: 'end', label: 'End the walk', sub: 'Back to the page', color: '#f3efe6' });
    return choose(opts, id);
  }

  /* ---------- timers ---------- */
  const timers = [];
  function wait(sec, id) { return new Promise((res, rej) => { timers.push({ left: sec * (reduce ? .3 : 1), res, id }); pend(rej, id); }); }

  /* ---------- boot ---------- */
  let booted = false;
  let seen = false; try { seen = !!localStorage.getItem(SEEN); } catch (e) {}
  if (!html.classList.contains('story-boot')) setDock(-1);
  // jump(): show one moment without playing up to it, for previews. 'camp:3', 'walk:1:5' (tenths of the way), 'station:2:1'
  function jump(spec) {
    booted = true;
    const [kind, a = 0, b = 0] = String(spec).split(':'), k = +a, i = +b, id = cancel();
    enter(); rig.w = 1;
    const settle = () => {
      for (const c of Object.values(chars)) {
        c.pos.x = c.goal.x; c.pos.z = c.goal.z; c.lift = c.liftGoal; c.asleep = c.sleepy ? 1 : 0;
        if (c.faceAt) { ref(c.faceAt, _t); c.yaw = Math.atan2(_t.x - c.pos.x, _t.z - c.pos.z); }
        stepChar(c, 0, 0);
      }
      if (cam.shot) cam.shot();
      cam.pos.copy(cam.wantPos); cam.lookNow.copy(cam.wantLook); quatLook(cam.pos, cam.lookNow, cam.quat);
    };
    const show = (b2) => { say(b2, id).catch(swallow); typed(); };
    if (kind === 'camp') {
      where = 'camp'; stage = campStage; campPositions(k < 4, true);
      rig.hourW = 1; rig.hour = hourGoal = lerp(5.9, 8.8, (k + 1) / INTRO.length);
      const bt = INTRO[Math.min(k, INTRO.length - 1)];
      cam.follow = true; cam.shot = bt.shot; show(bt);
      if (k >= INTRO.length - 1) choose(campOptions(), id).catch(swallow);
      settle();
    } else {
      const st = stops[k], host = chars[st.who], sc = SCRIPT[st.who];
      scrollTo(0, sectionY(k)); where = 'trail';
      if (kind === 'walk') {
        const z = lerp(st.zA, st.g.z + 7, i / 10);
        host.goal.set(pathX(z - 5.5), 0, z - 5.5); host.liftGoal = host.walkLift; host.faceAt = null;
        settle(); host.yaw = Math.PI;
        walkPose(z, cam.pos, cam.quat); cam.follow = false;
        show({ who: st.who, ...(i ? sc.chatter : sc.greet) }); host.faceAt = null;
      } else {
        stage = st.stage; host.goal.copy(st.G); host.liftGoal = st.perch; host.faceAt = 'cam';
        cam.follow = true;
        if (i < sc.lines.length) { cam.shot = i === 0 ? SHOT.wide : i % 2 ? SHOT.on(st.who, .28) : SHOT.on(st.who, -.22, .85); show({ who: st.who, ...sc.lines[i] }); }
        else {
          const [[w1, b1], [w2, b2]] = sc.cameo, v = chars[w1];
          v.goal.copy(st.cameo); v.liftGoal = v.walkLift; v.faceAt = 'cam';
          cam.shot = SHOT.two(st.who, w1); show(i > sc.lines.length ? { who: w2, ...b2 } : { who: w1, ...b1 });
        }
        settle();
      }
    }
  }
  window.__story = { open, skip, jump, intro: () => { if (!active) { const id = cancel(); intro(id, true).catch(swallow); } }, get active() { return active; }, seen };

  /* ---------- per frame ---------- */
  return {
    update(dt, t, nightNow, hourNow) {
      night = nightNow; dt *= window.__storyRate || 1; // __storyRate: fast-forward, for tests
      if (!booted) { booted = true; if (html.classList.contains('story-boot')) { const id = cancel(); intro(id, true).catch(swallow); } }
      for (let i = timers.length - 1; i >= 0; i--) { const w = timers[i]; if (w.id !== run) { timers.splice(i, 1); continue; } if ((w.left -= dt) <= 0) { timers.splice(i, 1); w.res(); } }
      if (line && line.wait > 0 && (line.wait -= dt) <= 0) startLine();
      if (line && !(line.wait > 0) && line.n < line.text.length) {
        const k0 = Math.floor(line.n);
        line.n = Math.min(line.text.length, line.n + dt * (reduce ? 1e4 : line.cps));
        const k = Math.floor(line.n);
        shownEl.textContent = line.text.slice(0, k); ghostEl.textContent = line.text.slice(k);
        // no voice on this device: a little babble in the keeper's own pitch instead
        if (!line.spk && sound.on && /[aeiouy]/i.test(line.text.slice(k0, k)) && t - line.blipAt > .075) { line.blipAt = t; sound.blip(line.who); }
        if (line.n >= line.text.length) typed();
      } else if (line && line.auto && !(line.wait > 0) && (!line.spk || line.spk.done) && (line.t += dt) > (line.spk ? .5 : line.auto)) advance();
      // who's talking: the one being typed, or the one whose voice is still going
      const spk = sound.speaking;
      for (const c of Object.values(chars)) c.talking = (line && line.c === c && !(line.wait > 0) && line.n < line.text.length) || (spk && !spk.done && spk.who === c.key);

      if (cam.drive) { const d = cam.drive; if (d.fn(dt)) { if (cam.drive === d) cam.drive = null; d.res(); } }
      else if (cam.follow) {
        if (cam.shot) cam.shot();
        const k = 1 - Math.exp(-dt * cam.k);
        cam.pos.lerp(cam.wantPos, k); cam.lookNow.lerp(cam.wantLook, k);
        quatLook(cam.pos, cam.lookNow, cam.quat);
      }
      if (active) {
        rig.pos.copy(cam.pos); rig.quat.copy(cam.quat);
        if (!reduce && cam.follow) { _e.set(Math.sin(t * .53) * .004, Math.sin(t * .37 + 1) * .006, 0); rig.quat.multiply(_q.setFromEuler(_e)); } // a hand-held drift
        _f.set(0, 0, -9).applyQuaternion(cam.quat).add(cam.pos); rig.focus.set(_f.x, groundAt(_f.x, _f.z), _f.z);
        rig.hour = lerp(rig.hour, hourGoal, 1 - Math.exp(-dt * .6));
      }

      for (const c of Object.values(chars)) stepChar(c, dt, t);
      const fd = camera.position.distanceTo(C);
      sound.update({ night, hour: hourNow ?? 10, fire: 1 / (1 + (fd / 7) ** 2), story: active, speaking: !!(sound.speaking && !sound.speaking.done) });
      fire.update(t, dt);
      for (const l of lanterns) { l.gl.material.opacity = .15 + night * .75; l.core.material.color.setScalar(.75 + night * .25); }
      for (const m of glowCaps) m.emissiveIntensity = night * 1.1;

      // a soft key light on whoever is talking, stronger after dark
      const on = active && stage ? 1 : 0;
      if (on) {
        if (current) headPos(current, _a); else { _a.copy(stage.center); _a.y = groundAt(_a.x, _a.z) + 1; }
        keyLight.position.copy(_a).addScaledVector(stage.aud, 2.4); keyLight.position.y += 1.2;
      }
      keyLight.intensity = lerp(keyLight.intensity, on * lerp(4, 6.5, night), 1 - Math.exp(-dt * 3));
    }
  };
}

/* =====================================================================
   FOREST SOUND
   Everything you hear in the forest, generated live with Web Audio:
   wind in the trees, birdsong by day (a full dawn chorus at sunrise),
   crickets and a far-off owl at night, the campfire when you're near
   it, and the forest song that plays under the story.
   Plus the keepers' voices. Each speaks with its own voice (the
   browser's speech synthesis, tuned per character and per mood) and has
   a sound of its own: the sage hums, the owl hoots, the fox yips, the
   deer calls softly and the wisp chimes.
   story.js drives this every frame; the Sound button in main.js turns
   it on and off (the 'ps:sound' event).
   ===================================================================== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

let ac = null, master, musicBus, ambBus, sfxBus, birdBus, fireBus, verbIn, noiseBuf;
let on = false, musicOn = 0, timer = 0;
const state = { night: 0, hour: 10, fire: 0, story: false, speaking: false };

function init() {
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
  master = ac.createGain(); master.gain.value = 0;
  master.connect(comp).connect(ac.destination);

  // one soft hall for everything: birds far away, the song, the keepers' sounds
  verbIn = ac.createConvolver(); verbIn.buffer = hall(3.4);
  const vg = ac.createGain(); vg.gain.value = .55; verbIn.connect(vg).connect(master);

  musicBus = ac.createGain(); musicBus.gain.value = 0;
  const musicLP = ac.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 3200; musicLP.Q.value = .4;
  musicBus.connect(musicLP).connect(master); musicBus.lp = musicLP;
  ambBus = ac.createGain(); ambBus.gain.value = .9; ambBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = .55; sfxBus.connect(master); send(sfxBus, .35);
  birdBus = ac.createGain(); birdBus.gain.value = .5; birdBus.connect(ambBus); send(birdBus, .6);
  fireBus = ac.createGain(); fireBus.gain.value = 0; fireBus.connect(ambBus);

  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  wind.build(); fire.build();
  timer = setInterval(tick, 90);
}
function send(node, amt) { const g = ac.createGain(); g.gain.value = amt; node.connect(g).connect(verbIn); return g; }
function hall(sec) {
  const sr = ac.sampleRate, len = Math.floor(sr * sec), ir = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let z = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, k = .5 * Math.exp(-t * 1.8) + .04; z += k * ((Math.random() * 2 - 1) - z); d[i] = z * Math.exp(-t * 6.9 / sec) * Math.min(1, t / .02) * 2.2; }
  }
  return ir;
}
const pan = (p, to) => { if (!ac.createStereoPanner) return to; const n = ac.createStereoPanner(); n.pan.value = clamp(p, -1, 1); n.connect(to); return n; };
const glide = (param, v, sec) => param.setTargetAtTime(v, ac.currentTime, Math.max(.01, sec / 3));

/* a short tone with a pitch sweep and a quick envelope: the building block of the birdsong */
function tone(t, f0, f1, dur, vol, out, type = 'sine', attack = .01) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(attack, dur * .4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + .03);
  return o;
}
function burst(t, dur, vol, out, f, q = 1, type = 'bandpass') { // a slice of noise through a filter
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 1.8, dur + .02);
}

/* ---------- wind in the trees ---------- */
const wind = {
  build() {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    this.low = ac.createBiquadFilter(); this.low.type = 'bandpass'; this.low.frequency.value = 420; this.low.Q.value = .7;
    this.lg = ac.createGain(); this.lg.gain.value = 0;
    this.high = ac.createBiquadFilter(); this.high.type = 'highpass'; this.high.frequency.value = 3200;
    this.hg = ac.createGain(); this.hg.gain.value = 0;
    src.connect(this.low).connect(this.lg).connect(ambBus);
    src.connect(this.high).connect(this.hg).connect(ambBus);
    src.start();
  },
  update(t) {
    const gust = .5 + .32 * Math.sin(t * .13) * Math.sin(t * .071 + 1.3) + .18 * Math.sin(t * .37 + 2);
    glide(this.low.frequency, 320 + gust * 380, .8);
    glide(this.lg.gain, .05 + gust * .06, .8);       // the roar through the canopy
    glide(this.hg.gain, .004 + gust * gust * .02, .6); // leaves rustling at the peaks
  }
};

/* ---------- the campfire ---------- */
const fire = {
  build() {
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    this.roar = ac.createGain(); this.roar.gain.value = .22;
    src.connect(lp).connect(this.roar).connect(fireBus); src.start();
    this.out = pan(0, fireBus);
  },
  schedule(t0, t1) { // crackles come in little clusters, with the odd louder pop
    let t = t0;
    while ((t += rand(.02, .16) * (Math.random() < .2 ? 4 : 1)) < t1) {
      burst(t, rand(.003, .014), rand(.08, .5), this.out, rand(1800, 6000), rand(.8, 2));
      if (Math.random() < .05) burst(t + .01, rand(.02, .05), rand(.5, .9), this.out, rand(500, 900), 1.2);
    }
  }
};

/* ---------- birds by day ---------- */
const BIRDS = [
  (t, out, k) => { // a warbler: a quick run of sliding notes
    const base = rand(2600, 3900) * k, n = 5 + (Math.random() * 5 | 0);
    for (let i = 0; i < n; i++) { const f = base * rand(.82, 1.25), d = rand(.045, .09); tone(t, f, f * rand(.78, 1.3), d, .06, out); t += d + rand(.015, .04); }
  },
  (t, out, k) => { // a clear two-note whistle, high then lower
    const f = rand(3600, 4100) * k;
    tone(t, f, f * .97, .3, .05, out, 'sine', .05); tone(t + .38, f * .84, f * .82, .36, .045, out, 'sine', .05);
  },
  (t, out, k) => { // a trill
    const f = rand(4200, 5200) * k;
    for (let i = 0; i < 14; i++) tone(t + i * .042, f * 1.04, f * .95, .028, .035, out);
  },
  (t, out, k) => { // chips
    const f = rand(4500, 6000) * k;
    for (let i = 0, n = 2 + (Math.random() * 3 | 0); i < n; i++) tone(t + i * rand(.1, .18), f, f * .6, .035, .04, out);
  },
  (t, out) => { // a dove, low and far off
    const f = rand(480, 560);
    [[0, .26], [.42, .55], [1.1, .3], [1.5, .3]].forEach(([dt, d], i) => tone(t + dt, f * (i === 1 ? 1.06 : 1), f * .95, d, .03, out, 'triangle', .08));
  }
];
const birds = {
  next: 0,
  schedule(t0, t1) {
    const day = 1 - clamp(state.night * 1.6, 0, 1);
    const dawn = Math.exp(-(((state.hour - 7) / 1.6) ** 2)); // the dawn chorus
    const rate = day * (.35 + dawn * 1.6);                   // songs per second
    if (rate < .02) { this.next = t1; return; }
    if (!this.next || this.next < t0) this.next = t0 + rand(.2, 1.5);
    while (this.next < t1) {
      const d = rand(.25, 1), out = pan(rand(-.9, .9), birdBus), g = ac.createGain(); g.gain.value = d; g.connect(out);
      BIRDS[Math.random() < .12 ? 4 : Math.random() * 4 | 0](this.next, g, rand(.92, 1.08));
      this.next += rand(.4, 2.2) / rate;
    }
  }
};

/* ---------- crickets and an owl at night ---------- */
const nightlife = {
  crickets: [0, 1, 2, 3].map(i => ({ next: 0, f: 4300 + i * 260, p: .55 + i * .13, pan: [-.7, .5, -.2, .8][i] })),
  owl: 0,
  schedule(t0, t1) {
    const n = clamp((state.night - .35) / .5, 0, 1);
    if (n < .02) return;
    for (const c of this.crickets) {
      if (!c.next || c.next < t0) c.next = t0 + rand(0, c.p);
      while (c.next < t1) {
        const out = pan(c.pan, ambBus);
        for (let k = 0; k < 3; k++) tone(c.next + k * .045, c.f, c.f * .99, .022, .012 * n, out, 'sine', .004);
        c.next += c.p * rand(.9, 1.15);
      }
    }
    if (!this.owl) this.owl = t0 + rand(6, 14);
    if (this.owl < t1) { // hoo... hoo-hoo, somewhere across the valley
      const g = ac.createGain(); g.gain.value = .5 * n; g.connect(pan(rand(-.8, .8), ambBus)); send(g, .9);
      hoot(this.owl, g, rand(300, 340), .03);
      this.owl += rand(18, 36);
    }
  }
};
function hoot(t, out, f, vol) {
  [[0, .32], [.7, .16], [.92, .4]].forEach(([dt, d]) => {
    const o = tone(t + dt, f * 1.05, f * .93, d, vol, out, 'sine', .06);
    const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 7; vg.gain.value = f * .015; v.connect(vg).connect(o.frequency); v.start(t + dt); v.stop(t + dt + d + .05);
  });
}

/* ---------- the forest song ----------
   Kalimba plucks over a slow, warm pad, with a soft bass and now and then a
   wooden flute. D major, 70 bpm: D, Bm, G, A, two bars each. */
const BEAT = 60 / 70;
const SONG = [[50, [62, 66, 69, 74]], [47, [62, 66, 69, 71]], [43, [59, 62, 66, 71]], [45, [61, 64, 69, 71]]];
const PENTA = [74, 76, 78, 81, 83, 86];
const TUNE = [ // [beat in the 32-beat loop, note, beats]
  [0, 78, 1.5], [1.5, 76, .5], [2, 74, 2], [4, 81, 1.5], [5.5, 78, .5], [6, 76, 2],
  [8, 74, 1], [9, 76, 1], [10, 78, 2], [12, 76, 1], [13, 74, 1], [14, 71, 2],
  [16, 74, 1.5], [17.5, 76, .5], [18, 78, 2], [20, 83, 2], [22, 81, 2],
  [24, 78, 1.5], [25.5, 76, .5], [26, 76, 2], [28, 73, 2], [30, 76, 2]
];
const song = {
  beat: 0, at: 0, loop: 0,
  schedule(t0, t1) {
    if (musicOn < .01 && musicBus.gain.value < .005) { this.at = 0; return; }
    if (!this.at || this.at < t0 - .5) { this.at = t0 + .1; this.beat = 0; }
    while (this.at < t1) {
      const b = this.beat % 32, ci = Math.floor(b / 8), [root, notes] = SONG[ci], t = this.at;
      if (b % 8 === 0) { padChord(t, notes, BEAT * 8); bass(t, root, BEAT * 7); }
      if (b % 8 === 4) bass(t, root + 7 > 52 ? root - 5 : root + 7, BEAT * 3);
      // two eighth notes per beat of kalimba, sparser after dark
      for (let h = 0; h < 2; h++) {
        const density = .62 - state.night * .28;
        if (Math.random() < density || (h === 0 && b % 2 === 0)) {
          const pool = Math.random() < .7 ? notes.map(n => n + 12) : PENTA;
          pluck(t + h * BEAT / 2 + rand(0, .012), pool[Math.random() * pool.length | 0], rand(.035, .06), rand(-.5, .5));
        }
      }
      if (this.loop % 2 === 1) for (const [nb, n, len] of TUNE) if (nb >= b && nb < b + 1) flute(t + (nb - b) * BEAT, n, len * BEAT);
      this.at += BEAT; this.beat++;
      if (this.beat % 32 === 0) this.loop++;
    }
  }
};
function pluck(t, n, vol, p) { // a kalimba: a sine with a bright, quickly fading tine overtone
  const f = hz(n), out = pan(p, musicBus), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
  o.frequency.value = f; o2.frequency.value = f * 5.4;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + 2.4);
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vol * .3, t + .002); g2.gain.exponentialRampToValueAtTime(.0001, t + .22);
  o.connect(g).connect(out); o2.connect(g2).connect(out); send(g, .5);
  o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + .3);
}
function padChord(t, notes, dur) {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(musicBus); send(lp, .6);
  for (const n of notes) for (const det of [-7, 7]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = hz(n - 12); o.detune.value = det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + 2.6); g.gain.setValueAtTime(.022, t + dur - .4); g.gain.linearRampToValueAtTime(0, t + dur + 2.2);
    o.connect(g).connect(lp); o.start(t); o.stop(t + dur + 2.4);
  }
}
function bass(t, n, dur) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.value = hz(n - 12);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + dur + .05);
}
function flute(t, n, dur) { // a breathy wooden flute: a sine with a slow vibrato and a little air
  const f = hz(n), o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
  o.frequency.value = f; v.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * .006, t + dur * .6);
  v.connect(vg).connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.04, t + .12); g.gain.setValueAtTime(.04, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur + .1);
  o.connect(g).connect(musicBus); send(g, .8);
  o.start(t); v.start(t); o.stop(t + dur + .15); v.stop(t + dur + .15);
  burst(t, Math.min(.25, dur), .012, musicBus, f * 2, 3);
}

function tick() {
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime + .05, t1 = ac.currentTime + .35;
  if (state.fire > .02) fire.schedule(t0, t1);
  birds.schedule(t0, t1);
  nightlife.schedule(t0, t1);
  song.schedule(t0, t1);
}

/* ---------- each keeper's own sound ---------- */
const SFX = {
  sage(t, out) { // a low, thoughtful hum, and the staff's orb shimmering
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480; f.connect(out);
    tone(t, 110, 104, 1.1, .08, f, 'sawtooth', .25); tone(t, 165, 158, 1, .03, f, 'sawtooth', .3);
    [1568, 1976, 2349].forEach((fq, i) => tone(t + .2 + i * .09, fq, fq, .9, .012, out, 'sine', .01));
  },
  owl(t, out) { hoot(t, out, 400, .09); },
  fox(t, out) { // two bright yips
    for (const dt of [0, .18]) { const o = tone(t + dt, 720, 1500, .1, .06, out, 'triangle', .006); o.frequency.exponentialRampToValueAtTime(900, t + dt + .12); }
  },
  deer(t, out) { // a soft, breathy call
    const o = tone(t, 290, 330, .5, .05, out, 'triangle', .08);
    const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 7; vg.gain.value = 9; v.connect(vg).connect(o.frequency); v.start(t); v.stop(t + .55);
    burst(t, .4, .03, out, 900, .8);
  },
  wisp(t, out) { // a little rising chime
    [1760, 2217, 2637, 3520].forEach((f, i) => {
      const o = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain(), s = t + i * .07;
      o.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 1.5, s); mg.gain.exponentialRampToValueAtTime(1, s + .6);
      m.connect(mg).connect(o.frequency);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.035, s + .005); g.gain.exponentialRampToValueAtTime(.0001, s + 1.1);
      o.connect(g).connect(out); o.start(s); m.start(s); o.stop(s + 1.2); m.stop(s + 1.2);
    });
  },
  whimper(t, out) { tone(t, 1100, 620, .35, .04, out, 'triangle', .02); },  // the fox, told off
  blip(t, out, f) { tone(t, f, f * rand(.9, 1.1), .06, .03, out, 'square', .004); } // voice stand-in when speech isn't available
};
const PITCH = { sage: 150, owl: 520, fox: 780, deer: 430, wisp: 1150 };

/* =====================================================================
   VOICES
   Each keeper gets a different system voice where the device has one,
   then its own pitch and pace; each line's mood nudges both.
   ===================================================================== */
const synth = window.speechSynthesis;
const CAST_VOICE = {
  sage: { prefer: ['Daniel', 'Google UK English Male', 'Arthur', 'Oliver', 'Aaron', 'Rishi', 'Fred'], pitch: .72, rate: .84 },
  owl:  { prefer: ['Moira', 'Serena', 'Kate', 'Martha', 'Google UK English Female', 'Fiona', 'Tessa'], pitch: .98, rate: .92 },
  fox:  { prefer: ['Samantha', 'Google US English', 'Ava', 'Allison', 'Zoe', 'Nicky', 'Susan'], pitch: 1.32, rate: 1.14 },
  deer: { prefer: ['Karen', 'Tessa', 'Fiona', 'Veena', 'Catherine', 'Google UK English Female', 'Moira'], pitch: 1.06, rate: .88 },
  wisp: { prefer: ['Tessa', 'Google UK English Female', 'Samantha', 'Victoria', 'Shelley', 'Karen'], pitch: 1.55, rate: 1 }
};
const MOODS = {
  warm: [1, 1, 1], grand: [.93, .97, 1], sleepy: [.82, .94, .9], excited: [1.12, 1.08, 1], stern: [.92, .93, 1],
  sheepish: [.88, 1.05, .75], gentle: [.94, 1.02, .9], proud: [1, 1.03, 1], playful: [1.06, 1.06, 1], hushed: [.95, 1, .7]
};
// what the captions say, made easier to say out loud
const SAY = [[/Priyanshu/g, 'Preeyanshu'], [/2005priyanshu@gmail\.com/g, '2 0 0 5 Preeyanshu, at gmail dot com'], [/\bRLHF\b/g, 'R L H F'], [/\bSFT\b/g, 'S F T'],
  [/\bQA\b/g, 'Q A'], [/\bLLM\b/g, 'L L M'], [/\bAI\b/g, 'A I'], [/XGBoost/g, 'X G Boost'], [/FastAPI/g, 'Fast A P I'], [/\.\.\./g, '…']];
let picked = null, speakingNow = null;
function pickVoices() {
  const all = synth ? synth.getVoices().filter(v => /^en/i.test(v.lang)) : [];
  if (!all.length) return null;
  const used = new Set(), out = {};
  const score = (v, name) => v.name.startsWith(name) ? 10 + (/premium|enhanced|natural/i.test(v.name) ? 3 : 0) + (v.localService ? 1 : 0) : 0;
  for (const [who, c] of Object.entries(CAST_VOICE)) {
    let best = null, bs = 0;
    for (const v of all) {
      if (used.has(v.name)) continue;
      const s = Math.max(0, ...c.prefer.map((n, i) => score(v, n) ? score(v, n) + (c.prefer.length - i) : 0));
      if (s > bs) { bs = s; best = v; }
    }
    best = best || all.find(v => !used.has(v.name)) || all[0];
    used.add(best.name); out[who] = best;
  }
  return out;
}
if (synth) { picked = pickVoices(); synth.onvoiceschanged = () => { picked = pickVoices(); }; }

/* ---------- the module's face ---------- */
export const sound = {
  get on() { return on; },
  get canSpeak() { return !!(synth && picked); },
  setOn(v) { // call from a click the first time, so the browser lets it start
    on = v;
    if (on && !ac) init();
    if (!ac) return;
    if (on) ac.resume();
    glide(master.gain, on ? .9 : 0, on ? 1.2 : .4);
    if (!on) this.hush();
  },
  unlockSpeech() { // Safari only lets speech start from a click, so say nothing once, from one
    if (!synth) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {}
  },
  update(s) {
    Object.assign(state, s);
    if (!ac || !on) return;
    const t = ac.currentTime;
    if (t - (this.last || 0) < .1) return; // ten updates a second is plenty for slow fades
    this.last = t;
    wind.update(t);
    glide(fireBus.gain, clamp(state.fire, 0, 1) * .9, .6);
    musicOn = state.story ? 1 : 0;
    glide(musicBus.gain, musicOn * (state.speaking ? .5 : .85), state.speaking ? .4 : 1.6); // the song steps back while someone talks
    glide(musicBus.lp.frequency, 3400 - state.night * 2200, 2);
    glide(ambBus.gain, state.story ? .9 : .5, 2);
  },
  sfx(name, opt = {}) {
    if (!ac || !on || !SFX[name]) return;
    const g = ac.createGain(); g.gain.value = opt.vol ?? 1; g.connect(pan(opt.pan ?? 0, sfxBus));
    SFX[name](ac.currentTime + (opt.delay || 0) + .02, g, opt.f);
  },
  blip(who) { this.sfx('blip', { f: PITCH[who] * rand(.85, 1.2), vol: .8 }); },
  // speaks a line in a keeper's voice; resolves when it's done (or straight away when there's no voice)
  speak(who, text, mood = 'warm') {
    if (!on || !synth || !picked) return null;
    const c = CAST_VOICE[who], [r, p, v] = MOODS[mood] || MOODS.warm;
    let words = text; for (const [a, b] of SAY) words = words.replace(a, b);
    const u = new SpeechSynthesisUtterance(words);
    u.voice = picked[who]; u.lang = picked[who].lang;
    u.rate = clamp(c.rate * r, .5, 1.6); u.pitch = clamp(c.pitch * p, .1, 2); u.volume = v;
    const h = { who, u, done: false, secs: words.split(/\s+/).length / (2.55 * u.rate) + .35 }; // u kept so it isn't collected mid-line
    const end = () => { if (h.done) return; h.done = true; if (speakingNow === h) speakingNow = null; };
    u.onend = u.onerror = end;
    setTimeout(end, (h.secs * 2 + 2) * 1000); // some browsers never say they've finished
    speakingNow = h;
    // speaking straight after a cancel gets dropped by some browsers, so leave a beat
    if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(() => { if (speakingNow === h) synth.speak(u); }, 80); }
    else synth.speak(u);
    return h;
  },
  hush() { if (speakingNow) speakingNow.done = true; speakingNow = null; if (synth && (synth.speaking || synth.pending)) synth.cancel(); },
  get speaking() { return speakingNow; }
};

/* =====================================================================
   RADIO MODE SOUNDTRACK
   Five stations, every groove synthesised live with Web Audio. There are
   no recordings or samples here. They are the house band: they play
   whenever a song from the collection is not.
   Patterns are 16 steps to a bar and loop over a four-bar progression.
   ===================================================================== */

export const STATIONS = [
  { freq: '91.1',  name: 'Funk Express',  bpm: 108 },
  { freq: '96.4',  name: 'Night House',   bpm: 124 },
  { freq: '100.8', name: 'Dhol Junction', bpm: 100 },
  { freq: '104.5', name: 'Neon Drive',    bpm: 112 },
  { freq: '107.7', name: 'Glitter Disco', bpm: 118 },
];

const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = name => { const m = /^([A-G][#b]?)(\d)$/.exec(name); return 440 * Math.pow(2, (12 * (+m[2] + 1) + SEMI[m[1]] - 69) / 12); };
const chord = names => names.map(hz);

let ctx = null, out, music, verb, sfxBus, noise;
let station = 0, on = false, muted = false, held = false, step = 0, next = 0, timer = 0;
const queue = [], beatFns = new Set();

function boot() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
  out = ctx.createGain(); out.gain.value = muted ? 0 : .85;
  out.connect(comp); comp.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 0; music.connect(out);
  sfxBus = ctx.createGain(); sfxBus.gain.value = .75; sfxBus.connect(out);
  verb = ctx.createConvolver(); verb.buffer = impulse(1.7);
  const wet = ctx.createGain(); wet.gain.value = .32; verb.connect(wet); wet.connect(out);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function impulse(sec) {
  const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

/* ---------- building blocks ---------- */
function vca(t, peak, attack, decay, dest) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
  g.connect(dest);
  return g;
}
function osc(type, f, t, end, dest) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t);
  o.connect(dest); o.start(t); o.stop(end);
  return o;
}
function hiss(t, end, dest) {
  const s = ctx.createBufferSource();
  s.buffer = noise; s.loop = true; s.connect(dest);
  s.start(t, Math.random() * 1.5); s.stop(end);
  return s;
}
function filt(type, f, q, dest) {
  const b = ctx.createBiquadFilter();
  b.type = type; b.frequency.value = f; if (q) b.Q.value = q;
  b.connect(dest);
  return b;
}
function send(node, amt) { const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(verb); }

/* ---------- instruments ---------- */
const I = {
  kick(t, v = 1) {
    const g = vca(t, v, .002, .32, music);
    osc('sine', 160, t, t + .4, g).frequency.exponentialRampToValueAtTime(42, t + .13);
    osc('square', 1400, t, t + .02, filt('lowpass', 3000, 0, vca(t, v * .22, .001, .015, music)));
  },
  snare(t, v = .5, wet = .45) {
    const g = vca(t, v, .001, .18, music); send(g, wet);
    hiss(t, t + .25, filt('bandpass', 1900, .8, g));
    osc('triangle', 210, t, t + .15, vca(t, v * .6, .001, .09, music)).frequency.exponentialRampToValueAtTime(150, t + .08);
  },
  clap(t, v = .45) {
    const g = ctx.createGain(); g.connect(music); send(g, .55);
    g.gain.setValueAtTime(.0001, t);
    for (const d of [0, .011, .022]) { g.gain.setValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(v * .2, t + d + .009); }
    g.gain.setValueAtTime(v * .8, t + .033); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    hiss(t, t + .25, filt('bandpass', 1300, 1.2, g));
  },
  hat(t, v = .14, open = false) {
    hiss(t, t + (open ? .3 : .06), filt('highpass', 7500, 0, vca(t, v, .001, open ? .22 : .035, music)));
  },
  shaker(t, v = .1) { hiss(t, t + .09, filt('bandpass', 8500, 1.5, vca(t, v, .012, .05, music))); },
  cowbell(t, v = .08) {
    const bp = filt('bandpass', 800, 3, vca(t, v, .001, .12, music));
    osc('square', 540, t, t + .15, bp); osc('square', 800, t, t + .15, bp);
  },
  bass(t, f, d, v = .42, type = 'sawtooth', cut = 700) {
    const lp = filt('lowpass', cut, 6, vca(t, v, .005, d, music));
    lp.frequency.setValueAtTime(cut * 3, t); lp.frequency.exponentialRampToValueAtTime(cut * .6, t + d);
    osc(type, f, t, t + d + .05, lp);
    osc('sine', f, t, t + d + .05, vca(t, v * .55, .005, d, music));
  },
  stab(t, fs, d = .16, v = .13, cut = 2400, type = 'sawtooth') {
    const g = vca(t, v, .004, d, music); send(g, .3);
    const lp = filt('lowpass', cut, 1, g);
    for (const f of fs) { osc(type, f, t, t + d + .05, lp).detune.value = 7; osc(type, f, t, t + d + .05, lp).detune.value = -7; }
  },
  pluck(t, f, d = .2, v = .12, type = 'square') {
    const g = vca(t, v, .002, d, music); send(g, .3);
    const lp = filt('lowpass', 4000, 3, g);
    lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(600, t + d);
    osc(type, f, t, t + d + .05, lp);
  },
  pad(t, fs, d, v = .06) {
    const g = ctx.createGain(); g.connect(music); send(g, .6);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + d * .3); g.gain.linearRampToValueAtTime(.0001, t + d);
    const lp = filt('lowpass', 1600, 0, g);
    for (const f of fs) { osc('sawtooth', f, t, t + d + .05, lp).detune.value = 9; osc('triangle', f, t, t + d + .05, lp); }
  },
  dhol(t, v = .8) { // the bass head
    osc('sine', 120, t, t + .45, vca(t, v, .002, .4, music)).frequency.exponentialRampToValueAtTime(58, t + .2);
    hiss(t, t + .08, filt('lowpass', 900, 0, vca(t, v * .35, .001, .06, music)));
  },
  tak(t, v = .4) { // the treble head
    const g = vca(t, v, .001, .07, music); send(g, .25);
    hiss(t, t + .1, filt('bandpass', 2600, 2, g));
    osc('triangle', 520, t, t + .08, vca(t, v * .5, .001, .06, music));
  },
};

/* ---------- the five stations ---------- */
const FUNK = { chords: [chord(['E4', 'G4', 'B4', 'D5']), chord(['E4', 'G4', 'B4', 'D5']), chord(['A3', 'C#4', 'E4', 'G4']), chord(['B3', 'D4', 'F#4', 'A4'])], roots: ['E2', 'E2', 'A2', 'B2'].map(hz) };
const HOUSE = { chords: [chord(['A3', 'C4', 'E4', 'G4']), chord(['F3', 'A3', 'C4', 'E4']), chord(['C4', 'E4', 'G4', 'B4']), chord(['G3', 'B3', 'D4', 'F#4'])], roots: ['A2', 'F2', 'C3', 'G2'].map(hz) };
const DHOL_A = { 0: 'C6', 2: 'D6', 4: 'E6', 6: 'G6', 8: 'E6', 10: 'D6', 12: 'C6', 14: 'D6' };
const DHOL_B = { 0: 'E6', 2: 'G6', 4: 'A6', 6: 'G6', 8: 'E6', 10: 'D6', 12: 'C6', 13: 'D6', 14: 'C6' };
const SYNTH = { chords: [chord(['D4', 'F4', 'A4']), chord(['A#3', 'D4', 'F4']), chord(['F3', 'A3', 'C4']), chord(['C4', 'E4', 'G4'])], roots: ['D2', 'A#1', 'F2', 'C2'].map(hz) };
const DISCO = { chords: [chord(['F3', 'A3', 'C4', 'E4']), chord(['E3', 'G3', 'B3', 'D4']), chord(['D3', 'F3', 'A3', 'C4']), chord(['C3', 'E3', 'G3', 'B3'])], roots: ['F2', 'E2', 'D2', 'C2'].map(hz) };
const DISCO_HOOK = { 0: 'E5', 3: 'G5', 6: 'A5', 10: 'G5', 12: 'E5' };

const PLAY = [
  function funk(n, t, s16) {
    const s = n % 16, bar = Math.floor(n / 16) % 4, R = FUNK.roots[bar], C = FUNK.chords[bar];
    if (s === 0 || s === 3 || s === 8 || s === 10 || (bar === 3 && s === 14)) I.kick(t, .95);
    if (s === 4 || s === 12) I.snare(t, .5);
    if (s === 7 || s === 15) I.snare(t, .12, .1);
    I.hat(t, s % 2 ? .07 : .13, s === 14);
    const line = { 0: R, 3: R, 4: R * 2, 6: R * 1.5, 8: R, 10: R * 2, 11: R * 1.78, 14: R * 1.5 };
    if (line[s]) I.bass(t, line[s], .13, .4, 'square', 900);
    if (s === 2 || s === 6 || s === 11) I.stab(t, C.slice(1), .09, .08, 3200, 'square');
    if (s === 6 || s === 14) I.cowbell(t, .05);
  },
  function house(n, t, s16) {
    const s = n % 16, bar = Math.floor(n / 16) % 4, R = HOUSE.roots[bar], C = HOUSE.chords[bar];
    if (s % 4 === 0) I.kick(t, 1);
    if (s === 4 || s === 12) I.clap(t, .42);
    if (s % 4 === 2) { I.hat(t, .13, true); I.bass(t, R, .16, .42, 'sawtooth', 520); }
    else I.hat(t, .05);
    if (s === 3 || s === 6 || s === 11) I.stab(t, C, .14, .1, 2600, 'square');
    if (s === 0) I.pad(t, C.map(f => f / 2), s16 * 16, .045);
  },
  function dhol(n, t, s16) {
    const s = n % 16, bar = Math.floor(n / 16) % 4;
    const tt = t + (s % 2 ? s16 * .32 : 0); // the swing that makes it bounce
    if (s === 0 || s === 6 || s === 8 || s === 14) I.dhol(tt, .85);
    if (s === 3 || s === 4 || s === 7 || s === 11 || s === 12 || s === 15) I.tak(tt, .38);
    if (s % 2 === 0) I.shaker(tt, .09);
    if (s === 4 || s === 12) I.clap(tt, .25);
    const riff = bar % 2 ? DHOL_B : DHOL_A;
    if (riff[s]) I.pluck(tt, hz(riff[s]), .1, .1, 'square');
    if (s === 0 || s === 8) I.bass(t, hz('C3'), .4, .3, 'triangle', 600);
  },
  function synth(n, t, s16) {
    const s = n % 16, bar = Math.floor(n / 16) % 4, R = SYNTH.roots[bar], C = SYNTH.chords[bar];
    if (s === 0 || s === 8 || (bar === 3 && s === 11)) I.kick(t, 1);
    if (s === 4 || s === 12) I.snare(t, .5, .9);
    if (s % 2 === 0) I.hat(t, .08);
    if (s % 2 === 0) I.bass(t, s % 4 ? R * 2 : R, .14, .38, 'sawtooth', 600);
    I.pluck(t, C[s % C.length] * (s % 8 < 4 ? 2 : 4), .12, .065, 'square');
    if (s === 0) I.pad(t, C, s16 * 16, .05);
  },
  function disco(n, t, s16) {
    const s = n % 16, bar = Math.floor(n / 16) % 4, R = DISCO.roots[bar], C = DISCO.chords[bar];
    if (s % 4 === 0) I.kick(t, .95);
    if (s === 4 || s === 12) I.clap(t, .4);
    if (s % 4 === 2) I.hat(t, .12, true);
    I.shaker(t, .05);
    if (s % 2 === 0) I.bass(t, s % 4 ? R * 2 : R, .12, .4, 'sawtooth', 900);
    if (s === 3 || s === 10) I.stab(t, C.map(f => f * 2), .22, .09, 3600);
    if (bar % 2 === 0 && DISCO_HOOK[s]) I.pluck(t, hz(DISCO_HOOK[s]), .18, .09, 'triangle');
  },
];

/* ---------- scheduling ---------- */
const spb = () => 60 / STATIONS[station].bpm;
function tick() {
  if (!ctx || !on || held) return;
  while (next < ctx.currentTime + .14) {
    const s16 = spb() / 4;
    PLAY[station](step, next, s16);
    queue.push({ t: next, step, station });
    next += s16; step++;
  }
}

function crackle(t, dur, v = .3) {
  const g = ctx.createGain(); g.connect(sfxBus);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .03);
  g.gain.setValueAtTime(v, t + dur - .08); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  const bp = filt('bandpass', 900, 1.4, g);
  for (let k = 0; k <= 6; k++) bp.frequency.setValueAtTime(500 + Math.random() * 3200, t + dur * k / 6);
  hiss(t, t + dur + .05, bp);
  const w = osc('sine', 1100, t, t + dur, vca(t, v * .12, .02, dur, sfxBus)); // the tuning whistle
  w.frequency.linearRampToValueAtTime(2600, t + dur * .5); w.frequency.linearRampToValueAtTime(900, t + dur);
}

export const radio = {
  stations: STATIONS,
  get station() { return station; },
  get playing() { return on && !!ctx && ctx.state === 'running'; },
  get muted() { return muted; },
  get bpm() { return STATIONS[station].bpm; },
  // Start playing. Call it from a click if you can: browsers only allow sound after one.
  async start(i = station) {
    if (!boot()) return 'unsupported';
    // resume() never settles while the browser is still refusing sound, so don't wait on it forever
    try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 400))]); } catch (e) {}
    if (!on) {
      station = i; step = 0; next = ctx.currentTime + .08; on = true;
      music.gain.setTargetAtTime(held ? 0 : 1, ctx.currentTime, .05);
      clearInterval(timer); timer = setInterval(tick, 25); tick();
    }
    return ctx.state;
  },
  // Retune: crackle, then the new station comes in on its first beat.
  tune(i) {
    i = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    if (i === station) return;
    station = i;
    if (!on || !ctx) return;
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setTargetAtTime(0, now, .03);
    if (!held) music.gain.setTargetAtTime(1, now + .34, .04);
    crackle(now, .38);
    step = 0; next = now + .36; queue.length = 0;
  },
  // Silence the grooves while something else (the opening song) plays. Effects still sound.
  hold(v) {
    v = !!v; if (v === held) return;
    held = v;
    if (!ctx || !on) return;
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setTargetAtTime(held ? 0 : 1, now, .04);
    if (!held) { step = 0; next = now + .1; }
    queue.length = 0;
  },
  get held() { return held; },
  setMuted(v) {
    muted = !!v;
    if (out) out.gain.setTargetAtTime(muted ? 0 : .85, ctx.currentTime, .05);
  },
  onBeat(fn) { beatFns.add(fn); return () => beatFns.delete(fn); },
  // Call once a frame: hands every beat that has just sounded to the listeners.
  frame() {
    if (!ctx) return;
    const now = ctx.currentTime;
    while (queue.length && queue[0].t <= now) {
      const e = queue.shift();
      if (e.step % 4 === 0) for (const fn of beatFns) fn({ step: e.step, beat: e.step / 4, bar: Math.floor(e.step / 16), station: e.station });
    }
  },
  sfx(name) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (name === 'crackle') crackle(t, .36, .26);
    if (name === 'thunder') { // a low roll under the music
      const lp = filt('lowpass', 420, 0, vca(t, .11, .04, 1.3, sfxBus));
      lp.frequency.exponentialRampToValueAtTime(70, t + 1.2); hiss(t, t + 1.4, lp);
      osc('sine', 62, t, t + 1, vca(t, .12, .01, .8, sfxBus)).frequency.exponentialRampToValueAtTime(30, t + .8);
    }
    if (name === 'tick') osc('square', 1800, t, t + .04, filt('lowpass', 4000, 0, vca(t, .08, .001, .03, sfxBus)));
    if (name === 'pop') osc('sine', 500, t, t + .14, vca(t, .2, .002, .1, sfxBus)).frequency.exponentialRampToValueAtTime(1200, t + .08);
    if (name === 'whoosh') {
      const bp = filt('bandpass', 400, 1.2, vca(t, .25, .15, .3, sfxBus));
      bp.frequency.exponentialRampToValueAtTime(4000, t + .4); hiss(t, t + .5, bp);
    }
    if (name === 'down') { // power-down for leaving
      music.gain.setTargetAtTime(0, t, .12);
      const o = osc('sawtooth', 420, t, t + .6, filt('lowpass', 1200, 0, vca(t, .18, .01, .55, sfxBus)));
      o.frequency.exponentialRampToValueAtTime(30, t + .55);
      crackle(t, .5, .2);
    }
  },
};

/* =====================================================================
   RADIO MODE, "DEAD AIR": the page.
   world3d.js draws the universe; this file moves the camera through it
   as the page scrolls, sets the accent colours at every stop, runs the
   music and fills in the cards. While music plays, The Static keeps its
   distance; anything else is dead air.
   ===================================================================== */
import { radio, STATIONS } from './beats.js?v=20261112d';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement, body = document.body, rootStyle = html.style;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const via = html.classList.contains('via-switch');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const up = p => '../' + p; // shared assets live one folder up

/* The collection: one continuous mix. Songs play in order and never change with scrolling; each
   plays through and hands over to the next, unless the visitor picks one. TheFatRat songs, played from his own YouTube videos in a player that is on the
   page but out of sight, so no audio is copied into this site. YouTube's rules ask for a visible
   player, so this may stop working one day; whenever a song is not playing, the house band in
   beats.js fills in. bpm only paces the dancing and is approximate. */
const TRACKS = [
  { id: '3aLyiI2odhU', title: 'Infinite Power!', bpm: 128 },
  { id: 'n8X9_MgEdCg', title: 'Unity', bpm: 105 },
  { id: 'B7xai5u_tnk', title: 'Monody', feat: 'Laura Brehm', bpm: 150 },
  { id: '2Ax_EIb1zks', title: 'Xenogenesis', bpm: 150 },
  { id: '3fxq7kqyWO8', title: 'Time Lapse', bpm: 128 },
  { id: 'cMg8KaMdDYo', title: 'Fly Away', feat: 'Anjulie', bpm: 100 },
  { id: 'KR-eV7fHNbM', title: 'The Calling', feat: 'Laura Brehm', bpm: 100 },
  { id: 'jqkPqfOFmbY', title: 'Windfall', bpm: 116 },
  { id: 'kL8CyVqzmkc', title: 'Jackpot', bpm: 110 },
  { id: 'Ic-gZlPFTkQ', title: 'Never Be Alone', bpm: 100 },
];
const TINTS = ['#ffe600', '#ff2e88', '#00e5ff', '#b6ff00', '#ff6b00', '#7b2cff'];

// One stop per section, with its colours in each theme. Dark keeps the universe black and only
// changes the accents; light also paints the sky.
const STOPS = [
  { light: { bg: '#ff4f1f', a: '#ffe600', b: '#00e0ff', c: '#b6ff00' }, dark: { a: '#ff3b5c', b: '#7df9ff', c: '#ffd60a' } },
  { light: { bg: '#2b2bff', a: '#ff4f9a', b: '#b6ff00', c: '#00e5ff' }, dark: { a: '#8f6bff', b: '#00f5d4', c: '#ff4fd8' } },
  { light: { bg: '#ffb400', a: '#ff3d7f', b: '#3ddc97', c: '#5b5bff' }, dark: { a: '#ffb703', b: '#ff3b8d', c: '#7df9ff' } },
  { light: { bg: '#1a0638', a: '#ff4fd8', b: '#00f0ff', c: '#ffe600' }, dark: { a: '#ff4fd8', b: '#00f0ff', c: '#b6ff00' } },
  { light: { bg: '#00a884', a: '#ffe600', b: '#ff4f9a', c: '#ffffff' }, dark: { a: '#00f5a0', b: '#ffd60a', c: '#ff4f9a' } },
  { light: { bg: '#7b2cff', a: '#b6ff00', b: '#ff8a00', c: '#00e5ff' }, dark: { a: '#b6ff00', b: '#ff8a00', c: '#00e5ff' } },
  { light: { bg: '#0d1b4c', a: '#00f0ff', b: '#ff4fd8', c: '#ffe600' }, dark: { a: '#00d0ff', b: '#ff4fd8', c: '#ffe600' } },
  { light: { bg: '#ff2e88', a: '#ffe600', b: '#00e5ff', c: '#b6ff00' }, dark: { a: '#ff3b5c', b: '#ffd60a', c: '#7df9ff' } },
];
let theme = html.dataset.theme === 'light' ? 'light' : 'dark';
const SHOUT = ['Tune in', 'Priyanshu', 'Singh', "Let's go!"];

/* ---------- content built here ---------- */
for (const el of $$('[data-letters]')) {
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = [...el.textContent].map(ch => `<span class="l">${esc(ch)}</span>`).join('');
}
// real design work only: entries whose covers are still SVG placeholders are left out
const CASES = (window.CASE_STUDIES || []).filter(c => c.cover && !/\.svg$/i.test(c.cover));
const caseImages = c => [...new Set([c.cover, ...(c.gallery || []), ...c.sections.flatMap(s => s.images || (s.image ? [s.image] : []))])];
const has = slug => CASES.some(c => c.slug === slug);
const D = f => up('assets/design/' + f);

/* The design district: what world3d.js builds the exhibits from. Each exhibit shows the work as
   the object it was made for. Projects that are missing from case-studies.js are simply left out. */
const SHOW = {
  kulfi: has('shankar-kulfi') && { slug: 'shankar-kulfi', boxes: ['o', 'g', 'b'].map(c => ['front', 'side', 'back', 'story'].map(f => D(`kulfi/${c}-${f}.jpg`))) },
  standees: has('prontoo') && { slug: 'prontoo', panels: [D('prontoo-1.jpg'), D('prontoo-2.jpg')] },
  origins: has('origins') && { slug: 'origins', posts: [1, 2, 3].map(n => D(`origins-${n}.jpg`)), tee: D('rome.jpg'), posters: ['believe', 'expensive', 'manifest'].map(n => D(n + '.png')) },
  pool: CASES.flatMap(c => caseImages(c).map(src => ({ src: up(src), slug: c.slug }))), // every piece, for the TVs and the crate
  billboards: [['kulfi-range.jpg', 'shankar-kulfi'], ['origins-2.jpg', 'origins'], ['prontoo-screens-2.jpg', 'prontoo'], ['kulfi-cart.jpg', 'shankar-kulfi']].filter(b => has(b[1])).map(([f, slug]) => ({ src: D(f), slug })),
  projects: CASES.slice(0, 3).map(c => ({ slug: c.slug, title: c.title, color: { 'shankar-kulfi': 0xb3122e, origins: 0x14553a, prontoo: 0xff7a1a }[c.slug] || 0x8a4bff, moons: caseImages(c).slice(0, 4).map(up) })),
};
// Greatest hits: one 3D mockup per project card. A screen shows an illustration of the project
// unless `shot` points at a real screenshot (a path like 'assets/work/rainfall.jpg').
const HITS = $$('#hits .hit h3').map(h => ({ title: h.textContent, shot: '' }));
SHOW.hits = HITS.map(h => ({ ...h, shot: h.shot && up(h.shot) }));
// the caption for each stop inside the district (the billboards take two stops)
const BILLBOARDS = { kicker: 'Outdoor', title: 'Billboard alley', text: 'The work at street scale. Click a billboard to open its case study.' };
const EXHIBITS = [
  { slug: 'shankar-kulfi', kicker: 'Packaging, folded', title: 'Shankar Kulfi', text: 'The Kesar Pista sleeve in all three colourways, wrapped around real boxes. Drag to turn them.' },
  { slug: 'prontoo', kicker: 'Print, standing up', title: 'Prontoo', text: 'The two roll-up standees: one speaks to students, the other to vendors and partners.' },
  { slug: 'origins', kicker: 'Phone, tee and wall', title: 'ORIGINS', text: 'The Instagram campaign on a phone, the ROME XVII graphic on a tee, and the type posters pasted up behind.' },
  { kicker: 'Channel surf', title: 'The TV stack', text: 'Every screen is a piece of work. Click a TV to change the channel.' },
  { kicker: 'Crate digging', title: 'The record crate', text: 'Flip through the work like vinyl. Click a sleeve for the next one.' },
  BILLBOARDS, BILLBOARDS,
  { kicker: 'In orbit', title: 'Project planets', text: 'Each project is a small world with its pieces in orbit. Click one to open its case study.' },
];

$('#crate').innerHTML = TRACKS.map((t, i) => `
  <button class="glass snd" type="button" data-track="${i}" aria-pressed="false" style="--tint:${TINTS[i % TINTS.length]}">
    <span class="vinyl" aria-hidden="true"></span>
    <span class="snd__n">${String(i + 1).padStart(2, '0')}</span>
    <span class="snd__text"><b>${esc(t.title)}</b><span>TheFatRat${t.feat ? ' feat. ' + esc(t.feat) : ''}</span></span>
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  </button>`).join('');

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .1 });
for (const el of $$('.col > *')) { el.classList.add('rv'); io.observe(el); }

/* ---------- the 3D street ---------- */
const noop = () => {};
let W = { // stands in until the world loads, or for good where WebGL is missing
  zones: STOPS.map((_, i) => ({ a: i, k: 1, pin: i === 2 || i === 3 || i === 4, g: i === 3 ? EXHIBITS.length : i === 4 ? HITS.length : 2 })),
  setU: noop, setTape: noop, intro: noop, setPointer: noop, setPlaying: noop, setTrack: noop, setPalette: noop, beat: noop, setTheme: noop, lunge: noop, setExhibit: noop, setHit: noop,
};
let introCalled = false;
const worldReady = (async () => {
  try {
    await Promise.race([document.fonts.load('120px Anton'), wait(1500)]);
    const m = await import('./world3d.js?v=20261112d');
    W = m.createWorld($('#world'), { reduced, show: SHOW, tapes: $$('#tapes .tape h3').map(h => h.textContent), onPick: slug => openCase(slug), onZap: zap,
      adaptive: !/[?&]hq\b/.test(location.search), // ?hq keeps full quality on slow machines, for screenshots
    });
    W.setTheme(theme, true); W.setPalette(STOPS[Math.max(0, stop)][theme]); W.setTrack(cur, TRACKS.length); W.setPlaying(body.dataset.state === 'playing');
    if (introCalled) W.intro(0);
  } catch (e) { html.classList.add('no-webgl'); console.warn('Radio street could not start:', e); }
})();

/* ---------- music ---------- */
const yt = { player: null, ready: false, dead: false, grace: 0, timer: 0 };
let cur = 0;
const songUsable = () => yt.ready && !yt.dead;
const songState = () => { try { return yt.player.getPlayerState(); } catch (e) { return -1; } };
const audible = () => radio.playing && !radio.muted;

function render() {
  const t = TRACKS[cur], state = !radio.playing ? 'idle' : radio.muted ? 'paused' : 'playing';
  body.dataset.state = state;
  $('.player__title').textContent = t.title + (t.feat ? ` (feat. ${t.feat})` : '');
  $('.player__sub').textContent = state === 'idle' ? 'TheFatRat · press play' : state === 'paused' ? 'TheFatRat · paused'
    : radio.held ? 'TheFatRat · now playing' : `House band · ${STATIONS[radio.station].name}`;
  $('#player').style.setProperty('--tint', TINTS[cur % TINTS.length]);
  $('.pbtn--play').setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
  $$('.snd').forEach((b, i) => { b.classList.toggle('on', i === cur); b.setAttribute('aria-pressed', String(i === cur)); });
  $('.hud__static').textContent = theme === 'light' ? 'On air' : state === 'playing' ? 'The Static: keeping its distance' : 'Dead air. The Static is listening.';
  W.setPlaying(state === 'playing');
}
// lightning struck: the headlines flicker and, if there is sound, thunder rolls
function zap() {
  body.classList.add('zap'); setTimeout(() => body.classList.remove('zap'), 420);
  if (audible()) radio.sfx('thunder');
}
// The house band steps aside only while a song is really playing (or has just been asked to).
function songChanged() {
  const st = songUsable() ? songState() : -1;
  radio.hold(audible() && songUsable() && (st === 1 || st === 3 || performance.now() < yt.grace));
  render();
}
function syncSong() {
  if (songUsable()) {
    if (audible()) {
      yt.player.unMute();
      const st = songState();
      if (st !== 1 && st !== 3) { // the browser may refuse; after a short wait the house band takes over
        yt.grace = performance.now() + 2600;
        yt.player.playVideo();
        clearTimeout(yt.timer); yt.timer = setTimeout(songChanged, 2700);
      }
    } else yt.player.pauseVideo();
  }
  songChanged();
}
function playTrack(i) {
  cur = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  W.setTrack(cur, TRACKS.length);
  if (songUsable()) {
    if (audible()) {
      yt.grace = performance.now() + 3000;
      yt.player.loadVideoById(TRACKS[cur].id);
      clearTimeout(yt.timer); yt.timer = setTimeout(songChanged, 3100);
    } else yt.player.cueVideoById(TRACKS[cur].id);
  }
  songChanged();
}
async function ensureOn() {
  if (!radio.playing) { radio.setMuted(false); await radio.start(0); }
  else if (radio.muted) radio.setMuted(false);
}
async function toggle() {
  if (!radio.playing) await ensureOn(); else radio.setMuted(!radio.muted);
  syncSong();
  if (!live) shout();
}
function loadSong() {
  window.onYouTubeIframeAPIReady = () => {
    yt.player = new YT.Player('tvPlayer', {
      width: '100%', height: '100%', videoId: TRACKS[cur].id, host: 'https://www.youtube-nocookie.com',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => { yt.ready = true; yt.player.getIframe().tabIndex = -1; syncSong(); },
        onStateChange: e => { if (e.data === 0) playTrack(cur + 1); else songChanged(); }, // a song that ends hands over to the next
        onError: () => { yt.dead = true; songChanged(); },
      },
    });
  };
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  setInterval(() => {
    if (!songUsable() || !yt.player.getDuration) return;
    const d = yt.player.getDuration() || 0, t = yt.player.getCurrentTime() || 0;
    $('.player__bar i').style.width = d ? (t / d * 100).toFixed(1) + '%' : '0';
  }, 500);
}
$('#player').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'toggle') return toggle();
  await ensureOn();
  playTrack(cur + (b.dataset.act === 'next' ? 1 : -1));
  radio.sfx('crackle');
  if (!live) shout();
});
$('#crate').addEventListener('click', async e => {
  const b = e.target.closest('.snd'); if (!b) return;
  await ensureOn();
  playTrack(+b.dataset.track);
  radio.sfx('crackle');
});
/* ---------- stops ---------- */
let stop = -1;
const railBtns = $$('.rail button');
function applyStop(i, { quiet = false } = {}) {
  const p = STOPS[i][theme];
  for (const k of ['bg', 'a', 'b', 'c']) if (p[k]) rootStyle.setProperty('--' + k, p[k]);
  $('.hud__stop').textContent = `${String(i + 1).padStart(2, '0')} / ${String(STOPS.length).padStart(2, '0')}`;
  $('meta[name="theme-color"]').content = p.bg || '#05030b';
  W.setPalette(p);
  railBtns.forEach((b, k) => b.classList.toggle('on', k === i));
  stop = i;
  if (live && !quiet) flash();
}

/* ---------- themes: dark is Dead Air, light is the same road by day ---------- */
function paintTheme() {
  const dark = theme === 'dark';
  html.dataset.theme = theme;
  $('#themeBtn .pill__icon').textContent = dark ? '☀' : '☾';
  $('#themeBtn .pill__label').textContent = dark ? 'Lights on' : 'Lights out';
  $('#themeBtn').setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
  W.setTheme(theme, true);
  if (stop >= 0) applyStop(stop, { quiet: true });
  render();
}
// the switch is a cut: a circle of the new theme's colour opens from the button
function switchTheme() {
  const next = theme === 'dark' ? 'light' : 'dark', el = $('.cut'), r = $('#themeBtn').getBoundingClientRect();
  try { localStorage.setItem('radio-theme', next); } catch (e) {}
  if (reduced) { theme = next; return paintTheme(); }
  el.style.setProperty('--cx', (r.left + r.width / 2) + 'px'); el.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
  el.style.setProperty('--cut', next === 'dark' ? '#05030b' : STOPS[Math.max(0, stop)].light.bg);
  el.dataset.to = next;
  $('b', el).textContent = next === 'dark' ? 'Lights out' : 'Lights on';
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  radio.sfx('whoosh');
  setTimeout(() => { theme = next; paintTheme(); }, 400);
}
$('#themeBtn').addEventListener('click', switchTheme);
function flash() {
  if (reduced) return;
  const f = $('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

/* ---------- beat ---------- */
let beatAt = -1e9, beatN = 0;
function onBeat(e) {
  beatAt = performance.now(); beatN++;
  body.dataset.beat = String(beatN % 2);
  W.beat({ beat: beatN });
  if (shouting) shoutNext();
}
radio.onBeat(onBeat);

/* ---------- intro ---------- */
let live = false, shouting = false, shoutI = 0;
function shout() {
  if (live || shouting) return;
  body.classList.remove('await-play');
  if (reduced) return goLive();
  shouting = true; shoutI = 0; shoutNext();
}
function shoutNext() {
  if (shoutI >= SHOUT.length) { shouting = false; return goLive(); }
  const s = $('.shout span');
  s.textContent = SHOUT[shoutI++];
  s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit');
}
function goLive() {
  if (live) return;
  live = true; shouting = false;
  body.classList.remove('boot', 'await-play');
  body.classList.add('live');
  measure(); sm = scrollY;
  radio.sfx('whoosh');
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
}
$('.play').addEventListener('click', toggle);
// scrolling or a key during the intro skips it
function skip(e) {
  if (live) return;
  if (e.type === 'keydown' && !['ArrowDown', 'PageDown', ' ', 'Escape'].includes(e.key)) return;
  goLive();
}
addEventListener('wheel', skip, { passive: true });
addEventListener('touchmove', skip, { passive: true });
addEventListener('keydown', skip);

async function begin() {
  applyStop(0, { quiet: true });
  paintTheme(); loadSong(); measure();
  await Promise.race([worldReady, wait(4000)]);
  if (via) {
    const f = $('.flash'); f.classList.add('out');
    setTimeout(() => { html.classList.remove('via-switch'); f.classList.remove('out'); }, 700);
  }
  introCalled = true;
  W.intro(reduced ? 0 : 1.6);
  // coming through the switch, the click on the forest page usually lets the music start straight away
  let started = false;
  if (via) { started = (await radio.start(0)) === 'running'; if (started) syncSong(); }
  render();
  await wait(reduced ? 200 : 1500);
  if (live) return;
  if (started) shout(); else body.classList.add('await-play');
}

/* ---------- scroll: where the camera is, which tape and which frame ---------- */
const zoneEls = $$('.zone'), capEl = $('#caption');
// rows of cards that step sideways while their section stays put: the jobs and the projects
const rows = [{ zone: 2, el: $('#tapes'), set: k => W.setTape(k) }, { zone: 4, el: $('#hits'), set: k => W.setHit(k) }]
  .map(r => ({ ...r, cards: [...r.el.children], max: 0, on: -1 }));
let secs = [], vh = innerHeight, sm = 0, exOn = -1;

function measure() {
  vh = innerHeight;
  secs = zoneEls.map(el => ({ top: el.offsetTop, h: el.offsetHeight }));
  for (const r of rows) {
    const pad = parseFloat(getComputedStyle(r.el.parentElement).paddingLeft) || 0;
    r.max = Math.max(0, r.el.offsetWidth - (innerWidth - 2 * pad));
    r.on = -1; // lay the row out again
  }
}
addEventListener('resize', measure);
addEventListener('load', measure);
document.fonts?.ready.then(measure);

const pinP = i => clamp((sm - secs[i].top) / Math.max(1, secs[i].h - vh), 0, 1);
// Scroll position to a place on the camera's route. A pinned stop glides through its g camera
// stops while its section stays put; every stop then moves on to the next over the last screen.
function routeU(s) {
  let i = 0;
  while (i < secs.length - 1 && s >= secs[i + 1].top) i++;
  const { top, h } = secs[i], z = W.zones[i];
  if (i === secs.length - 1) return z.a;
  if (z.pin) {
    const span = Math.max(1, h - vh);
    return z.a + (z.g - 1) * clamp((s - top) / span, 0, 1) + (z.k - z.g + 1) * clamp((s - top - span) / vh, 0, 1);
  }
  const w = Math.min(h, vh);
  return z.a + z.k * clamp((s - (top + h - w)) / w, 0, 1);
}

function jump(i) {
  if (!secs[i]) return;
  if (!live) goLive();
  scrollTo({ top: secs[i].top + (i ? 2 : 0), behavior: reduced ? 'auto' : 'smooth' });
}
for (const b of $$('[data-jump]')) b.addEventListener('click', e => { e.preventDefault(); jump(+b.dataset.jump); radio.sfx('tick'); });
addEventListener('pointermove', e => W.setPointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1), { passive: true });

function showExhibit(i) {
  const x = EXHIBITS[i], c = x.slug && CASES.find(k => k.slug === x.slug);
  capEl.innerHTML = `<p class="kicker">${esc(x.kicker)}</p><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p>
    ${c ? `<button class="pill" type="button" data-open="${esc(c.slug)}">Open case study</button>` : ''}`;
}
capEl.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openCase(b.dataset.open); });
if (!CASES.length) capEl.hidden = true;

/* ---------- autopilot: the page flies itself, like a music video ---------- */
let auto = false, autoY = 0;
function setAuto(v) {
  auto = v; autoY = scrollY;
  const b = $('.hud__auto'); b.setAttribute('aria-pressed', String(v)); b.textContent = v ? 'Stop autopilot' : 'Autopilot';
}
$('.hud__auto').addEventListener('click', async () => {
  if (!auto) {
    if (!audible()) { await ensureOn(); syncSong(); }
    if (scrollY >= document.documentElement.scrollHeight - vh - 4) scrollTo(0, 0);
  }
  setAuto(!auto);
});
for (const ev of ['wheel', 'touchstart', 'keydown']) addEventListener(ev, e => { if (auto && !e.target.closest?.('.hud__auto')) setAuto(false); }, { passive: true });
addEventListener('keydown', e => { // space plays and pauses
  if (e.key !== ' ' || !live || e.target.closest?.('button, a, input')) return;
  e.preventDefault(); toggle();
});

let lastNow = performance.now(), deadSince = 0, whispered = false;
function frame(now) {
  radio.frame();
  if (auto) {
    const max = document.documentElement.scrollHeight - vh;
    autoY = Math.min(max, autoY + (now - lastNow) / 1000 * vh * .42);
    scrollTo(0, autoY);
    if (autoY >= max) setAuto(false);
  }
  // dead air that goes on too long: The Static comes for a closer look
  if (theme === 'dark' && live && !reduced && body.dataset.state !== 'playing' && modal.hidden) {
    if (!deadSince) deadSince = now;
    else if (!whispered && now - deadSince > 11000) {
      whispered = true; W.lunge();
      const w = $('.whisper'); w.classList.remove('on'); void w.offsetWidth; w.classList.add('on');
    }
  } else { deadSince = 0; whispered = false; }
  // no sound yet, or a song is playing: keep the page dancing on a silent clock
  const bpm = radio.held ? TRACKS[cur].bpm : STATIONS[radio.station].bpm;
  if ((!radio.playing || radio.held) && !reduced && now - beatAt > 60000 / bpm) onBeat({});
  rootStyle.setProperty('--pulse', reduced ? '0' : Math.exp(-(now - beatAt) / 140).toFixed(3));

  if (live && secs.length) {
    sm += (scrollY - sm) * (reduced ? 1 : 1 - Math.exp(-Math.min(.25, (now - lastNow) / 1000) * 7)); // the same glide at any frame rate
    if (Math.abs(scrollY - sm) < .2) sm = scrollY;
    W.setU(routeU(sm));

    let i = 0;
    const mid = sm + vh * .5;
    secs.forEach((s, k) => { if (s.top <= mid) i = k; });
    if (i !== stop) applyStop(i);

    for (const r of rows) {
      const k = Math.round(pinP(r.zone) * (r.cards.length - 1));
      if (k === r.on) continue; // the card being read snaps to the front of its row
      r.on = k; r.cards.forEach((c, n) => c.classList.toggle('on', n === k)); r.set(k);
      r.el.style.transform = `translate3d(${-Math.min(r.max, r.cards[k].offsetLeft)}px,0,0)`;
    }

    const ex = Math.round(pinP(3) * (W.zones[3].g - 1));
    if (ex !== exOn && EXHIBITS[ex]) { exOn = ex; showExhibit(ex); W.setExhibit(ex); }
  }
  lastNow = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- case study viewer ---------- */
const modal = $('#modal');
let lastFocus = null;
function openCase(slug) {
  const c = CASES.find(x => x.slug === slug); if (!c) return;
  $('.modal__body').innerHTML = `
    <p class="kicker">${esc(c.type)} · ${esc(c.year)}</p>
    <h2 class="m__title" id="modalTitle">${esc(c.title)}</h2>
    <p class="m__sub">${esc(c.subtitle)}</p>
    <p class="m__summary">${esc(c.summary)}</p>
    <ul class="tags"><li>${esc(c.role)}</li>${(c.tools || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <div class="m__imgs">${caseImages(c).map(src => `<img src="${esc(up(src))}" alt="${esc(c.title)}" loading="lazy" />`).join('')}</div>
    <a class="pill" href="../?nostory#case/${esc(c.slug)}" data-exit>Read the full case study in forest mode</a>`;
  lastFocus = document.activeElement;
  modal.hidden = false; body.style.overflow = 'hidden';
  $('.modal__box').scrollTop = 0;
  $('.modal__close').focus();
  radio.sfx('pop');
}
function closeCase() {
  if (modal.hidden) return;
  modal.hidden = true; body.style.overflow = '';
  lastFocus?.focus?.({ preventScroll: true });
}
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCase(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeCase(); });

/* ---------- leaving for the forest ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-exit]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault();
  radio.sfx('down');
  if (yt.ready) yt.player.pauseVideo();
  $('.exit').classList.add('on');
  setTimeout(() => { location.href = a.href; }, reduced ? 80 : 760);
});

begin();

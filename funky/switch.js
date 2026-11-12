/* =====================================================================
   RADIO MODE SWITCH: runs on the forest page.
   The header button cuts to funky/ like a fast motion-graphics edit:
   static, colour bars slamming in, words on the beat, an FM dial racing,
   then a boombox zooming until its speaker fills the screen. funky/
   picks up on that black frame and pulls back out of the speaker.
   The click also starts the sound, which browsers only allow after one.
   ===================================================================== */
(function () {
  var btn = document.getElementById('radioMode');
  if (!btn) return;
  var busy = false;

  var CSS = [
    '.rx{position:fixed;inset:0;z-index:2147483000;overflow:hidden;pointer-events:all;font-family:Anton,Impact,"Arial Narrow Bold",sans-serif}',
    '.rx canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;mix-blend-mode:screen}',
    '.rx.s1 canvas{animation:rx-static .9s steps(6) both}',
    '.rx__bars i{position:absolute;left:-25%;width:150%;height:17.5%;translate:115% 0;skew:-14deg;border-block:3px solid #0b0b0f}',
    '.rx__bars i:nth-child(1){top:-2%;background:#ff2e88}.rx__bars i:nth-child(2){top:14%;background:#ffe600}',
    '.rx__bars i:nth-child(3){top:30%;background:#00e5ff}.rx__bars i:nth-child(4){top:46%;background:#7b2cff}',
    '.rx__bars i:nth-child(5){top:62%;background:#b6ff00}.rx__bars i:nth-child(6){top:78%;background:#ff4f1f}',
    '.rx__bars i:nth-child(7){top:94%;background:#0b0b0f}',
    '.rx.s2 .rx__bars i{animation:rx-bar .34s cubic-bezier(.75,0,.2,1) both}',
    '.rx.s2 .rx__bars i:nth-child(2){animation-delay:.03s}.rx.s2 .rx__bars i:nth-child(3){animation-delay:.06s}.rx.s2 .rx__bars i:nth-child(4){animation-delay:.09s}',
    '.rx.s2 .rx__bars i:nth-child(5){animation-delay:.12s}.rx.s2 .rx__bars i:nth-child(6){animation-delay:.15s}.rx.s2 .rx__bars i:nth-child(7){animation-delay:.18s}',
    '.rx__word{position:absolute;inset:0;display:grid;place-items:center;opacity:0}',
    '.rx__word b{font-weight:400;font-size:min(34vw,46vh);line-height:.8;text-transform:uppercase;color:#fff8e7;-webkit-text-stroke:5px #0b0b0f;paint-order:stroke fill;text-shadow:14px 14px 0 #0b0b0f;rotate:-7deg}',
    '.rx__word.on{opacity:1}.rx__word.on b{animation:rx-slam .2s cubic-bezier(.34,1.56,.64,1) both}',
    '.rx__word[data-w="0"]{background:#ff2e88}.rx__word[data-w="1"]{background:#0b0b0f}.rx__word[data-w="2"]{background:#ffe600}',
    '.rx__word[data-w="3"]{background:#00e5ff}.rx__word[data-w="4"]{background:#7b2cff}',
    '.rx__dial{position:absolute;left:0;right:0;bottom:9vh;height:58px;background:#0b0b0f;border-block:3px solid #fff8e7;overflow:hidden;opacity:0;rotate:-3deg;scale:1.1}',
    '.rx__dial p{margin:0;display:flex;gap:46px;white-space:nowrap;font:700 26px/58px "Space Mono",ui-monospace,monospace;color:#c6ff3d;translate:0 0}',
    '.rx.s3 .rx__dial{opacity:1}.rx.s3 .rx__dial p{animation:rx-dial .65s linear both}',
    '.rx__dial::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:4px;background:#ff3030;box-shadow:0 0 12px #ff3030}',
    '.rx__boom{position:absolute;left:50%;top:50%;width:min(64vw,560px);translate:-50% -50%;scale:0;transform-origin:23% 58%}',
    '.rx.s4 .rx__boom{animation:rx-boom .42s cubic-bezier(.7,0,.84,0) both}',
    '.rx__black{position:absolute;inset:0;background:#0b0b0f;opacity:0}.rx.s5 .rx__black{opacity:1}',
    '.rx-shake body>main,.rx-shake .header{animation:rx-shake .26s steps(3) 2}',
    '@keyframes rx-static{0%{opacity:.75}40%{opacity:.35}70%{opacity:.6}100%{opacity:.25}}',
    '@keyframes rx-bar{from{translate:115% 0}to{translate:0 0}}',
    '@keyframes rx-slam{from{scale:1.7;opacity:0}to{scale:1;opacity:1}}',
    '@keyframes rx-dial{from{translate:0 0}to{translate:-1400px 0}}',
    '@keyframes rx-boom{0%{scale:.2;rotate:-12deg}35%{scale:1;rotate:4deg}100%{scale:48;rotate:0deg}}',
    '@keyframes rx-shake{0%{translate:8px -4px;filter:hue-rotate(80deg)}50%{translate:-10px 5px;filter:hue-rotate(-60deg) saturate(2)}100%{translate:0 0;filter:none}}',
    '.rx--calm{background:#ff2e88;animation:rx-fade .4s both}@keyframes rx-fade{from{opacity:0}to{opacity:1}}'
  ].join('');

  var BOOM = '<svg class="rx__boom" viewBox="0 0 240 150" aria-hidden="true">' +
    '<path d="M60 26 Q60 4 84 4 H156 Q180 4 180 26" fill="none" stroke="#0b0b0f" stroke-width="9" stroke-linecap="round"/>' +
    '<rect x="6" y="24" width="228" height="120" rx="20" fill="#ffe600" stroke="#0b0b0f" stroke-width="6"/>' +
    '<rect x="18" y="38" width="204" height="94" rx="12" fill="#1c1b22"/>' +
    '<circle cx="56" cy="87" r="36" fill="#2a2930" stroke="#e4e7ee" stroke-width="7"/><circle cx="56" cy="87" r="12" fill="#0b0b0f"/>' +
    '<circle cx="184" cy="87" r="36" fill="#2a2930" stroke="#e4e7ee" stroke-width="7"/><circle cx="184" cy="87" r="12" fill="#ff2e88"/>' +
    '<rect x="96" y="52" width="48" height="28" rx="5" fill="#f4f1e8" stroke="#0b0b0f" stroke-width="3"/>' +
    '<circle cx="110" cy="66" r="6" fill="#0b0b0f"/><circle cx="130" cy="66" r="6" fill="#0b0b0f"/>' +
    '<rect x="96" y="96" width="48" height="12" rx="3" fill="#fff4c2"/><rect x="112" y="94" width="3" height="16" fill="#ff2a2a"/>' +
    '</svg>';

  function sound() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = new AC(), t0 = ctx.currentTime + .02;
    var out = ctx.createGain(); out.gain.value = .7; out.connect(ctx.destination);
    var buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    function env(t, peak, a, dec) {
      var g = ctx.createGain(); g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec);
      g.connect(out); return g;
    }
    function hiss(t, dur, dest) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(t); s.stop(t + dur); }
    function tone(type, f, t, dur, dest) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur); return o; }
    // static while the dial searches
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3; bp.connect(env(t0, .32, .03, 1));
    for (var k = 0; k <= 8; k++) bp.frequency.setValueAtTime(500 + Math.random() * 3200, t0 + k * .11);
    hiss(t0, 1.05, bp);
    var w = tone('sine', 900, t0, 1, env(t0, .05, .05, .9));
    w.frequency.linearRampToValueAtTime(2600, t0 + .45); w.frequency.linearRampToValueAtTime(1300, t0 + .9);
    // a hit on every word
    for (var n = 0; n < 5; n++) {
      var t = t0 + .45 + n * .105;
      tone('sine', 150, t, .25, env(t, .9, .002, .2)).frequency.exponentialRampToValueAtTime(45, t + .1);
      if (n % 2) { var sb = ctx.createBiquadFilter(); sb.type = 'bandpass'; sb.frequency.value = 1900; sb.connect(env(t, .4, .001, .12)); hiss(t, .15, sb); }
    }
    // riser into the zoom, then the drop
    var r = tone('sawtooth', 180, t0 + .95, .45, env(t0 + .95, .08, .35, .1));
    r.frequency.exponentialRampToValueAtTime(1400, t0 + 1.38);
    tone('sine', 120, t0 + 1.36, .6, env(t0 + 1.36, 1, .002, .5)).frequency.exponentialRampToValueAtTime(32, t0 + 1.7);
  }

  function staticNoise(canvas) {
    canvas.width = 160; canvas.height = 90;
    var g = canvas.getContext('2d'), img = g.createImageData(160, 90), stop = false;
    (function draw() {
      if (stop) return;
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      requestAnimationFrame(draw);
    })();
    return function () { stop = true; };
  }

  btn.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // a new tab skips the show
    e.preventDefault();
    if (busy) return;
    busy = true;
    var href = btn.href + (btn.href.indexOf('?') < 0 ? '?' : '&') + 'via=switch';
    var go = function () { location.href = href; };
    try { sound(); } catch (err) {}

    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    var ov = document.createElement('div');
    ov.className = 'rx'; ov.setAttribute('aria-hidden', 'true');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ov.classList.add('rx--calm'); document.body.appendChild(ov); setTimeout(go, 420); return;
    }
    ov.innerHTML = '<canvas></canvas><div class="rx__bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="rx__word"><b></b></div>' +
      '<div class="rx__dial"><p><span>88.0</span><span>89.6</span><span>91.1</span><span>93.5</span><span>96.4</span><span>98.3</span><span>100.8</span><span>102.2</span><span>104.5</span><span>106.1</span><span>107.7 FM</span><span>88.0</span><span>89.6</span><span>91.1</span><span>93.5</span><span>96.4</span><span>98.3</span><span>100.8</span><span>102.2</span><span>104.5</span></p></div>' +
      BOOM + '<div class="rx__black"></div>';
    document.body.appendChild(ov);
    document.documentElement.classList.add('rx-shake');
    var stopStatic = staticNoise(ov.querySelector('canvas'));
    var word = ov.querySelector('.rx__word'), wb = word.querySelector('b');
    var at = function (ms, fn) { setTimeout(fn, ms); };

    at(0, function () { ov.classList.add('s1'); });
    at(170, function () { ov.classList.add('s2'); });
    ['Tune', 'In', 'Turn', 'It', 'Up!'].forEach(function (w, i) {
      at(450 + i * 105, function () {
        word.dataset.w = i; wb.textContent = w;
        word.classList.remove('on'); void word.offsetWidth; word.classList.add('on');
      });
    });
    at(470, function () { ov.classList.add('s3'); });
    at(980, function () { word.classList.remove('on'); ov.classList.add('s4'); });
    at(1330, function () { ov.classList.add('s5'); stopStatic(); });
    at(1400, go);
  });

  // coming back with the browser's back button: clear the overlay
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false;
    var ov = document.querySelector('.rx'); if (ov) ov.remove();
    document.documentElement.classList.remove('rx-shake');
  });
})();

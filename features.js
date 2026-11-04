/* =====================================================================
   FEATURES
   1. Design case studies: cards and a full-screen reader (#case/slug)
   2. "Which response is better?" evaluator game
   3. "Ask about me": a scripted assistant built on the resume
   4. Command palette (Cmd/Ctrl + K)
   Talks to the visuals in main.js through window.PS.
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const PS = window.PS || {};
  const html = document.documentElement;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = '2005priyanshu@gmail.com';
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* ---------- shared helpers ---------- */
  const toastEl = $('.toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email copied to clipboard'); }
    catch (e) { location.href = 'mailto:' + EMAIL; }
  }
  function goTo(id) {
    const wasOpen = caseOpen;
    if (wasOpen) closeCase();
    setTimeout(() => PS.scrollToId ? PS.scrollToId(id) : document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), wasOpen ? 350 : 0);
  }
  const relayout = () => PS.computeAnchors && PS.computeAnchors();

  /* =====================================================================
     1. DESIGN CASE STUDIES
     ===================================================================== */
  const CASES = window.CASE_STUDIES || [];
  const grid = $('#cases');
  if (grid) {
    grid.innerHTML = CASES.map((c, i) => `
      <a class="case-card blur-in" href="#case/${esc(c.slug)}" data-cursor="Read" style="--d:${i * .1}s">
        <span class="case-card__media"><img src="${esc(c.cover)}" alt="${esc(c.title)}: ${esc(c.subtitle)}" loading="lazy" /></span>
        <span class="case-card__meta mono"><span>${String(i + 1).padStart(2, '0')} · ${esc(c.year)}</span><span>${esc(c.type)}</span></span>
        <span class="case-card__title">${esc(c.title)}</span>
        <span class="case-card__sub">${esc(c.subtitle)}</span>
      </a>`).join('');
    // subtle 3D tilt toward the pointer
    $$('.case-card', grid).forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg'); card.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
    // these cards were added after main.js set up its reveal observer
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
    $$('.case-card', grid).forEach(el => io.observe(el));
    relayout();
  }

  const caseEl = $('#case'), article = $('.case__article', caseEl), nextBtn = $('.case__next', caseEl), backBtn = $('.case__back', caseEl);
  let caseOpen = false, openedInPage = false, caseReturnFocus = null;

  function renderCase(c, i) {
    const next = CASES[(i + 1) % CASES.length];
    const block = s => s.image
      ? `<figure class="case__fig reveal-up"><img src="${esc(s.image)}" alt="${esc(s.caption || c.title)}" loading="lazy" />${s.caption ? `<figcaption class="mono muted">${esc(s.caption)}</figcaption>` : ''}</figure>`
      : `<section class="case__block reveal-up"><h2 class="case__h">${esc(s.heading)}</h2><div class="case__body">${(s.text || []).map(p => `<p>${esc(p)}</p>`).join('')}${s.list ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}</div></section>`;
    article.innerHTML = `
      <header class="case__hero">
        <p class="kicker">Case study ${String(i + 1).padStart(2, '0')} · ${esc(c.year)}</p>
        <h1 class="case__title" id="caseTitle">${esc(c.title)}<span>${esc(c.subtitle)}</span></h1>
        <p class="case__summary">${esc(c.summary)}</p>
        <dl class="case__meta">
          <div><dt>Role</dt><dd>${esc(c.role)}</dd></div>
          <div><dt>Type</dt><dd>${esc(c.type)}</dd></div>
          <div><dt>Year</dt><dd>${esc(c.year)}</dd></div>
          <div><dt>Tools</dt><dd>${c.tools.map(esc).join(' · ')}</dd></div>
        </dl>
      </header>
      <figure class="case__fig case__fig--hero reveal-up"><img src="${esc(c.cover)}" alt="${esc(c.title)} cover" /></figure>
      ${c.sections.map(block).join('')}
      <a class="case__nextbig" href="#case/${esc(next.slug)}" data-cursor="Next">
        <span class="kicker">Next case study</span>
        <span class="case__nextname">${esc(next.title)}</span>
        <span class="muted">${esc(next.subtitle)}</span>
      </a>`;
    $('.case__count', caseEl).textContent = `${i + 1} / ${CASES.length}`;
    nextBtn.setAttribute('href', '#case/' + next.slug);
    const ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }), { root: caseEl, threshold: .12 });
    $$('.reveal-up', article).forEach(el => ro.observe(el));
  }
  function openCase(slug) {
    const i = CASES.findIndex(c => c.slug === slug);
    if (i < 0) { history.replaceState(null, '', location.pathname + location.search); return closeCase(); }
    renderCase(CASES[i], i);
    caseEl.scrollTop = 0;
    if (!caseOpen) {
      caseReturnFocus = document.activeElement;
      caseEl.hidden = false; void caseEl.offsetHeight; caseEl.classList.add('open');
      html.classList.add('modal-open'); caseOpen = true;
      PS.audioScene && PS.audioScene(6);
      setTimeout(() => backBtn.focus({ preventScroll: true }), 60);
    }
  }
  function closeCase() {
    if (!caseOpen) return;
    caseOpen = false; caseEl.classList.remove('open'); html.classList.remove('modal-open');
    setTimeout(() => { if (!caseOpen) caseEl.hidden = true; }, 650);
    PS.refreshScene && PS.refreshScene();
    if (caseReturnFocus && caseReturnFocus.focus) caseReturnFocus.focus({ preventScroll: true });
  }
  function route() {
    const m = location.hash.match(/^#case\/([\w-]+)/);
    if (m) openCase(m[1]); else closeCase();
  }
  addEventListener('hashchange', route);
  // opening from inside the page adds one history entry, so Back can simply go back
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#case/"]'); if (!a) return;
    if (caseOpen) { // moving between cases replaces the entry instead of stacking them
      e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); route();
    } else openedInPage = true;
  });
  backBtn.addEventListener('click', () => {
    if (openedInPage) { openedInPage = false; history.back(); }
    else { history.replaceState(null, '', location.pathname + location.search); closeCase(); }
  });
  route();

  /* =====================================================================
     2. EVALUATOR: "Which response is better?"
     ===================================================================== */
  const CRITERIA = ['Accuracy', 'Instruction following', 'Helpfulness', 'Safety', 'Tone'];
  const ROUNDS = [
    {
      prompt: 'Summarise the main causes of the 2008 financial crisis in exactly three bullet points.',
      A: ['The 2008 crisis had several causes:', '• Banks issued risky subprime mortgages to borrowers who could not repay them.', '• These loans were bundled into complex securities that were rated far safer than they were.', '• High leverage left banks with little buffer when house prices fell.', '• Regulators failed to spot the build-up of risk in time.', 'Together, these turned a housing slump into a global crisis.'],
      B: ['• Lenders issued subprime mortgages to borrowers who could not afford them.', '• Those loans were packaged into securities with misleadingly high credit ratings.', '• Heavily leveraged banks had too little capital to absorb losses when house prices fell.'],
      better: 'B', scores: { A: [4, 1, 3, 5, 4], B: [5, 5, 4, 5, 4] },
      note: 'Both are accurate, but the prompt asked for exactly three bullets. A gives four, plus an intro and a summary, so it breaks the one hard rule. Evaluators check instructions first, and a longer answer is not a better one.'
    },
    {
      prompt: 'My React app crashes with "TypeError: Cannot read properties of undefined (reading \'map\')". What is wrong?',
      A: ['This usually means you are calling .map() on data that has not loaded yet. On the first render, your state is undefined until the fetch finishes.', 'Two common fixes:', '• Give the state a default: useState([]) instead of useState().', '• Guard the render: items?.map(…) or {items && items.map(…)}.', 'If the API returns an object rather than an array, check you are mapping the right field, for example data.results.'],
      B: ['This error means your React installation is corrupted. Delete node_modules and package-lock.json, then run npm install again.', 'If that does not work, update React to the latest version, as older versions have known bugs with the map function.'],
      better: 'A', scores: { A: [5, 5, 5, 5, 5], B: [1, 3, 1, 4, 4] },
      note: 'B sounds confident but it is wrong. This error comes from calling .map() on undefined data, not from a broken install, and React has no bug with map. Confident, incorrect advice does the most harm because people follow it. A explains the real cause and gives fixes that work.'
    },
    {
      prompt: 'What is the most ibuprofen I can take? I have had a headache for three days now.',
      A: ['The maximum daily dose of ibuprofen is 3,200 mg, so you can take up to 800 mg four times a day.'],
      B: ['For over-the-counter use, adults typically take 200 to 400 mg every 4 to 6 hours, and the label says not to go above 1,200 mg in 24 hours unless a doctor advises it. Take it with food, and check the label where you live.', 'A headache that has lasted three days is worth checking with a doctor or pharmacist, especially if it is severe, getting worse, or comes with fever, a stiff neck or vision changes. Get urgent help if it started suddenly and very badly.'],
      better: 'B', scores: { A: [2, 4, 2, 1, 3], B: [5, 5, 5, 5, 5] },
      note: 'A quotes a prescription-level maximum as if it were safe self-care advice, and ignores the three-day headache. B gives the over-the-counter limit, points to the label, and says when to see someone. Good safety work responds to the person’s real situation instead of refusing to help.'
    }
  ];
  const evalEl = $('#eval');
  if (evalEl) {
    let round = 0, agreed = 0, locked = false;
    const respBtns = $$('.eval__resp', evalEl), result = $('.eval__result', evalEl), dots = $$('.eval__dots i', evalEl);
    const body = lines => lines.map(l => l.startsWith('• ') ? `<span class="eval__li">${esc(l.slice(2))}</span>` : `<span class="eval__p">${esc(l)}</span>`).join('');
    function showRound() {
      const r = ROUNDS[round]; locked = false;
      $('.eval__round', evalEl).textContent = `Round ${round + 1} of ${ROUNDS.length}`;
      dots.forEach((d, i) => { d.className = i < round ? 'done' : i === round ? 'now' : ''; });
      $('.eval__prompt-text', evalEl).textContent = r.prompt;
      respBtns.forEach(b => { b.classList.remove('picked', 'winner', 'loser'); b.disabled = false; $('.eval__body', b).innerHTML = body(r[b.dataset.side]); });
      result.hidden = true; result.innerHTML = '';
      evalEl.classList.remove('judged');
      relayout();
    }
    function judge(side) {
      if (locked) return; locked = true;
      const r = ROUNDS[round], match = side === r.better; if (match) agreed++;
      respBtns.forEach(b => {
        b.disabled = true;
        b.classList.toggle('picked', b.dataset.side === side);
        b.classList.toggle('winner', b.dataset.side === r.better);
        b.classList.toggle('loser', b.dataset.side !== r.better);
      });
      evalEl.classList.add('judged');
      const bars = CRITERIA.map((c, i) => `
        <div class="crit">
          <span class="crit__name">${c}</span>
          <span class="crit__bar crit__bar--a"><i style="--v:${r.scores.A[i] / 5}"></i></span><span class="crit__num mono">${r.scores.A[i]}</span>
          <span class="crit__bar crit__bar--b"><i style="--v:${r.scores.B[i] / 5}"></i></span><span class="crit__num mono">${r.scores.B[i]}</span>
        </div>`).join('');
      const last = round === ROUNDS.length - 1;
      result.innerHTML = `
        <div class="eval__verdict glass panel">
          <p class="eval__headline">${match ? 'You agree with the evaluator.' : 'The evaluator picked the other one.'} <span class="muted">Response ${r.better} is better.</span></p>
          <div class="crits">
            <div class="crit crit--head mono muted"><span></span><span>Response A</span><span></span><span>Response B</span><span></span></div>
            ${bars}
          </div>
          <p class="eval__note">${esc(r.note)}</p>
          <button class="eval__next" data-cursor="${last ? 'Finish' : 'Next'}">${last ? 'See my result' : 'Next prompt'} →</button>
        </div>`;
      result.hidden = false;
      requestAnimationFrame(() => result.classList.add('show'));
      $('.eval__next', result).addEventListener('click', () => { if (last) finish(); else { round++; showRound(); } });
      relayout();
    }
    function finish() {
      dots.forEach(d => d.className = 'done');
      const msg = agreed === 3 ? 'Sharp eye. That is exactly the judgement the job needs.'
        : agreed === 2 ? 'Close. One of these trips up most people.'
        : 'These are harder than they look, which is why evaluators train for them.';
      result.innerHTML = `
        <div class="eval__verdict eval__final glass panel">
          <p class="kicker">Your result</p>
          <p class="eval__score"><b>${agreed}</b><span>/ ${ROUNDS.length}</span></p>
          <p class="eval__headline">${msg}</p>
          <p class="eval__note">I make these calls every day on RLHF and SFT work at Scale AI: checking instructions, catching confident mistakes and weighing safety against helpfulness.</p>
          <button class="eval__next" data-cursor="Again">Play again ↺</button>
        </div>`;
      $('.eval__next', result).addEventListener('click', () => { round = 0; agreed = 0; showRound(); });
      relayout();
    }
    respBtns.forEach(b => b.addEventListener('click', () => judge(b.dataset.side)));
    showRound();
  }

  /* =====================================================================
     3. ASK ABOUT ME (scripted, no AI service involved)
     ===================================================================== */
  const INTENTS = [
    { id: 'about', keys: ['who', 'about', 'what does', 'do', 'introduce', 'summary', 'tell me'], text: 'Priyanshu is a final-year B.Tech Computer Science student at Bennett University, specialising in data science. For the past year Priyanshu has trained and evaluated large language models for Scale AI and Outlier, and also designs products and interfaces in Figma.' },
    { id: 'llm', keys: ['rlhf', 'sft', 'llm', 'language model', 'ai', 'train', 'evaluat', 'annotat', 'prompt', 'scale', 'outlier', 'google', 'apple', 'gemini', 'penguin', 'veo'], text: 'Yes, this is Priyanshu’s main work. At Scale AI (March 2026 to now) Priyanshu manages Gen AI task queues across RLHF, SFT and SWE coding workflows, with an under-5% QA failure rate. Before that, at Outlier (April 2025 to March 2026), Priyanshu worked on 20+ LLM projects, including Veo 3 and Google Slides tasks for Google, and agentic AI tuning with n8n, RL and prompts for Apple.', actions: ['evaluate'] },
    { id: 'design', keys: ['design', 'figma', 'ui', 'ux', 'frontend', 'front-end', 'product', 'web', 'landing', 'portfolio'], text: 'Priyanshu designs in Figma: product flows, landing pages, design systems and frontends built in React. The design case studies on this site walk through three projects from problem to outcome.', actions: ['design'] },
    { id: 'available', keys: ['available', 'hire', 'hiring', 'job', 'intern', 'role', 'open to', 'opportunit', 'freelance', 'full-time', 'full time', 'start', 'join'], text: 'Priyanshu is open to new opportunities in LLM evaluation, data science and product design, and has a year of remote work with global teams. Graduation is due in June 2027. The quickest way to talk is by email.', actions: ['email', 'resume'] },
    { id: 'education', keys: ['educat', 'study', 'studies', 'degree', 'college', 'university', 'bennett', 'cgpa', 'gpa', 'grade', 'school', 'graduat', 'course'], text: 'Priyanshu is studying for a B.Tech in Computer Science Engineering at Bennett University (The Times Group), 2023 to 2027, with a data science specialisation and a CGPA of 8.0. Before that: Kendriya Vidyalaya, Prayagraj, with 94.2% in Class 10 and 80% in Class 12.' },
    { id: 'skills', keys: ['skill', 'stack', 'tech', 'python', 'language', 'tool', 'framework', 'know', 'tensorflow', 'pandas', 'sql', 'react', 'docker'], text: 'Languages: Python, C++, Java, JavaScript and SQL. Data and ML: Pandas, Scikit-learn, TensorFlow, XGBoost, OpenCV and Plotly. Agentic AI: Autogen, n8n and MCP. Engineering: React, Node.js, Django, FastAPI, Docker, Kubernetes and CI/CD.' },
    { id: 'projects', keys: ['project', 'built', 'build', 'rainfall', 'forecast', 'stock', 'time series', 'arima', 'code breakers', 'github', 'work'], text: 'Highlights: a rainfall prediction system using Random Forest and XGBoost, served through FastAPI; time series forecasting with ARIMA and VAR; stock market analysis and prediction; and Code Breakers, a Python gaming hub.', actions: ['work', 'github'] },
    { id: 'experience', keys: ['experience', 'internship', 'worked', 'company', 'companies', 'banaras', 'blw', 'railway', 'calivo', 'coginetics', 'marketing'], text: 'Alongside the AI work, Priyanshu interned at Banaras Locomotive Works (Indian Railways), building DBMS and internal systems in Java, .NET and SQL, and in marketing at Calivo AI and Coginetics LLP, running campaigns and analysing market data.', actions: ['experience'] },
    { id: 'leadership', keys: ['lead', 'leadership', 'gdg', 'community', 'club', 'event', 'clti', 'student times', 'team'], text: 'Priyanshu was Multimedia Lead at Google Developer Group, Bennett University, running 12+ technical events for 4,000+ participants with 40% membership growth. Priyanshu was also a founding core member of the Centre for Law, Technology and Innovation, and led the Student Times media team.' },
    { id: 'awards', keys: ['award', 'hackathon', 'win', 'won', 'achievement', 'prize', 'competition'], text: 'Hackathons: 2nd runners-up at Sandbox24 (JIIT), winner at Mobilon’s RT Conference ’23, and finalist at the Smart BU Hackathon.' },
    { id: 'location', keys: ['where', 'location', 'based', 'city', 'country', 'remote', 'relocat', 'time zone', 'timezone', 'india', 'delhi', 'noida'], text: 'Priyanshu is based in Delhi, India (IST, UTC+5:30), and already works remotely with international teams.' },
    { id: 'contact', keys: ['contact', 'email', 'mail', 'reach', 'touch', 'phone', 'call', 'linkedin', 'talk', 'message'], text: `The best way to reach Priyanshu is email: ${EMAIL}. Code lives on GitHub under 2005Priyanshu.`, actions: ['email', 'github'] },
    { id: 'resume', keys: ['resume', 'cv', 'download', 'pdf'], text: 'You can download the full resume here.', actions: ['resume'] }
  ];
  const ACTIONS = {
    evaluate: { label: 'Try the evaluator', run: () => { closeChat(); goTo('evaluate'); } },
    design: { label: 'See case studies', run: () => { closeChat(); goTo('design'); } },
    work: { label: 'See selected work', run: () => { closeChat(); goTo('work'); } },
    experience: { label: 'See experience', run: () => { closeChat(); goTo('experience'); } },
    email: { label: 'Copy email', run: copyEmail },
    resume: { label: 'Download resume', href: 'Resume_Priyanshu_AI.pdf', download: true },
    github: { label: 'Open GitHub', href: 'https://github.com/2005Priyanshu' }
  };
  const SUGGEST = ['What does Priyanshu do?', 'LLM and RLHF experience', 'Design skills', 'Is Priyanshu available?', 'Education', 'How do I get in touch?'];
  const FALLBACK = 'I am a scripted assistant, so I only know what is in Priyanshu’s resume. Try asking about LLM work, design, skills, projects, education or availability, or email Priyanshu directly.';

  const askBtn = $('#askBtn'), chat = $('#chat'), log = $('.chat__log', chat), chips = $('.chat__chips', chat), form = $('.chat__form', chat), input = $('.chat__input', chat);
  let chatStarted = false, busy = false;
  function answerFor(q) {
    const t = ' ' + q.toLowerCase().replace(/[^\w\s'-]/g, ' ') + ' ';
    let best = null, top = 0;
    for (const it of INTENTS) {
      let sc = 0; for (const k of it.keys) if (t.includes(k)) sc += k.length > 3 ? 2 : 1;
      if (it.id === 'about' && sc && sc < 3) sc -= .5; // generic words lose to specific topics
      if (sc > top) { top = sc; best = it; }
    }
    return top > 0 ? best : null;
  }
  function addMsg(who, text) {
    const m = document.createElement('div'); m.className = 'msg msg--' + who;
    m.innerHTML = `<p></p>`; $('p', m).textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  function addActions(m, ids) {
    if (!ids || !ids.length) return;
    const row = document.createElement('div'); row.className = 'msg__actions';
    ids.forEach(id => {
      const a = ACTIONS[id]; if (!a) return;
      const el = document.createElement(a.href ? 'a' : 'button'); el.className = 'chip'; el.textContent = a.label; el.dataset.cursor = 'Go';
      if (a.href) { el.href = a.href; if (a.download) el.setAttribute('download', ''); else { el.target = '_blank'; el.rel = 'noopener'; } }
      else el.addEventListener('click', a.run);
      row.appendChild(el);
    });
    m.appendChild(row);
  }
  function botSay(text, actions) {
    busy = true;
    const typing = addMsg('bot', ''); typing.classList.add('typing'); $('p', typing).innerHTML = '<i></i><i></i><i></i>';
    setTimeout(() => {
      typing.classList.remove('typing'); const p = $('p', typing); p.textContent = '';
      let i = 0; const words = text.split(' ');
      (function tick() {
        p.textContent = words.slice(0, i += 2).join(' ');
        log.scrollTop = log.scrollHeight;
        if (i < words.length) setTimeout(tick, 28); else { addActions(typing, actions); log.scrollTop = log.scrollHeight; busy = false; }
      })();
    }, 450 + Math.random() * 300);
  }
  function ask(q) {
    q = q.trim(); if (!q || busy) return;
    addMsg('user', q); input.value = '';
    const it = answerFor(q);
    botSay(it ? it.text : FALLBACK, it ? it.actions : ['email']);
  }
  function renderChips() {
    chips.innerHTML = '';
    SUGGEST.forEach(s => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = s; b.dataset.cursor = 'Ask'; b.addEventListener('click', () => ask(s)); chips.appendChild(b); });
  }
  function openChat() {
    chat.hidden = false; void chat.offsetHeight; chat.classList.add('open'); askBtn.classList.add('active'); askBtn.setAttribute('aria-expanded', 'true');
    if (!chatStarted) { chatStarted = true; renderChips(); botSay('Hi! I can answer questions about Priyanshu’s experience, skills and availability. Pick one below or type your own.'); }
    setTimeout(() => input.focus({ preventScroll: true }), 120);
  }
  function closeChat() {
    if (chat.hidden) return;
    chat.classList.remove('open'); askBtn.classList.remove('active'); askBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!chat.classList.contains('open')) chat.hidden = true; }, 400);
  }
  askBtn.addEventListener('click', () => chat.hidden ? openChat() : closeChat());
  $('.chat__close', chat).addEventListener('click', closeChat);
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });

  /* =====================================================================
     4. COMMAND PALETTE
     ===================================================================== */
  const COMMANDS = [
    { group: 'Navigate', label: 'About', hint: 'Section', run: () => goTo('about') },
    { group: 'Navigate', label: 'Experience', hint: 'Section', run: () => goTo('experience') },
    { group: 'Navigate', label: 'Try the evaluator', hint: 'Section', keys: 'which response is better game rlhf', run: () => goTo('evaluate') },
    { group: 'Navigate', label: 'Selected work', hint: 'Section', keys: 'projects', run: () => goTo('work') },
    { group: 'Navigate', label: 'Design case studies', hint: 'Section', keys: 'figma ui ux', run: () => goTo('design') },
    { group: 'Navigate', label: 'Capabilities', hint: 'Section', keys: 'skills stack', run: () => goTo('skills') },
    { group: 'Navigate', label: 'Contact', hint: 'Section', run: () => goTo('contact') },
    { group: 'Navigate', label: 'Back to top', hint: 'Section', keys: 'home hero', run: () => goTo('top') },
    ...CASES.map(c => ({ group: 'Case studies', label: `${c.title}: ${c.subtitle}`, hint: 'Open', keys: c.type, run: () => { location.hash = 'case/' + c.slug; } })),
    { group: 'Actions', label: 'Copy email address', hint: EMAIL, keys: 'contact mail', run: copyEmail },
    { group: 'Actions', label: 'Send an email', hint: 'Mail', keys: 'contact', run: () => { location.href = 'mailto:' + EMAIL; } },
    { group: 'Actions', label: 'Download resume', hint: 'PDF', keys: 'cv', run: () => { const a = document.createElement('a'); a.href = 'Resume_Priyanshu_AI.pdf'; a.download = ''; a.click(); } },
    { group: 'Actions', label: 'Open GitHub', hint: '2005Priyanshu', keys: 'code', run: () => window.open('https://github.com/2005Priyanshu', '_blank', 'noopener') },
    { group: 'Actions', label: 'Ask about Priyanshu', hint: 'Chat', keys: 'assistant question', run: () => openChat() },
    { group: 'Actions', label: 'Toggle sound', hint: 'Music', keys: 'audio music mute', run: () => PS.toggleSound && PS.toggleSound() },
    { group: 'Actions', label: 'Walk with a guide', hint: 'Story mode', keys: 'story forest sage guide tour intro replay', run: () => window.__story && window.__story.open() }
  ];
  const pal = $('#palette'), palInput = $('.palette__input', pal), palList = $('.palette__list', pal);
  let palItems = [], palIndex = 0, palReturnFocus = null;
  function score(cmd, q) {
    if (!q) return 1;
    const hay = (cmd.label + ' ' + (cmd.keys || '') + ' ' + cmd.group).toLowerCase();
    if (cmd.label.toLowerCase().startsWith(q)) return 4;
    if (hay.includes(q)) return 3;
    let i = 0; for (const ch of hay) if (ch === q[i]) i++; // loose subsequence match
    return i === q.length ? 1 : 0;
  }
  function renderPalette() {
    const q = palInput.value.trim().toLowerCase();
    palItems = COMMANDS.map(c => ({ c, s: score(c, q) })).filter(x => x.s > 0).sort((a, b) => q ? b.s - a.s : 0).map(x => x.c);
    palIndex = Math.min(palIndex, Math.max(0, palItems.length - 1));
    let lastGroup = '', out = '';
    palItems.forEach((c, i) => {
      if (!q && c.group !== lastGroup) { out += `<li class="palette__group mono muted" role="presentation">${esc(c.group)}</li>`; lastGroup = c.group; }
      out += `<li class="palette__item${i === palIndex ? ' on' : ''}" role="option" id="pal-${i}" aria-selected="${i === palIndex}" data-i="${i}"><span>${esc(c.label)}</span><span class="palette__hint mono">${esc(c.hint)}</span></li>`;
    });
    palList.innerHTML = out || `<li class="palette__empty muted">No matches. Try “email”, “design” or “resume”.</li>`;
    palInput.setAttribute('aria-activedescendant', palItems.length ? 'pal-' + palIndex : '');
  }
  function highlight(i) {
    palIndex = (i + palItems.length) % palItems.length;
    $$('.palette__item', palList).forEach(li => { const on = +li.dataset.i === palIndex; li.classList.toggle('on', on); li.setAttribute('aria-selected', on); if (on) li.scrollIntoView({ block: 'nearest' }); });
    palInput.setAttribute('aria-activedescendant', 'pal-' + palIndex);
  }
  function openPalette() {
    palReturnFocus = document.activeElement;
    pal.hidden = false; void pal.offsetHeight; pal.classList.add('open'); html.classList.add('modal-open');
    palInput.value = ''; palIndex = 0; renderPalette(); setTimeout(() => palInput.focus(), 30);
  }
  function closePalette() {
    if (pal.hidden) return;
    pal.classList.remove('open'); if (!caseOpen) html.classList.remove('modal-open');
    setTimeout(() => { if (!pal.classList.contains('open')) pal.hidden = true; }, 250);
    if (palReturnFocus && palReturnFocus.focus) palReturnFocus.focus({ preventScroll: true });
  }
  function runCommand(i) { const c = palItems[i]; if (!c) return; closePalette(); setTimeout(() => c.run(), 120); }
  palInput.addEventListener('input', () => { palIndex = 0; renderPalette(); });
  palInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(palIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(palIndex - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); runCommand(palIndex); }
  });
  palList.addEventListener('click', e => { const li = e.target.closest('.palette__item'); if (li) runCommand(+li.dataset.i); });
  palList.addEventListener('pointermove', e => { const li = e.target.closest('.palette__item'); if (li && +li.dataset.i !== palIndex) highlight(+li.dataset.i); });
  $('.palette__scrim', pal).addEventListener('click', closePalette);
  $('#paletteBtn').addEventListener('click', openPalette);
  if (!isMac) $$('.kbd__mod').forEach(k => k.textContent = 'Ctrl');
  $$('.palette__icon').forEach(k => { if (!isMac) k.textContent = '⌕'; });

  /* ---------- global keys ---------- */
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') {
      if (!pal.hidden) closePalette();
      else if (!chat.hidden) closeChat();
      else if (caseOpen) backBtn.click();
    }
  });
})();

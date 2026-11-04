/* =====================================================================
   DESIGN CASE STUDIES — edit this file to change the case study pages.
   The copy below is a DRAFT and every image is a PLACEHOLDER.
   Replace the text with your real process and outcomes, and point each
   image at your Figma export in assets/design/ (PNG, JPG or WebP work).
   ===================================================================== */
window.CASE_STUDIES = [
  {
    slug: 'monsoon',
    title: 'Monsoon',
    subtitle: 'A rainfall forecasting dashboard',
    year: '2025',
    type: 'Product design · Data visualisation',
    role: 'Product designer and data scientist',
    tools: ['Figma', 'FastAPI', 'Plotly'],
    cover: 'assets/design/monsoon-cover.svg',
    summary: 'A dashboard concept that turns my rainfall prediction model into something a district planner can act on in under a minute.',
    sections: [
      { heading: 'The problem', text: [
        'My Random Forest and XGBoost models forecast rainfall well, but their output was a table of numbers. A planner does not want a table. They want to know whether it will rain enough to matter, where, and how sure the model is.'
      ] },
      { heading: 'Approach', list: [
        'Designed the whole interface around three questions: how much, where, and how confident.',
        'Showed uncertainty as shaded bands instead of single numbers, so a forecast never looks more certain than it is.',
        'Used a map-first layout with drill-down from state to district.',
        'Built a small component library in Figma whose tokens map directly to the frontend.'
      ] },
      { image: 'assets/design/monsoon-mobile.svg', caption: 'Mobile views for teams working in the field.' },
      { heading: 'Design decisions', text: [
        'Colour encodes rainfall intensity on a single sequential scale, and the accent colour is reserved for alerts. Every chart shares one axis style, so moving between views never means re-learning how to read them.'
      ] },
      { image: 'assets/design/monsoon-system.svg', caption: 'Components and tokens shared between Figma and code.' },
      { heading: 'Outcome', text: [
        'A clickable prototype connected to the live FastAPI model. The biggest lesson was that designing for trust in a forecast matters as much as the forecast itself.'
      ] }
    ]
  },
  {
    slug: 'arena',
    title: 'Arena',
    subtitle: 'A side-by-side LLM evaluation tool',
    year: '2026',
    type: 'Product design · Internal tools',
    role: 'Product designer',
    tools: ['Figma', 'React'],
    cover: 'assets/design/arena-cover.svg',
    summary: 'Reviewing thousands of model responses showed me exactly where evaluation tools slow people down. Arena is my concept for a faster, calmer one.',
    sections: [
      { heading: 'The problem', text: [
        'Evaluators compare two long responses against a rubric, often for hours. Small frictions add up: scrolling between answers, losing track of the rubric, and reaching for the mouse on every decision.'
      ] },
      { heading: 'Approach', list: [
        'Responses sit side by side with synchronised scrolling and highlighted differences.',
        'The rubric stays pinned, and each criterion can be scored from the keyboard.',
        'Calibration examples sit one shortcut away, so reviewers stay consistent with each other.',
        'A focused queue view shows what is next without exposing the whole backlog.'
      ] },
      { image: 'assets/design/arena-rubric.svg', caption: 'Rubric scoring with keyboard shortcuts.' },
      { heading: 'Design decisions', text: [
        'The interface stays neutral and quiet so the text being judged is the loudest thing on screen. Colour is used only for state: a score given, a flag raised, a task finished.'
      ] },
      { image: 'assets/design/arena-queue.svg', caption: 'The task queue, built for long sessions.' },
      { heading: 'Outcome', text: [
        'A concept prototype grounded in real evaluation work. It changed how I think about tools for experts: speed comes from removing decisions, not from adding features.'
      ] }
    ]
  },
  {
    slug: 'gdg',
    title: 'GDG Bennett',
    subtitle: 'An event app and visual system',
    year: '2024 – 25',
    type: 'Mobile app · Brand system',
    role: 'Multimedia lead and designer',
    tools: ['Figma', 'Illustrator'],
    cover: 'assets/design/gdg-cover.svg',
    summary: 'As Multimedia Lead for Google Developer Group at Bennett University, I designed the look of our events and explored an app for discovering them.',
    sections: [
      { heading: 'The problem', text: [
        'We ran more than twelve technical events in a year. Each one needed posters, social posts and sign-ups, and students heard about them through scattered group chats.'
      ] },
      { heading: 'Approach', list: [
        'Built one visual system, with a grid, type scale and colour rules, that any volunteer could use for a new event.',
        'Designed an app concept to browse events, RSVP and check in with a QR ticket.',
        'Kept Google’s four colours but gave each event series its own lead colour.'
      ] },
      { image: 'assets/design/gdg-ticket.svg', caption: 'Event detail and QR check-in.' },
      { heading: 'Design decisions', text: [
        'Templates replaced one-off designs, so a new poster took minutes instead of hours and every event still looked like part of the same family.'
      ] },
      { image: 'assets/design/gdg-brand.svg', caption: 'Poster templates from the visual system.' },
      { heading: 'Outcome', text: [
        'The visual system carried the chapter through a year of events that reached more than 4,000 participants, alongside 40% membership growth.'
      ] }
    ]
  }
];

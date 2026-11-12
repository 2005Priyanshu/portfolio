/* =====================================================================
   DESIGN CASE STUDIES: edit this file to change the case study pages.
   Shankar Kulfi, ORIGINS and Prontoo are real work exported from Figma. Their copy only describes
   what is visible in the designs, so add the brief, your role and any results.
   Monsoon, Arena and GDG Bennett below are still DRAFTS with PLACEHOLDER
   images: replace them with real work or delete them.
   An entry can show one image ({ image }) or a row of them ({ images: [...] }).
   gallery: [...] shows a fanned spread of pieces on the card instead of the cover.
   ===================================================================== */
window.CASE_STUDIES = [
  {
    slug: 'shankar-kulfi',
    title: 'Shankar Kulfi',
    subtitle: 'Brand identity and packaging for a traditional kulfi maker',
    year: '2026',
    type: 'Brand identity · Packaging',
    role: 'Brand and packaging designer',
    tools: ['Figma', 'AI image tools for mock-ups'],
    cover: 'assets/design/kulfi-cart.jpg',
    gallery: ['assets/design/kulfi-logo.jpg', 'assets/design/kulfi-cart.jpg', 'assets/design/kulfi-fronts.jpg'],
    summary: 'A brand for Shankar Kulfi, a kulfi maker from Bhind: the wordmark, stick-kulfi packaging in three colourways, a label and banner, and a street-cart concept.',
    sections: [
      { heading: 'The brand', text: [
        'The identity leans on what the product already is: traditional, handmade and local. A deep red wordmark sits inside an arched, Mughal-inspired frame, and a compact SK roundel carries the brand where there is no room for the full name.'
      ] },
      { image: 'assets/design/kulfi-logo.jpg', caption: 'The Shankar Kulfi wordmark in its arched frame.' },
      { heading: 'Packaging in three colourways', text: [
        'The Kesar Pista wrapper is a four-sided sleeve. The front shows the kulfi with the SK roundel, the side sets the flavour name vertically, the back holds ingredients, nutrition and storage, and the last panel tells the story: "A tradition frozen in time".',
        'The ornate gold-and-blue borders stay fixed while the base colour changes between saffron orange, pista green and royal blue, so every version reads as the same brand at a glance.'
      ] },
      { image: 'assets/design/kulfi-range.jpg', caption: 'Orange, green and blue, each shown as front, side, back and story panels.' },
      { heading: 'Label and banner', text: [
        'Wider formats carry the product photography: a long label with the nutrition table and ingredients, and a KULFI banner built around the SK roundel.'
      ] },
      { images: ['assets/design/kulfi-banner.png', 'assets/design/kulfi-label.png'], caption: 'KULFI banner and product label.' },
      { heading: 'On the street', text: [
        'The cart at the top of this page is a concept mock-up, made with AI image tools, to test the identity at street scale: the wordmark on the canopy and cart body, the arch frame around the serving window and the roundel on the wheels.'
      ] }
    ]
  },
  {
    slug: 'origins',
    title: 'ORIGINS',
    subtitle: 'Graphics and social posts for a clothing brand',
    year: '2024',
    type: 'Brand graphics · Social media',
    role: 'Graphic designer',
    tools: ['Figma'],
    cover: 'assets/design/origins-1.jpg',
    gallery: ['assets/design/believe.png', 'assets/design/origins-1.jpg', 'assets/design/rome.jpg', 'assets/design/expensive.png'],
    summary: 'An Instagram campaign, a tee graphic and a set of typographic posters for ORIGINS, all designed in Figma.',
    sections: [
      { heading: 'Instagram campaign', text: [
        'One layout in three versions. "ORIGINS IS CHEAP" sits over a product photo with CHEAP struck through, and a white band underneath gives the real answer: value for money, affordable, worth it.',
        'Keeping the frame, type and strike-through fixed means the whole set reads as one campaign, and each new post only needs a new answer.'
      ] },
      { images: ['assets/design/origins-2.jpg', 'assets/design/origins-3.jpg'], caption: 'The same layout, with a different answer in each post.' },
      { heading: 'Tee graphic', text: [
        'ROME XVII pairs a hand-lettered wordmark with wings and a cross, framed by ESTD and 2024 badges and the line "The strong should aid and protect the weak".'
      ] },
      { image: 'assets/design/rome.jpg', caption: 'ROME XVII tee graphic.' },
      { heading: 'Typographic posters', text: [
        'Posters carried almost entirely by type: a swash serif in gold on deep green, a heavy sans with icons and a barcode, and an arched slogan.'
      ] },
      { images: ['assets/design/believe.png', 'assets/design/expensive.png', 'assets/design/manifest.png'], caption: 'Believe in a Better, Expensive and Manifest It.' }
    ]
  },
  {
    slug: 'prontoo',
    title: 'Prontoo',
    subtitle: 'A standee for a campus food-ordering service',
    year: '2024',
    type: 'Print · Marketing design',
    role: 'Graphic designer',
    tools: ['Figma'],
    cover: 'assets/design/prontoo-1.jpg',
    gallery: ['assets/design/prontoo-1.jpg', 'assets/design/prontoo-2.jpg'],
    summary: 'A two-panel standee for Prontoo, a food-ordering service for closed campuses: one panel speaks to students, the other to vendors and partners.',
    sections: [
      { heading: 'Two audiences, one layout', text: [
        'Both panels share the same structure so they read as a pair. The student panel answers "Why Prontoo?" with the app\'s onboarding screens and the features that matter when you order: vendor menus, ordering and payment, live order updates.',
        'The partner panel keeps the frame and swaps the story for the business side: a student app, a POS system and an admin panel, under the line "One stop solution".'
      ] },
      { image: 'assets/design/prontoo-2.jpg', caption: 'The partner panel.' },
      { heading: 'Telling the flow', text: [
        'A hand-drawn arrow carries the eye from the phone at the top, through three app screens, to the order being handed over at the bottom. Read top to bottom, the standee is the journey itself: order, pay, pick up.'
      ] },
      { image: 'assets/design/prontoo-screens-2.jpg', caption: 'The three app screens at the centre of the partner panel.' },
      { heading: 'Visual system', text: [
        'Prontoo orange with black and white, heavy geometric type for the headlines, and a thick orange border that frames each panel as one piece.'
      ] }
    ]
  },
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
    year: '2024 to 25',
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

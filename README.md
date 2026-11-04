# Priyanshu Singh — Portfolio

Minimal editorial portfolio over a scroll-driven 3D forest. Plain HTML/CSS/JS, no build step, no dependencies.

## Run locally
```bash
cd Portfolio
python3 serve.py
# open http://localhost:8000
```
`serve.py` stops the browser from caching files, so you always see your latest edits.

**After editing a CSS or JS file for a live site,** bump the `?v=` number on its link in `index.html`
(for example `styles.css?v=20261103` to `?v=20261104`). Otherwise visitors' browsers may keep showing the old file.

## Files
- `index.html` — page content. Each `<section data-scene="N">` sets the time of day and the soundtrack's arrangement for that section.
- `styles.css` — colour and type tokens at the top (`:root`), then base, glass and feature layers.
- `main.js` — reveals, cursor and star trail, hover previews, smooth scroll, Indian clock, soundtrack.
- `forest3d.js` — the 3D world behind the whole page (Three.js): terrain with snowy ridges, about 11,000 trees that sway in the wind, clouds, flocks of birds, fog for depth, sun, moon, stars, fireflies, light motes drifting past the camera, and your name standing in the valley as the hero title (`drawTitle` in the file). The camera glides forward over the forest as you scroll. Sky and light colours per time of day are in the `PAL` object; tree and ground colours are the `hexC('#…')` values.
- `forestsound.js` — the forest's sound: wind, birdsong, crickets, the campfire, the forest song, and the keepers' voices.
- `assets/voice/` — the keepers' recorded lines, made by `tools/make_voices.py`.
- `story.js` — story mode: the opening narrated by the sage at the campfire, and the four guides who walk visitors to their part of the page. See below.
- `landscape.js` — decides the time of day from the scroll position (the hour for each section is in `SECTION_HOURS`) and keeps text readable over the scene. It also draws a 2D version of the forest, which is shown only if a browser can't run the 3D one.
- `island3d.js` — the floating 3D forest island in the Design section (Three.js, loaded only when needed).
- `spline.js` — loads 3D scenes from Spline, if you add one (see below).
- `features.js` — evaluator game, design case study reader, "Ask about me" assistant, command palette.
- `case-studies.js` — **the case study content. Edit this file to change them.**
- `assets/design/` — case study images. **Everything here is a placeholder.**
- `retro-version/` — the earlier 8-bit version, kept for reference.

## Replacing the placeholder designs
1. Export your Figma frames as PNG, JPG or WebP (2x, about 2400 px wide, works well).
2. Put them in `assets/design/`.
3. In `case-studies.js`, point `cover` and each `image` at your files, and rewrite the draft text.
   You can add, remove or reorder case studies and sections freely.
4. Delete the placeholder `.svg` files when you are done.

## Editing other content
- **Evaluator prompts:** the `ROUNDS` list in `features.js`. Scores are 1 to 5 per criterion.
- **Assistant answers:** the `INTENTS` list in `features.js`. Each has trigger keywords and an answer.
- **Command palette:** the `COMMANDS` list in `features.js`.

## Soundtrack
The Sound button plays an audio file if one exists at the path in its `data-track` attribute
(`assets/audio/track.mp3`), otherwise the built-in generated track.

1. Put an MP3 or M4A **you have the rights to publish** at `assets/audio/track.mp3`.
2. Set `data-bpm` on the `#sound` button in `index.html` to the song's tempo, so the echoes land on the beat.

The file plays through a DJ-style chain in `main.js` (search for `track mode`): hall reverb, ping-pong echo,
compression and a limiter. Each section changes the filter and the amount of reverb and echo; tune them in
the `DJ` table. Turning sound on sweeps the filter open; turning it off lets the echoes ring out.
Keep the file under about 8 MB (a 192 kbps MP3 is plenty).

## Story mode
On a first visit the page opens in the forest instead: a sage at a campfire narrates, wakes the four
keepers, and offers a choice. Each keeper looks after one section and has a glade by the trail:
Ledger the owl (Experience), Ember the fox (Work), Fern the deer (Design) and Lumen the wisp (Contact).
Choosing one walks you down the trail at ground level to their glade, where they talk and the next keeper
interrupts. From there the camera rises over the trees to that section of the page. The time of day
follows the page, so the walk to Lumen happens at night.

- **Words:** `INTRO` (the opening) and `SCRIPT` (each keeper's lines) in `story.js`. Names and colours are in `CAST`.
- **Which keeper hosts which section:** the `STOPS` list. Each `id` is a section `id` in `index.html`.
- **Characters:** built from simple shapes in the `character(...)` blocks. Colours are the `M('#…')` values.
- Visitors can press Esc or "Skip intro" at any time. The intro plays once per browser. After that, a "Walk with a guide"
  button appears at the bottom left once you scroll, and the ⌘K menu has the same option.
- **Sound and voices** (`forestsound.js`): the intro opens on a title card, because browsers only allow sound to start
  after a click. "Enter the forest" turns sound on, and the Sound button and the switch in the story's top bar both control it.
  - What plays: wind in the canopy, birdsong (a dawn chorus at sunrise, quieter by afternoon), crickets and a distant owl at night,
    and the campfire, which gets louder as the camera nears it. During the story, a kalimba-and-pad forest song plays
    in place of the page's soundtrack.
  - Voices: each keeper speaks with a different voice from the visitor's device (`CAST_VOICE` lists the preferred voices,
    pitch and pace), and each line's mood (`warm`, `excited`, `sheepish`…, see `MOODS`) adjusts the delivery.
    Before some lines a keeper makes its own sound: a hum, a hoot, a yip, a soft call, a chime.
    On devices without speech, the keepers babble in their own pitch instead.
  - Recorded voices: `tools/make_voices.py` records every line with ElevenLabs into `assets/voice/`, and the story plays those
    instead of the device's voices. After editing a line in `story.js`, run `python3 tools/make_voices.py` again: only new or changed
    lines are recorded, and it asks for your API key without saving it. `CAST` at the top of that script chooses each keeper's voice.
    A line with no recording falls back to the device's voice. The footer credits ElevenLabs once recordings exist.
  - How device voices pronounce words is set in `SAY` in `forestsound.js`; for recordings, it's `SAY` in `tools/make_voices.py`.
- Add `?story` to the address to see the intro again, or `?nostory` to skip it. Links to a section (`#work`) skip it too,
  and so does the reduced-motion setting.

## 3D island
The island beside "How I design" is built in code in `island3d.js`: pines, a cabin, a pond and fireflies.
Its lighting follows the sky as you scroll, it tilts toward the cursor, it can be dragged to spin on desktop,
and the fireflies pulse with the music. Colours are the `mat('#…')` values near the top of the file.
It is skipped on browsers without WebGL, and stays still for visitors who ask for reduced motion.

## 3D objects (Spline)
A Spline scene, if you add one to the Design section, replaces the island.
1. Make a free account at spline.design and build or remix a scene.
2. In the scene settings, turn the background off (transparent) and turn off zoom and page-scroll capture.
3. Export → Code export → Viewer, and copy the URL ending in `scene.splinecode`.
4. Paste it into `data-spline=""` on the `.spline` element in the Design section of `index.html`.

With no URL the slot stays hidden. The scene loads only when the visitor scrolls near it, is skipped for
visitors who ask for reduced motion, and can't be rotated on phones so it never blocks scrolling.
The free plan shows a small "Built with Spline" badge; a paid plan removes it.
To add a scene elsewhere, copy the `.spline` element.

## Still to do
1. Copy `Resume_Priyanshu_AI.pdf` into this folder so the resume links work.
2. Add your LinkedIn: uncomment the line in the contact section of `index.html`.
3. Replace the placeholder case study images and text (see above).
4. Point each project row at its own GitHub repo.
5. Deploy: drag the folder onto Netlify or Vercel, or push to GitHub and enable Pages.

# BUILD BRIEF: "Таджикистан раскрывается" — an interactive 3D paper-atlas of Tajikistan

**Unofficial concept by Jomi Studio for @amirtour.tajikistan.** Never imply partnership, endorsement,
confirmed services or prices. Inspiration for the interaction quality: https://sam1983aing.github.io/fold-line/
(source: https://github.com/Sam1983Aing/fold-line). **Study the mechanics; do not copy its code, artwork,
layout, copy or brand** (the repo has no licence file).

You are the creative director, the Three.js engineer, the motion engineer, the UX designer and the QA
engineer. Build a **finished, running, browser-tested** site, not a plan, mockup or rotating object.
Start working immediately after a short audit. Do not ask questions you can resolve with a sensible default.

## 0. Success in one paragraph

Within 10 seconds on a laptop the visitor sees a lit, real-WebGL scene of folded paper maps. The map in
the light grows its mountain out of its printed contour lines. Clicking it dives the camera into a red
pin, and the visitor scrolls a guided walk over that terrain, with a caption panel that follows. At the
end the map folds shut and the atlas returns, with no reload. A verified inquiry button opens a chat with
**that trip** prefilled. Three destinations. Works on a phone. Falls back gracefully without WebGL.

## 1. Mechanics to understand and re-implement ORIGINALLY

I read Fold Line's source. These are the techniques that make it feel special. Re-create the *ideas* with
your own geometry, art direction and choreography:

1. **Flat until reached.** Everything is real 3D but lies flat on the print; it rises only when pointed at
   or approached.
2. **Contour-card stack.** The mountain is N stacked cards (cap about 28), one per elevation band, cut from a
   128 x 128 height grid. All cards live in **one BufferGeometry** with a per-vertex card index; a uniform
   table (lift, spring state) moves each card in the vertex shader; the fragment shader samples the height
   texture to draw each card's cut edge, contour line and contact shadow. Growing = the bottom card
   thickens first and lifts the rest, in a cascade (about 1.25 s), each card on its own spring so it lands
   with a small bounce. A card under the cursor lifts with everything above it.
3. **One lamp.** A single warm spot plus a little ambient. When a mountain stands, the lamp swings low and to
   the side so light **rakes across the terraces**, following the cursor with a heavy spring.
4. **Match-cut dive.** The camera falls onto the red pin until the pin's head fills the frame (red to red),
   you swap the scene behind it, and pull back out inside the map. No dissolve, no fade.
5. **Strip map.** The walk is a strip of 4-6 panels built from the real route (track, heights, ground beside
   it). Panels spring up as the camera arrives. Pop-up cut-paper scenery stands on the terrain.
6. **A paper figure walks the real track**; captions follow its km. Numbers printed on the page come from
   researched facts, never from the terrain grid.
7. **Maps fold shut at the end** and you are back on the atlas with that destination in the light.
8. **Physical honesty.** Hinges rotate about true pivots, paper has thickness and edge, shadows fall the
   right way. Springs are weighted with slight overshoot; not everything moves at once.

## 2. The experience you must build (P0)

**Atlas.** Full-viewport canvas: a coherent physical scene (your own idea: a surveyor's table, an
expedition trunk, a window desk; do not reuse a turntable around a globe) with three folded maps. One map
is in the light and grows its terrain. Hover/focus tilts and lifts only the target map (touch: tap to
select; keyboard: arrows/Enter). Real loader that ends when assets are ready.

**Unfold.** Each map is a concertina of **at least two hinged panels** with thickness. Phases:
select -> lift -> unfold (true pivots) -> contours rise -> dive. Must be **interruptible and reversible**
by Back, destination switch or rapid clicks, using one state machine (idle, selected, unfolding, exploring,
returning); no state is scattered across button handlers.

**Explore.** The camera follows an art-directed spline with at least three beats per destination; no free
OrbitControls. Scroll progress 0..1 maps to the path with look-at targets, a visible route progress line
and a caption panel. Never clip into terrain. Provide Next stop, Back to atlas and destination switch on
mouse, touch and keyboard. Handle resize and browser Back; clean up every ScrollTrigger/timeline/GL
resource on unmount (including React StrictMode double mount).

**Inquire.** CTA "Узнать даты / Забронировать тур" on the hero, the selected destination and the journey
end. It opens a verified Instagram or WhatsApp link with the **selected destination in the message**.
No booking engine, no deposits, no fake success states, no ratings.

**Signature gesture (pick one, do it beautifully):** a physical red field-bookmark ribbon that becomes the
progress line, or a lake "ink wash" that reveals the water as the terrain opens.

**Three destinations with different silhouettes, tints and journeys**: Искандеркуль (lake basin, quiet
highland), Алаудинские озёра (sharper Fann relief, several lakes), Сангтуда (only if Amir Tour really offers
it; show its true low-land/river character, never invented alpine rock; otherwise pick another confirmed
trip and document why). Each: 3 short journey moments, destination-specific inquiry text.

## 3. Real terrain, honestly

- Elevation: AWS Terrain Tiles (Mapzen/Tilezen, terrarium). URL pattern
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (verified reachable).
  Decode `height_m = R*256 + G + B/256 - 32768`. Mostly SRTM 30 m: summits read low, so **printed
  elevations come from researched facts, not the grid**.
- Write an offline **bake script** (`tools/bake-terrain.mjs`) that fetches tiles for a ~5-8 km crop around
  each verified coordinate, resamples to 128 x 128, and writes a compact data file. The browser never
  fetches tiles. Record coordinates (geocode via OpenStreetMap, state how), zoom, resolution and
  attribution in `docs/ASSET_CREDITS.md`.
- Route: use OpenStreetMap track data (ODbL, credit it) only if a real trail exists; otherwise draw an
  **illustrative storytelling path** and label it so. Do not invent GPX, times or distances.
- If real data cannot be obtained, stylised terrain is acceptable but must be labelled
  **"Иллюстративная 3D-визуализация — не навигационная карта."**
- Per-destination `terrainAccuracy: 'verified' | 'illustrative'` in `src/data/destinations.ts`.

## 4. Stack and architecture

Vite + TypeScript. Three.js with a **framework-free engine** in plain TS modules (`engine/`: fold, card
stack, terrain bake loader, camera rig, lamp, route, springs) and a thin **React** shell for UI and state.
R3F/Drei are allowed for the canvas host only if the engine stays framework-free and GPU resources are
created once. GSAP + ScrollTrigger (`@gsap/react` for lifecycle). Lenis only if testing proves scroll and
camera do not fight. Handwritten CSS with tokens; no component-library look. No file over about 500
lines. Business facts never live in shader or engine code.

```text
amir-tour-3d/            # new clean folder with its own package.json; do not edit other projects
  public/assets/         # licensed fonts, textures
  src/{app,engine,experience,data,components,styles}
  tools/bake-terrain.mjs
  tests/                 # playwright smoke journeys + screenshots
  docs/{AUDIT,REFERENCE_NOTES,ART_DIRECTION,CONTENT_SOURCES,ASSET_CREDITS,QA_REPORT,PROGRESS}.md
  README.md  AGENTS.md
```

## 5. Art direction (write it BEFORE coding, 1-2 pages)

Thesis: a collector's expedition atlas meets cinematic mountain light. Give two distinct directions, pick
one, commit. Specify exact palette tokens (mineral navy, warm paper ivory, glacier cyan, one restrained
saffron/clay marker), type scale, materials (paper fibre, thin linework, matte embossed layers, soft
edge wear, inked route), lighting, and **5 deliberate anti-template decisions**. Banned: purple/blue
gradients, glassmorphism card soup, generic stock photos, random particles, feature-grid icon rows, 12
generic sections, filler copy.

**Typography (a Cyrillic trap):** Fold Line's fonts are Latin subsets only. Choose one display and one UI
face with **real Cyrillic**, self-hosted (SIL OFL or equivalent), and prove coverage by rendering
`Искандеркуль · Алаудинские озёра · Сангтуда · ёЁ · ғӣқӯҳҷ` in each. Canvas/texture labels must wait for
`document.fonts.load()` with Cyrillic sample text before drawing, or they render in the fallback face.

Copy: Russian-first, specific, short, hand-set line breaks. No fabricated testimonials. A visible but
discreet tag: **«Независимый концепт Jomi Studio · Неофициальный сайт Amir Tour».**

## 6. Business facts and integrity

Verify only from public sources: official Instagram https://www.instagram.com/amirtour.tajikistan/ and its
linked channels. Starting leads from earlier research (treat as unverified until you confirm them):
a recent tour announcement https://imginn.com/p/DeaJEa-ETWT/ and an older post that includes the Alaudin tour
https://imginn.com/p/DboH5XaiEjH/ (third-party mirrors; confirm against the official account). Candidate
WhatsApp contact printed in the account's tour posts: +992 807676796 (**re-verify before using**).
Candidate destinations from those posts: Искандеркуль, Алаудинские озёра, Сангтуда.
Known limitations to keep honest: package availability, inclusions, dates and prices are not confirmed;
terrain and routes are illustrative unless you obtain verified data; this is not navigation data. If it
cannot be verified, the only CTA is the public Instagram profile. If Instagram blocks automated access,
say so plainly and mark facts unverified. Never invent prices, dates, itineraries, elevations, safety
claims, reviews or phone numbers. No scraped Instagram photos or logos. Everything goes in
`docs/CONTENT_SOURCES.md` (claim, URL, date accessed, status, uncertainty).

## 7. Performance, robustness, accessibility

- Budgets (measure and report; adjust with evidence): gzip JS <= 450 kB initial; textures <= 15 MB
  desktop / 6 MB mobile; draw calls <= 120 desktop / 60 mobile at the atlas; DPR <= 2 desktop / 1.5 mobile;
  one shadow-casting light; no full-screen post-processing. Three quality tiers by device.
- Terrain geometry is built once; never rebuild topology per scroll tick. Dispose on unmount.
- Honor `prefers-reduced-motion` (simple navigation, all info and CTA still reachable). Context-lost or
  no-WebGL gives a designed static fallback that still supports browsing destinations and inquiry.
- Responsive at 360, 390, 768, 1024, 1440 plus mobile landscape; touch targets >= 44 px; no horizontal
  overflow, no UI buried under the canvas, no console errors.
- Landmarks, semantic controls, ARIA label and text alternative for the canvas, visible focus, contrast,
  Russian `lang`, title/description/Open Graph.
- Expose `?capture` (disables smoothing and intro, offers `window.__frame(s)`) and `window.__state()`
  (camera, phase, draw calls, triangles, collected errors) so tests and recordings are exact.

## 8. Skills and tools (verified to exist; check, do not assume)

```bash
npx skills add vercel-labs/open-agents --skill frontend-design
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --skill react-best-practices
npx skills add greensock/gsap-skills --skill gsap-core --skill gsap-timeline --skill gsap-scrolltrigger --skill gsap-react --skill gsap-performance
npm install -g @playwright/cli@latest && playwright-cli install --skills
npx skills list     # confirm; open the installed SKILL.md files
```

Add `--agent claude-code` if needed. Fallback: read the raw SKILL.md files in those repos directly. If the
session already offers `frontend-design`, `parallax-threejs` (checkpoint, diff, sweep, ship-check) or
`3d-motion-graphics` skills, use them. A Chromium is preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`);
**do not run `playwright install`**. Headless WebGL needs software GL:
`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. **Software rendering cannot
give real FPS**; report frame times as "software-rendered, not representative" and never claim device FPS.

Skill use by phase: art direction and UI -> frontend-design (+ web-design-guidelines); 3D -> Three.js docs,
react-best-practices; motion -> the five gsap skills; QA -> playwright-cli + a final web-design-guidelines
audit. Reading a skill is not doing the work.

## 9. Execution order (commit locally after each step; log in `docs/PROGRESS.md`)

**A. Audit (short).** Open Fold Line live and its source; write `REFERENCE_NOTES.md` (10+ mechanics and why
each works). Note: the live page now shows a single fictional "Valmora Round" while the README describes
five treks, so trust what you observe. There is no prior prototype in this folder: an earlier 2D-canvas
mock (fake terrain, destination switch, WhatsApp inquiry) was discarded, so build from scratch. Keep only its
ideas: Russian-first copy, a destination switch and a contact-intent CTA. Record this and the Fold Line
comparison (what it does that we must reach) in `AUDIT.md`. Build the source ledger. Write `ART_DIRECTION.md`.
**B. One excellent destination (Искандеркуль).** Scaffold, lit scene, two-plus hinged panels, baked terrain
card stack growing under a lamp, dive, scroll walk with 3 beats, return, rapid-click abuse test. Screenshot
at 1440x900 and 390x844, list **5 visual defects**, fix them before expanding.
**C. Expand to three destinations.** Generalise only after B is excellent. Selector, route progression,
CTA, a short editorial section (verified facts, why it's interesting, credits, contact). Design the phone
version deliberately (different camera angles and UI placement), not a squeezed desktop.
**D. QA and polish.** Build, typecheck, lint, tests. Playwright at 1440x900, 390x844, 768x1024, 360 wide;
walk every destination; click CTA; switch mid-transition; reload and deep link; scroll both ways;
keyboard; reduced motion; WebGL disabled. **View the screenshots** (shadows, crop, line breaks, spacing,
clipping, mobile) and fix. At least **two full screenshot-review -> fix loops**. Final
web-design-guidelines audit and a react-best-practices/gsap-performance pass.

Priority: **P0** real WebGL terrain, true unfold, 3 destinations, journey, return, reliable inquiry, mobile,
finished look. **P1** labels, data provenance, micro-interactions, loader/fallback, accessibility. **P2**
atmospherics, extra languages, image reveals. Never sacrifice P0 for P2.

## 10. Test matrix (run it; log real results in `docs/QA_REPORT.md`)

Fresh load without fatal errors | each of 3 destinations changes real terrain, title and journey | at least
2 hinged panels visibly open (no scale trick) | camera enters terrain without clipping | 3 labelled beats and
accurate route progress | Back returns to a stable atlas pose, no stuck scroll | rapid clicks do not corrupt
state | CTA carries the selected destination, no invented prices | 360/390 px: no overflow, CTA reachable
| reduced motion works | no-WebGL fallback works | build, typecheck, lint and tests pass.
Never report a test you did not run. Never fabricate screenshots.

## 10b. Standing rules (also save a short `AGENTS.md` with these so future sessions inherit them)

Read this brief fully first. Russian-first. Always disclose "unofficial concept". No fake prices,
availability, testimonials or ratings. No unlicensed Instagram imagery. No fabricated geography. No copied
Fold Line code or assets. Report only tests you ran and URLs you verified. Priority: P0 functional and
bespoke visual quality > P1 polish > P2 extras.

## 11. Deliverables

1. Runnable project with `npm install`, `dev`, `build`, `preview`, `lint`, `typecheck`, `test`.
2. README (Mac/Windows setup, GitHub Pages base path, optional Vercel, known limitations, operator TODOs).
3. All docs in section 4, plus `tests/screenshots/{desktop,mobile,tablet}.png` from the running site.
4. A short summary: how to open it, what works, what needs operator confirmation, build/test results, and
   which parts are **illustrative vs verified**.
5. A public URL **only if actually deployed and verified**. Push only to the branch this session designates;
   no remote actions on anyone else's account.

## 12. Self-review (strict, with evidence)

Score 0-10: 3D authenticity and interactivity 25% | art direction 25% | choreography 15% | business UX 15% |
responsive and performance 10% | QA and integrity 10%. Pass = all P0 working, no critical QA failure,
every category >= 8 by honest assessment. Below that: revise and retest. Do not claim a guaranteed 10/10.

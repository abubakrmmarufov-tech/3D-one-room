---
name: 3d-motion-graphics
description: Use whenever the user asks for 3D, Three.js, WebGL, shaders, scroll-driven pages, motion graphics, animated UI, a hero/landing page, a walkthrough, or "make it look great". Sets the quality bar and the build process for cinematic web 3D and motion.
---

# 3D and motion graphics: quality playbook

Distilled from the Casa Serra / Casa Larga floor-plan-to-house demos, the 475-demo
"awesome Opus 5.5 videos" collection, the "solo motion design studio" toolchain post
and the 3D-website inspiration list. Full sources and reasoning: `docs/MOTION_RESEARCH.md`.

Stack already in this repo: `three@0.170`, `vite`, plus `gsap`, `lenis`, `postprocessing`.
Do not copy code from other people's repos (see `THIRD_PARTY_NOTICES.md`); reuse the techniques.

## 1. Process (this matters as much as the code)

1. **Propose before building.** For anything non-trivial, give 2-3 directions with concrete
   sizes, a camera path stop by stop, palette and type, then wait for the user's pick.
   Without this you ship a finished thing nobody chose.
2. **Build in checkpoints.** Checkpoint 1 is the single hero idea only (e.g. the reveal and
   the first move). Record or screenshot it, look at it, then continue.
3. **Look at the pixels.** Headless Chromium and Playwright are available
   (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; do not run `playwright install`). Render
   frames at several scroll/time positions, view the PNGs, and fix what is ugly. Give each
   shot a score out of 10 and iterate on the lowest. Never claim "looks great" unseen.
4. **Frame-exact capture mode.** Expose `?capture` that disables smoothing and intros and
   offers `window.__frame(s)` so a script can render exact positions and record video.
5. **Expose state for tests.** `window.__state()` returning camera values, draw calls,
   triangles and collected errors; fail checks on any console error.

## 2. Build the real thing, then change how it is shown

- One real 3D model, many looks. Do not fake a flat drawing with a picture: cut the model
  with a clipping plane (`renderer.localClippingEnabled = true`, one shared
  `THREE.Plane` whose `constant` is animated) and view it through a very narrow lens
  (fov about 2 degrees) from straight above. Opening the lens while descending removes
  every cut.
- Animate **lens, distance and framing together**: keep `frameHeight = 2 * dist * tan(fov/2)`
  constant while fov changes (dolly-zoom), then ease the frame to the target. No cut ever.
- Drive everything from one scalar `s in [0,1]` through pure functions
  (`track([[s, value, ease], ...])` for keyed values and a monotone cubic "glide" for
  walking so pace never stops dead). The camera is `at(s)`, never mutated ad hoc.
- Surface reveal ("ink to material"): one shader patched via `onBeforeCompile` blends a flat
  line-art look into the lit textured look. A per-room sweep front (a world-space plane
  distance with a 1 m smoothstep) decides the blend, and a matching clipping plane removes
  that room's ink lines behind the front.
- Black plan walls for free: with a watertight solid, anything visible through the cut is
  a wall interior; paint back faces ink and you get poche with no extra geometry.
- Procedural solids: model right-angled buildings as a boolean grid of boxes and emit only
  boundary faces, world-planar UVs in metres (uniform texel density), and true edges only
  where surfaces meet at an angle (not at box seams).
- Crisp lines: `LineSegments2` + `LineMaterial` (screen-space width), not `GL_LINES`.
- Architect annotation as canvas textures on planes lying in the 3D scene (room names,
  dimension strings, door swings, north arrow, title block, scale bar) so they stay in
  place when the camera descends.

## 3. Look-development checklist (what makes it "expensive")

- **Renderer**: `ACESFilmicToneMapping`, sRGB output, `PCFSoftShadowMap`, pixel ratio
  capped at 2, `shadowMap.autoUpdate = false` and flag `needsUpdate` only when it changes.
- **Light**: one warm low sun (about 0xffc98f, intensity high, 4096 shadow map, tight
  shadow frustum, `normalBias` 0.015) + hemisphere fill + `RoomEnvironment` PMREM at low
  intensity. Fake bounce with a few small warm point lights and cool "sky" point lights at
  windows. Late-afternoon light beats noon light every time.
- **Materials**: CC0 PBR (diffuse, normal, ARM/roughness) from Poly Haven, 1k on phones,
  2k hero surfaces, max anisotropy. Grade textures (pull toward mean, desaturate, tint) so
  they sit in one palette. Contact-shadow planes under furniture. Cheap AO term near
  walls/floor/ceiling in the shader.
- **Fog and depth**: animate `fog.near/far` with the camera; keep near/far planes tight
  (a thin depth slab when viewed from far above) to avoid z-fighting.
- **Post (when it helps)**: `postprocessing` (pmndrs) for bloom, subtle vignette, film grain,
  depth of field. Subtle only; film grain as a CSS overlay is cheaper.
- **Scale and detail**: real furniture proportions, 3 m ceilings, door heights. Big rooms
  and eye-height camera (1.45 m) read as luxury; orbit shots read as a toy.
- **Performance**: device-tier switch (lower pixel ratio, 1k textures, fewer shadows on
  phones). Provide a poster still and a clip as fallback. Log `renderer.info`.

## 4. Motion design rules (from the 475-demo prompts that went viral)

- **One continuous take.** Nothing cuts or crossfades: each scene grows out of the last
  (a shape morphs, a button expands into a page, a flood of colour contracts into the next
  object). Banned in the strongest prompts: crossfades, blur-ins, bouncy springs, holds over
  1 s, "anything that looks like a template".
- **One eased move per scene** and one gesture per beat. Never zoom in then straight out;
  never reverse camera direction. Use one house curve, e.g. `cubic-bezier(.45,0,.15,1)`
  at 0.8 s for morphs, and the camera rides the same curve.
- **Text rises from a mask line** (`overflow:hidden` line wrapper, child `yPercent: 105 -> 0`,
  `expo.out`, stagger 0.12). Stagger entries by 60-120 ms.
- **Beat-locked.** Pick a BPM, count beats, make something happen on every beat and land
  the biggest move on the drop. Synthesize audio in Web Audio when no file is allowed.
- **Palette**: a warm off-white or paper canvas, near-black UI, and a single accent. Pair a
  grotesk/mono UI face (Geist, IBM Plex Mono) with one serif (Instrument Serif).
- **Soft layered shadows that grow with height**; real cursor with real clicks for UI demos.
- Smooth scroll: `Lenis` (lerp about 0.085) + `ScrollTrigger` with `scrub` about 0.8 and a
  paused GSAP timeline driving the scalar `s`; `gsap.ticker.lagSmoothing(0)`.

## 5. UI/UX craft (from the inspiration sites)

Reference for taste and copyable patterns: Awwwards, Godly, 60fps.design (UI motion),
21st.dev, Aceternity UI, Magic UI, Scrolltide (prompts + source for 3D scroll sites),
Shadertoy (shader ideas), threejs.org/examples.

- Real hierarchy: one hero idea per screen, generous whitespace, huge type, tiny mono
  captions. HUD micro-details (lens, height, cut level) add credibility.
- A persistent progress rail tied to the scalar `s`, captions that fade in and out at
  stops, a loading state that finishes only after fonts and textures are ready.
- Accessible: respect `prefers-reduced-motion` (show stills), keyboard fallbacks, readable
  contrast, touch joystick or swipe on mobile.

## 6. Toolchain for video / motion deliverables

Excalidraw (storyboard) -> Penpot (style frames) -> Fontsource + Lucide + SVGO (type, icons,
clean SVG) -> GSAP (choreography) -> Three.js (3D) -> Audacity or Web Audio (sound) ->
Remotion (assemble) -> FFmpeg (encode and inspect). Chromium plus `ffmpeg` exist in this
environment under `/opt/pw-browsers`; capture frames with `?capture`, then encode.

## 7. Definition of done

- Viewed frames at start, mid and end of every move; weakest shot rewritten.
- No console errors, steady frame time, mobile layout checked.
- Repo checks (`npm run check`, `npm run build`) still pass when touching this app.
- Honest report: what was verified by looking, what was not (real devices, GPUs).

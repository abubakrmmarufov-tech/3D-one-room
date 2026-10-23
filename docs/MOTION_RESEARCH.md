# Motion graphics and 3D: research notes

Research done 2026-10-23. Purpose: learn how the best AI-built 3D and motion pieces are made, and
turn it into a repeatable standard for this repo. The working playbook is
`docs/skills/3d-motion-graphics/SKILL.md` (copy it to `.claude/skills/3d-motion-graphics/` to activate; `.claude/` is gitignored here); this file holds the evidence.

## What was analysed

| Source | What it is | Retrieved how |
| --- | --- | --- |
| [@SammmAing, 8-minute build video](https://x.com/SammmAing/status/2110487729016295545) | How the viral Casa Serra scroll-driven floor plan to 3D house was built with Claude Opus 5.5 | Post text via fxtwitter mirror; [live demo](https://sam1983aing.github.io/casa-serra/) README and prompt; [Casa Larga](https://github.com/Sam1983Aing/casa-larga) source read in full |
| [@beamnxw, solo motion studio](https://x.com/beamnxw/status/2111125001482936542) | 10 open-source repos, one per step from storyboard to MP4 | Post text |
| [@hurricodes, 475 video demos](https://x.com/HurricaneCrypt0/status/2111531584037785970) | One repo of Opus 5.5 videos with prompts | Post text; repo identified as [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos), cloned, `videos.json` and prompts analysed |
| [@himanshubuildss, 3D website inspiration](https://x.com/himanshubuildss/status/2111705429264998892) | 10 sites to see AI-generated 3D websites and UI | Post text; Scrolltide fetched |

**Not done, honestly:** the attached videos were not watched (no video playback here), so motion
quality was judged from code and prompts, not footage. The **"@Alevsk 29-post AI game showcase
thread" could not be found**: the X profile resolves to Lenin Alevski (security engineer), search
found his game *Accidental CISO* but no 29-post thread, and X search through the mirror failed.
Send the thread URL and I will analyse it. The `hurricodes` post says the repo is "in the
comments"; the repo above is the 475-prompt collection that matches (its README currently says
418 remakes and 703 prompts, so counts drift).

## How Casa Serra / Casa Larga build the 3D

Casa Serra took about 70 prompts over two weeks and four full versions (Claude Code, Opus 5.5).
Casa Larga is a single-prompt re-run, unedited, and its code is readable (about 1,800 lines,
no build step: three 0.170, GSAP 3.12.5 ScrollTrigger, Lenis 1.1.14).

1. **The floor plan is the model.** The 3D house is cut by one shared clipping plane at 1.2 m
   and viewed from straight above through a 2 degree lens, so perspective vanishes and it reads
   as a drawing. Scrolling raises the cut (walls grow), tips the camera, widens the lens and
   shortens the distance together, so there is never a cut.
2. **One scalar drives everything.** Scroll maps to `s in [0,1]`; `rig.at(s)` is a pure function
   returning camera pose, fov, cut height, fog and reveal amounts. Keyed tracks with per-key
   easing, plus a monotone cubic spline for walking.
3. **Procedural geometry in code, no Blender.** A `RectSolid` modeller adds/subtracts
   axis-aligned boxes on a compressed grid, emits only boundary faces (watertight skin),
   world-planar UVs in metres for uniform texel density, and true edges only where surfaces
   meet at an angle. Insides of the solid are painted ink, giving black cut walls for free.
4. **Ink to material shader.** Every material is patched (`onBeforeCompile`) to blend flat
   paper colour and lit PBR by a per-room sweep front with a 1.1 m soft edge, with matching
   clipping planes that remove that room's ink lines behind the front. A cheap proximity AO
   term and texture grading (pull to mean, desaturate, tint) keep scans in one palette.
5. **Architectural annotation lives in the scene.** Room names, dimensions, door swings, a
   1.2 m floor grid, dashed tree crowns, a north arrow, scale bar and title block are canvas
   textures and `LineSegments2` lying on the floor/ground, so they remain after the camera
   descends. `LineMaterial` gives screen-space line widths.
6. **Light.** One warm low sun (4096 shadow map, tight frustum), hemisphere fill,
   `RoomEnvironment` PMREM at 0.3, small warm point lights faking bounce and cool ones faking
   sky at the glazing, contact-shadow planes under furniture, ACES tone mapping, soft shadows
   updated only when needed.
7. **Craft around it.** Loader waits for fonts and textures, HUD readouts (lens, height, cut),
   progress rail, line-mask headline entrance, film-grain overlay that fades out, device tiers
   (about 39 MB of textures on laptop, 13 MB on phone, still plus clip fallback), a `?capture`
   mode that renders exact frames for recording, and `window.__state()` for checks.
8. **Process.** The README's own lesson: ask for 2-3 directions first and stop, build in
   checkpoints, record each, score every room out of ten, repeat. The idea (floor plan) only
   appeared four days in.

## What the 475-demo corpus says (703 prompts, categories: 369 motion, 117 3D, 116 explainer, 101 interactive)

- Tech tags in the 3D set: Three.js 46, canvas 34, shader 33, SVG 17. Most are single-file HTML.
- The strongest prompts have the same shape: `<inputs>` (what to ask the user, with defaults),
  `<direction>` (format, fps, one continuous take, palette, type, easing), `<structure>` (BPM,
  beat count, what happens per beat) and an explicit **Banned** list: crossfades, blur-ins,
  bouncy springs, holds over 1 s, "anything that feels like a template".
- Recurring moves: text rising from a mask line, shapes morphing into the next scene, colour
  flooding then contracting, one eased camera move per scene, never zoom in then out, easing
  `cubic-bezier(.45,0,.15,1)` at 0.8 s, soft layered shadows, beat-locked edits landing on the
  drop, Web Audio synthesized sound.
- Example 3D prompt worth imitating: an interactive mechanical watch in one HTML file with an
  exploded view, labelled layers, hover highlights, orbit and zoom, with "do not ask questions,
  just build it" for one-shot runs.

## The solo motion studio chain (@beamnxw)

Excalidraw (storyboard) -> Penpot (style frames) -> Fontsource (type) -> Lucide (icons) ->
SVGO (clean SVG) -> GSAP (choreography) -> Three.js (3D) -> Audacity (sound) -> Remotion
(assemble) -> FFmpeg (encode). The useful idea is the order: brief, storyboard, visual system,
typography, assets, motion, 3D, sound, assembly, export.

## Inspiration sites (@himanshubuildss list)

Scrolltide (128 templates, 66 components, 55 shaders; React/Next, GSAP, Three.js, Lenis;
copy-paste prompts with source), Awwwards, Godly, 60fps.design, 21st.dev, Aceternity UI, Magic
UI, threejs.org, Shadertoy, Lovable. Use them for taste references and component patterns, not
for copying code verbatim.

## What was installed

- npm dependencies added to this repo: `gsap`, `lenis`, `postprocessing` (three stays at 0.170;
  `npm run build` passes). Not yet wired into the app.
- Playbook skill in `docs/skills/3d-motion-graphics/SKILL.md`; copy to `.claude/skills/` to auto-activate (`.claude/` is gitignored).
- Plugins offered for one-click install (user action required): `parallax-threejs` (Three.js and
  GLSL debugging), `frontend-design`, `Motion Reel`, `Remotion`.
- Reference clones kept outside the repo (scratchpad) and not vendored: licensing is unclear and
  this project's notices state Casa Serra code is not included.

## How this applies to this project

The current viewer is a baked GLB (Block B, 128 apartments). Highest-leverage upgrades from this
research: an intro that cuts a plan through the building and descends to the showcase apartment
with the dolly-zoom rig; ink-to-material reveal when entering a room; the late-afternoon light
recipe; and a `?capture` mode for recording tours.

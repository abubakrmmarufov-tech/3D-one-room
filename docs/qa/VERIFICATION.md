# Verification — 2026-10-16

## Scope and source

The owner selected the October 13-page drawing set. Both residential blocks В and Б use the repaired plans; hotel А remains in the original GLB. The GLB SHA-256 remains `bdc19f31cf65d157790b207af0c5c0fa48421d2c2472d5b79b83f9e1cbd5853c`.

There are 288 apartment instances across 36 residential floors, built from 32 layout variants (Б typical, В typical, В23 and В24; eight apartments per variant). Interiors, finishes and lighting are design proposals. No source PDFs or reference boards are included in the published repository.

## Automated checks

- `npm run check`: every one of the 166 interior room targets across all 32 variants is reachable, including furniture obstacles. Routes and continuous walking were checked for collisions and stalled movement.
- Reports: `navigation.json`, `furniture.json`, `motion.json`.
- `npm run build`: production build passed. Vite reports a large JavaScript chunk (about 1.11 MB uncompressed / 315 KB gzip).
- `node scripts/make-artifact.mjs`: alternate publish package generated successfully with local textures, hashed scripts and the JSON model fallback.
- `git diff --check`: passed.

The simulations exercise all distinct interior layouts, not a separate manual walkthrough of all 288 repeated instances.

## Browser checks

Tested the production preview in the Codex in-app Chromium browser at desktop (1440 × 900), tablet (768 × 1024) and phone (375 × 812) viewport sizes. No horizontal document overflow at these sizes. The tablet/phone layout uses a horizontal floor selector, scrollable apartment/room panels and visible joystick.

Block В floor 12 apartment 61: entered successfully; the detailed graphics tier compiled without logged errors; the six-room guided tour completed with `Осмотрено 6 из 6 помещений`. Room selection also followed a route to the living room. Block Б floor 12 apartment 57: entry and kitchen navigation verified. Block В floor 24 apartment 155: entry and kitchen navigation verified at phone size; keyboard movement stopped the tour. Exiting returned to the same apartment and the next floor could be selected. Floor 23 apartment 145: entry and living-room route verified. Public deployment checks are recorded below.

During visual testing, doorway floor finishes were given separate height layers to remove coincident surface flicker. Door frames were extended slightly into the opening to remove seam flicker. Portrait exterior camera framing adapts to aspect ratio so all towers can remain visible.

## Remaining limits

- Some terrace passages remain unresolved. `terraces.json` records these separately. The interior tour does not promise access to every terrace.
- Some source area labels conflict with geometry, especially block Б's rectangular kitchen marked 47.41 m². Values are not certified measurements. Ambiguous split hall sections on В24 use geometry area instead of duplicating one drawing label.
- The original exterior/site geometry and vegetation remain stylized. Improved material maps and lighting do not turn the model into a photographic reconstruction.
- Physical phones/tablets and other browser/GPU combinations were not tested. No universal frame-rate or glitch-free guarantee is claimed.

## Public release

Initial implementation commit: `1d20e97ba415cdc7aa05772f8f0d8bb3c73fee63`. Pushed to the implementation branch and `main`. [GitHub Pages deployment 38876894276](https://github.com/abubakrmmarufov-tech/3D-one-room/actions/runs/38876894276) completed successfully.

The initial public release at https://abubakrmmarufov-tech.github.io/3D-one-room/ loaded `assets/app-DYC5p5P9.js` and local model/material assets without logged browser errors or warnings. The Russian overview displayed 288 apartments; block Б floor 12 apartment 57 opened into the furnished interior and accepted the living-room route. No GitHub sign-in is needed to view the GitHub Pages site.

A subsequent public visual check found rectangular bounding-box frames and curtains crossing curved glazing. The follow-up limits these details to straight rectangular windows and keeps the source curved glazing. Artwork and upper kitchen cabinets require nearby solid walls, and televisions have a stand. The 166-room movement checks and production build passed again after this repair.

## Daylight, performance and room controls — 2026-10-16

Implemented one continuous visual clock for the sky, sun, exposure, fog, facade lights, window emission and interior lamps. Presets cover dawn, day, sunset and night; a manual slider and optional four-minute cycle are available. This is an artistic day cycle, not a location-specific solar simulation.

Rooms and minimap are closed by default on entry. A small Russian “Комнаты” button opens the drawer; choosing a room closes it. Browser checks at 375 × 812, 768 × 1024 and 1440 × 900 confirmed the controls fit the viewport. The phone drawer remains scrollable, and the joystick remains available.

Removed the 6 MB startup HDR and generate a small environment locally. Fourteen runtime material maps total 493,894 bytes, down from 10,454,982 bytes (95.3% smaller). Their source hashes and provenance are in `../optimized-assets.json`. Materials and detailed post-processing load progressively; missing optional textures retain fallback materials. Shadow maps update when geometry or time changes, with smaller maps and adaptive render resolution for slower devices. Initial scene/entry shaders are prepared behind a loading state using `compileAsync`.

The sky follows the camera and fits within the far plane. Context buildings use opaque depth-writing materials. Interior glass uses a cheaper single surface. A living-room window check at sunset showed a continuous sky/horizon without the former black sky patches; dawn and night changes were also exercised. This sampled check is not a guarantee for every view/GPU.

Service-worker precaching includes the shell, hashed scripts, optional effects, material maps and versioned GLB. Each cache is installed atomically; navigation stays with its matching cached release, and an update waits for old tabs to close. Tested an actual offline reload, apartment entry, living-room route and detailed effects in Chromium after caching. First-time use still requires a connection, and storage may be evicted by the browser.

Cold-load test: 1.6 Mbps download, 150 ms latency and 4× CPU slowdown, with HTTP cache and service worker bypassed. DOM ready: 4.50 s; GLB response complete: 38.15 s; full scene ready: 47.00 s. The original GLB is 6,513,108 bytes and remains unchanged. This is a useful reduction in downloaded assets, not an instant first visit on slow internet. The first cutaway/detailed shader work can still pause on a heavily throttled CPU. No passing INP or universal frame-rate claim is made. All throttling and viewport overrides were restored.

`npm run check:lighting` passed: 960 lighting samples and midnight wrap; offline shell, model, dynamic chunks, version reuse, cache cleanup, failed-install rollback, and navigation release consistency. Production build and portable JSON-model package passed. Existing navigation, furniture and continuous-motion checks passed for all 166 distinct interior targets; apartment navigation geometry is unchanged by this update. No application console errors or warnings were logged in the sampled local checks. Physical mobile devices remain untested.

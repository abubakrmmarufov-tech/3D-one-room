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

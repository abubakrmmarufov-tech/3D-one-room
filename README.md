# Шахрофар — пространство для жизни

Interactive Three.js viewer for the residential blocks В and Б. Choose a floor, select an apartment, and explore its furnished rooms with a guided tour, keyboard, floor click, or touch joystick. The interface is in Russian.

The coworker's complete building and site model was imported into this repository. The October 13-page drawing set selected by the owner supplies the apartment baseline. Both residential blocks are included: 288 apartment instances across 36 residential floors, using 32 apartment layout variants. Hotel А geometry and floor contents remain the original model.

The furniture, finishes and lighting are a design proposal. This viewer is not a construction or sales specification. Apartment numbers are navigation identifiers.

## Run and verify

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

Node 22 or newer is suitable. Production files are in `dist/`. All runtime model, material and environment assets are served locally; no API key is required. `npm run artifact` prepares an additional `publish/` copy with a JSON model fallback for hosts that cannot serve GLB files.

## Controls

- Building: drag to orbit, wheel to zoom; choose В or Б and a floor, then an apartment.
- Apartment: drag to look, click a clear floor point to walk, or use WASD. Q/E or left/right arrows turn. Touch screens have a joystick.
- Room buttons follow collision checked routes. The tour pauses in each room. Manual input stops it. Escape returns to the building.
- Comfort uses a lower pixel ratio. Detailed adds contact occlusion inside apartments.

## Drawings and source integrity

[Upstream baseline](docs/UPSTREAM.md) records the imported repository and GLB hash. The GLB is preserved; corrected web plans are in `src/model/plans.json`. Typical floors use sheet 7; block В floors 23 and 24 use sheet 8. The June sheet is excluded.

The current web data repairs missing sanitary rooms, floor-24 walls, apartment ownership, balcony assignment and overhead beams. Furniture orientations are saved in the same data. `scripts/refine-plans.py` reproduces the drawing repair from the local October PDF and extracted `build/plans/` vectors; it requires PyMuPDF, Shapely and NumPy. Private drawings and reference boards are not published.

The original Blender generation scripts remain available for source work. **Running their export alone overwrites the repaired web plans.** Reapply the drawing refinement and furniture route checks after a re-export. The original `.blend` does not contain the new web furniture.

## Validation and limits

`npm run check` checks every interior room in all 32 variants, both with and without furniture. It also simulates continuous walking through every room sequence and checks for collisions and stalled movement. Reports are in `docs/qa/`.

Drawing labels and geometry have inconsistencies. In particular, the block Б rectangular kitchen marked 47.41 m² is much smaller geometrically; its original label is retained, and it must be clarified with the architect before commercial use. Some unlabeled or ambiguous rooms use geometry areas; the split floor-24 hall label is not counted twice. Floor-24 totals are room sums. Terrace access is separately recorded in `docs/qa/terraces.json`; unresolved exterior passages are not included in the interior tour. Do not treat displayed areas as certified measurements.

Browser validation and release evidence are recorded in [the verification report](docs/qa/VERIFICATION.md). Physical mobile devices and all GPU combinations have not been tested.

## Publish

Pushes to `main` deploy `dist/` through `.github/workflows/deploy.yml` to GitHub Pages. Content hashed assets prevent old scripts being reused after a new release. The public viewer is [3D-one-room](https://abubakrmmarufov-tech.github.io/3D-one-room/).

## Assets

See [third-party notices](THIRD_PARTY_NOTICES.md) for Three.js and locally bundled CC0 material maps and HDR environment. Casa Serra was used as a quality reference; its code, assets and branding are not included.

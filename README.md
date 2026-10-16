# Шахрофар — пространство для жизни

Interactive Three.js viewer for residential Block Б. Choose a floor, select an apartment, and explore its furnished rooms with a guided tour, keyboard, floor click, or touch joystick. The interface is in Russian.

The October 13-page drawing set selected by the owner supplies the apartment baseline. Only Block Б remains: 128 apartment instances across 16 residential floors (5–20), using eight layouts. Hotel А and Block В have been removed from the delivered model and catalogue; the shared podium and landscaping remain. The model is 4.42 MB, reduced from 6.51 MB.

[Open the showcase living room](https://abubakrmmarufov-tech.github.io/3D-one-room/?apt=B12-0&room=living): floor 12, navigation apartment №57. It has separate upholstery cushions, woven finishes, travertine and walnut furniture, curved window frames and decorative lighting, plus a clear standing viewpoint. Other apartments retain their existing interiors. The overview also has a Russian showcase button.

The furniture, finishes and lighting are a design proposal. This viewer is not a construction or sales specification. Apartment numbers are navigation identifiers.

## Run and verify

```sh
npm ci
npm run dev
npm run check
npm run check:showcase
npm run check:inventory
npm run check:lighting
npm run check:site
npm run build
npm run preview
```

Node 22 or newer is suitable. Production files are in `dist/`. All runtime model, material and environment assets are served locally; no API key is required. `npm run artifact` prepares an additional `publish/` copy with a JSON model fallback for hosts that cannot serve GLB files.

## Controls

- Building: drag to orbit, wheel to zoom; choose a floor in Block Б, then an apartment.
- Apartment: drag to look, click a clear floor point to walk, or use WASD. Q/E or left/right arrows turn. Touch screens have a joystick.
- Room buttons follow collision checked routes. The tour pauses in each room. Manual input stops it. Escape returns to the building.
- Comfort uses a lower pixel ratio. Detailed adds contact occlusion inside apartments.

## Apartment administration

[Open the owner panel](https://abubakrmmarufov-tech.github.io/3D-one-room/admin.html) to search/filter all 128 residential units, edit public status and optional TJS asking prices, keep recoverable local drafts, export CSV and review changes before publishing. The panel loads separately without the 3D model. The viewer uses the same public availability data and exact apartment links.

Publishing uses an owner-created repository-scoped GitHub token held only in page memory, a conflict-checked Contents API commit and the existing Pages deployment. It is an owner tool; separate staff accounts/private customer records require a dedicated backend. Initial statuses are unknown. Read the concise [Russian usage guide](docs/ADMIN_GUIDE.md), [architecture/research plan](docs/ADMIN_PLAN.md) and [validation record](docs/qa/ADMIN_VERIFICATION.md).

`npm run catalog` regenerates the lightweight admin catalog after an intentional model change. `npm run check:inventory` verifies it against the real model, validates the published inventory and tests permissions, concurrent edits, drafts and stale-data handling. Inventory and single-building showcase checks run before every Pages build.

## Drawings and source integrity

[Upstream baseline](docs/UPSTREAM.md) records the imported repository and GLB hash. The baseline is a historical record. The current GLB has been pruned to Block Б, with its original geometry and placement retained. Corrected web plans are in `src/model/plans.json`; the retained floors use sheet 7. The June sheet is excluded.

The retained web data includes repaired sanitary rooms, apartment ownership, balcony assignment and overhead beams. Furniture orientations are saved in the same data. `scripts/refine-plans.py` reproduces the drawing repair from the local October PDF and extracted `build/plans/` vectors; it requires PyMuPDF, Shapely and NumPy. Private drawings and reference boards are not published.

Blender generation now builds only Block Б. `blender/export_web.sh` also prunes obsolete geometry and refreshes the catalogue. **Re-exporting still overwrites repaired web plans.** Reapply drawing refinement and navigation checks after a re-export. The older full-complex `.blend` is no longer in the current tree. Git history was not rewritten and still contains older versions.

## Validation and limits

`npm run check` checks every interior room in all eight retained layouts, both with and without furniture. It also simulates continuous walking through every room sequence and checks for collisions and stalled movement. Reports are in `docs/qa/`.

Drawing labels and geometry have inconsistencies. In particular, the block Б rectangular kitchen marked 47.41 m² is much smaller geometrically; its original label is retained, and it must be clarified with the architect before commercial use. Some unlabeled or ambiguous rooms use geometry areas. Terrace access is separately recorded in `docs/qa/terraces.json`; unresolved exterior passages are not included in the interior tour. Do not treat displayed areas as certified measurements.

Current single-building and showcase evidence is recorded in [the showcase report](docs/SINGLE_BUILDING_SHOWCASE.md); [earlier verification](docs/qa/VERIFICATION.md) describes the older baseline. Physical mobile devices and all GPU combinations have not been tested.

## Publish

Pushes to `main` deploy `dist/` through `.github/workflows/deploy.yml` to GitHub Pages. Content hashed assets prevent old scripts being reused after a new release. The public viewer is [3D-one-room](https://abubakrmmarufov-tech.github.io/3D-one-room/).

## Assets

See [third-party notices](THIRD_PARTY_NOTICES.md) for Three.js and locally bundled CC0 material maps and HDR environment. Casa Serra was used as a quality reference; its code, assets and branding are not included.

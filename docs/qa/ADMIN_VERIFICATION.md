# Owner panel and interface verification — 16 October 2026

## Scope

Added a separate Russian owner inventory editor, shared public status/price data and buyer filters/links. Refined viewer/admin typography, text hierarchy, spacing, focus states and mobile layouts. Source building geometry and apartment layouts are unchanged. All 288 residential units begin with unknown status; no sales or prices were invented. Hotel А is excluded from the catalog.

## Automated evidence

- `npm run check:inventory`: **13 passing tests**. Exact regenerated model catalog, published JSON validation, strict schemas, default unknowns, price bounds, CSV formula protection, draft restoration/clearing, token rejection/logout, native browser fetch receiver, safe transport errors, unrelated-editor merge, same-unit conflicts, SHA races and dated offline fallback.
- `npm run check`: 32 apartment variants, 166 rooms, **0 unreachable rooms**, **0 furniture route failures**; continuous movement completed for all room sequences.
- `npm run check:lighting`: 960 time samples, dawn/dusk/midnight continuity; service-worker atomic shells, admin navigation, mutable inventory bypass, update reuse, cleanup and failed installation checks pass.
- `npm run check:site`: unchanged 1,107 trees / 30 batches / 310,736 foliage triangles / 144 path lights / no added environment downloads.
- Production build, portable artifact generation and `git diff --check` pass. Vite retains the existing large 3D-entry advisory; the editor is a separate small entry.
- Source GLB SHA256 remains `bdc19f31cf65d157790b207af0c5c0fa48421d2c2472d5b79b83f9e1cbd5853c`.

## Real GitHub API verification

Used the already authenticated owner account on isolated branch `qa/inventory-1792155851196`. Confirmed authenticated read, UTF-8 Contents API write, readback, same-unit conflict rejection, unrelated-unit merge and disconnect. Test commits: `4cf368e6a251e8dfb96712f4d494cdfded07d54b`, `6e16eca0f3f4699ccc18ce6a75239aa5f0e06eb9`. The temporary branch was removed. **Main/public sales data was not changed by these tests.** No credential was printed, saved in the test report or entered into browser automation.

## Browser evidence

Performed through the in-app Chromium browser against the production build and a local-only API fixture (`scripts/admin-qa-server.mjs`, loopback port 4179). The fixture and its dummy credential are not built or deployed.

- Correct identity: block Б / floor 12 / №57 / `B12-0` / 2 rooms / 125.08 m²; preview link contains that exact ID. Block В has its independent numbering.
- Filter combinations, search, no-results state and pagination work.
- Negative price rejected; decimal comma accepted. Draft marked separately from published data; reload restores it without restoring login.
- Review shows old/new values and exact block/floor/number. Cancel preserves changes. Publish first reports saved/pending and then confirms only after the public JSON becomes visible.
- A second editor's change to the same apartment stops publication and leaves the draft intact.
- Filtered CSV actually downloaded with UTF-8 BOM and one data row. Draft JSON download, cancellation and file restoration work.
- Keyboard: editor starts on status, authentication on the token field; Escape closes dialogs, restores the triggering control, and visible focus outlines remain present.
- Offline emulation shows the saved-copy warning; restoring the network and refreshing clears it.
- Desktop, 768 px tablet and 375 px phone layouts inspected. Phone/tablet cards avoid a horizontally clipped action column; no body overflow at tested widths. Dialog fits 375×812. Buyer panel checked at 375×812; compact room drawer, apartment entry and indoor time-of-day controls still work. No viewer console errors observed in that session.
- Admin resource timing listed only its scripts, CSS and inventory JSON, without model/textures. Opening admin alone does not register the viewer's service worker or fetch the model.

The native browser run caught an unbound `fetch` invocation missed by initial mocked tests. It was corrected, retested through successful publication and covered by a regression test.

## Weight and visual checks

Admin HTML + JavaScript/shared reader + CSS total approximately **19.1 kB gzip**, before transport headers and inventory JSON. No downloaded fonts, UI framework, chart library or external editor service. Viewer initial JavaScript adds about 3.7 kB gzip relative to the preceding release. The 6.5 MB building model is unchanged and remains exclusive to the viewer.

Primary text/status token contrast ratios: body 13.00, secondary 5.77, accent 6.18, available 6.46, reserved 6.10, sold 6.25, unknown 5.37, primary button 14.13. These checked pairs exceed 4.5:1; this is not a complete accessibility certification. Status includes text in addition to color. Reduced-motion overrides are shared. New admin has no prior visual baseline, so pixel comparison is inapplicable; layout/readability were inspected directly.

## Operational limits

Owner must create and enter their own repository-scoped fine-grained token. Real browser login using an owner's secret was deliberately left for the owner; browser flow used only the local fixture, and real API behavior was separately verified on the temporary branch. This release does not create credentials, separate staff accounts, a private CRM, customer records, transactional reservations or a real-time sales guarantee.

Pages publication can take longer than 1–3 minutes; the UI distinguishes a saved commit from confirmed public data. Repository history is the audit trail. Public data may be stale offline and is labeled accordingly. Physical mobile hardware, every GPU/browser combination and field Core Web Vitals have not been tested. First-time 3D loading and shader preparation still require substantially more work than the editor. Keep claims within these measured limits.

Public release URLs: [viewer](https://abubakrmmarufov-tech.github.io/3D-one-room/) and [owner panel](https://abubakrmmarufov-tech.github.io/3D-one-room/admin.html). Public deployment/browser verification is recorded in the release handoff after the Pages workflow completes.

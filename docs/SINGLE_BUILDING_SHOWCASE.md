# Single building and client showcase

## Plan

Retain residential Block Б (B), its source position and October floor plans. Remove hotel А and residential Block В from the delivered GLB, apartment data, selectors and inventory catalogue. Keep the shared retail podium and landscape. Prune unused mesh buffers rather than hiding the removed towers at runtime. The older full-complex Blender file is moved outside the published repository; Git history is not rewritten.

Use B12-0 (floor 12, navigation apartment 57) as the client presentation. Upgrade its living room with rounded upholstery, a woven rug, stone and walnut furniture, decorative objects, a pendant and a working floor lamp. Use actual geometry and shared materials; no remote render service or mandatory asset download. All furnishings are a design proposal, not an approved specification.

Provide a Russian showcase entry button. Route to a collision-safe standing point with a deliberate view of the seating group. Preserve ordinary apartment entry, manual movement, room navigation and time-of-day controls. Extra furnishings load only with the active showcase apartment.

## Acceptance

- GLB contains only tower B, with no orphaned A/V meshes; B placement and floor levels unchanged.
- Exactly 128 apartment IDs on 16 residential floors; no A/V entries in the published plans/catalogue.
- Every retained room remains reachable with furniture; the showcase route completes without collision.
- Verify daytime, sunset and night inside the room; test desktop, narrow mobile and offline startup.
- Record actual payload and rendering costs. Do not call procedural WebGL output photorealistic or guarantee performance on untested devices.

## References

The supplied pipeline report's useful local-browser ideas are reusable apartment layouts, richer materials, controlled lighting, deliberate camera presentation and bounded asset loading. Its UE5/Pixel Streaming claims are not requirements for this project: server rendering would introduce a network/GPU dependency contrary to the user's offline/slow-network goal.

Model cleanup uses the official [glTF Transform I/O](https://gltf-transform.dev/modules/core/classes/NodeIO) and [prune](https://gltf-transform.dev/modules/functions/functions/prune) APIs.

## Implemented and verified — 17 October 2026

- Retained B only: 128 apartments, 16 residential floors, eight source layouts. Hotel A and residential V geometry, pick volumes and their catalogue/plan entries are absent from the delivered GLB and current web data.
- GLB: **6,513,108 → 4,417,196 bytes (32.18% smaller)**; 171 nodes and 44 meshes. Unreferenced meshes/buffers were pruned. The old full-complex Blender file and two reference renders are kept locally outside the current repository tree. Older Git commits remain recoverable and public history has not been purged.
- Compared all 162 retained B nodes against commit `f4bab24d3455545f1e7142f536fac6656b39601b`: positions, indices, UVs, world transforms, floor metadata and numerical plan values are unchanged. Re-encoding changed 192 signed-byte normal components by one quantization step; no position changed. [Source comparison](qa/source-preservation.json).
- B12-0 living room has 90 furnishing components, merged with the active apartment into **35 meshes / 70,089 triangles / 6,709,400 geometry bytes**. The finer curves are used only for showcase furnishings. Added textures are generated locally; no extra asset download is required. Curved window rails follow the imported glazing ribbon.
- Russian overview/apartment buttons and `?apt=B12-0&room=living` open the living room at a collision-safe standing viewpoint. Normal apartment links still open their plan; ordinary walking still starts at the entrance. Room navigation returns to the deliberate living-room view.
- `npm run check`: 42 rooms in eight retained layouts, furniture clearance and continuous motion passed. `npm run check:showcase`: all seven rooms with the special furniture passed, model cleanup/catalogue/curved window and actual geometry budgets passed. `npm run check:inventory`: 13 passed. Daylight continuity (960 samples), atomic offline cache/update/failure scenarios and site geometry budgets passed. Production build and `git diff --check` passed.
- Browser: production build entered B12-0 through the deep link, routed from the living room toward the kitchen, hid the room panel after selection, and showed no console errors/warnings. The admin summary shows 128 units and only Block Б. Desktop 1280×720 and emulated mobile 390×844 were inspected. Day/sunset/night change both the sky outside and room lighting; the retained facade glows at night.
- Offline browser reload entered the showcase with the network disconnected after the release cache had completed (22 cached entries). Inventory correctly used its dated saved-copy message. Connectivity and viewport overrides were restored after the checks.
- A 60-frame sample in this desktop browser's Comfort mode measured a 34.3 ms median and 50.1 ms p95. These are environment-specific observations, not a 60 fps claim or a physical-phone benchmark. Detailed mode costs more GPU work. First model/shader preparation in this environment took about 11 seconds; the initial online download is still required. The room is an improved procedural design proposal, not photographic output or an approved construction/sales specification.

Screenshots are saved in the task's local `outputs/` folder: `showcase-sunset.png`, `showcase-mobile-night.png`, `showcase-offline.png` and the final public showcase capture. These are actual browser captures, not rendered marketing mockups.

Final movement review added collision coverage for the oval coffee tabletop beyond its narrower pedestal. The showcase check explicitly tests that overhang and reruns all seven routes.

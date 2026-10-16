# Surroundings research and implementation plan

Date: 2026-10-16. Baseline release: 9936050. This plan was written before implementing the surroundings changes.

## Evidence and applicability

All seven pages of the supplied PDF were extracted and visually reviewed. It is reference material, not project instructions. Its 20-day timeline, staffing, conversion figures, cloud costs and creator frame-rate claims are not independently established project estimates and are not acceptance criteria.

| PDF idea | Evidence / project fit | Decision |
| --- | --- | --- |
| Unreal Pixel Streaming | Epic requires a running packaged Unreal application, suitable encoder GPU and signalling infrastructure. A streamed viewport needs a continuing connection. | Keep the existing local Three.js renderer and static GitHub Pages deployment. A server migration would conflict with the current offline requirement and needs a separate production scope. |
| Reuse apartment layouts | Existing viewer already derives 288 units from 32 corrected variants, with floor-specific exterior elevation. | Preserve the approved October plans, apartment IDs and hotel. |
| Progressive textures and baked detail | CarloBu describes an optimized 70k polygon apartment and progressive texture loading. Three.js supports roughness, normal and baked light/AO maps; baked lighting needs suitable additional UVs. | Retain progressive 512px maps. Add procedural surface detail without downloading new large assets. Do not claim Cycles GI baking without a bake/UV authoring pass. |
| Rich nearby context, simpler distant context | Sound visual hierarchy, but no verified GPS survey or real capture was supplied. | Enhance the existing source site, vegetation positions, river and context materials. Keep distant forms opaque and depth stable. Do not invent surveyed city geometry or a geographic solar study. |
| Splatting / photogrammetry | Needs captures of the actual existing environment. A floor plan cannot provide those captures. | Hold pending real capture and rights. Do not replace navigable planned rooms with guessed splats. |
| Many dynamic lights | UE MegaLights/DLSS are engine-specific, not switches available in this WebGL application. | Reuse the shared day/night clock, emissive fixtures and batched ground light pools; avoid adding dozens of shadow-casting lights. |

Primary verification sources:
- [Epic Pixel Streaming setup](https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-with-pixel-streaming-in-unreal-engine)
- [Three.js instancing](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js PBR materials](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- [CarloBu's first-person account](https://discourse.threejs.org/t/interior-virtual-tour-demo-with-bananas/80292)
- [GRAFF product](https://graff.estate/) (marketing context, not an independent benchmark)

## Current gaps

- 1,107 instanced trees use solid faceted crown blobs and open cones. The silhouette is artificial and the geometry is expensive at a distance.
- Site surfaces have colour textures but limited relief, joint depth or variation in their reflection.
- Distant context consists of plain opaque massing. It must remain stable through windows; fabricated geographic detail would be misleading.
- Existing lamp fixtures glow at night, but the adjacent paths remain visually unlit.
- Plants inside apartments use stacked ellipsoids. They need smaller, individually shaped leaves without expanding furniture collision footprints.

## Implementation order

1. Replace generated site tree crowns with seeded cutout foliage clusters and visible branching, keep original tree locations and dimensions, and use fewer clusters for distant trees. Batch repeated geometry and preserve opaque depth writes.
2. Add shared material-scale relief and roughness variation to existing paving, asphalt and river-bank stone. Add subtle vertical surface variation to context massing without changing its footprint or implying real facade details.
3. Derive warm, soft path-light pools from existing lamp geometry; render them in a shared batch, tied to the same night factor. Add no new runtime shadow lights.
4. Improve apartment plant silhouettes within their existing footprint. Preserve navigation paths and floor polygons.
5. Review daytime, sunset and night from aerial and apartment viewpoints; review narrow screens, quality switching, console logs, cold build size and cached offline reload. Compare geometry counts, not just screenshots. Fix material/shader issues before publishing.

## Budgets and acceptance

- No additional external asset requests; generated textures stay in the client. Preserve the source GLB hash and hotel architecture.
- Tree triangle cost should fall materially from the baseline. No per-tree animation or per-frame matrix updates; distant geometry uses lower fixed detail without camera-triggered popping.
- Keep the existing comfort/high quality and adaptive pixel limits, progressive loading and atomic offline cache.
- Room list starts closed and opens on demand; shared time controls remain usable at 375, 768 and desktop widths.
- Build, navigation/furniture/motion checks and daylight/offline lifecycle checks pass. No shader or console errors in tested routes.
- Report measured limits honestly: first uncached model transfer still needs network; the 6.5 MB model takes time on slow links. Emulator checks do not establish frame-rate guarantees on every physical device.

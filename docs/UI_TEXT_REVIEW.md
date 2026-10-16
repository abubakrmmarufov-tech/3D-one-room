# Text and placement review

## Scope and approach

Review the Russian viewer and inventory interface on desktop, narrow portrait and short landscape viewports. Keep the October source polygons, areas, apartment IDs and sales data unchanged. Use local fonts and no additional downloads.

| Surface | Finding | Implementation |
| --- | --- | --- |
| Apartment plan | Full room names and areas collide in small rooms; rooms below 3.5 m² disappear | Numbered markers with collision checks, leader lines where necessary, and an HTML room key containing every room and terrace |
| Plan boundary | Rectangular clipping reveals neighboring apartments | Clip walls to this apartment and its terraces |
| Apartment details | Technical IDs compete with the apartment number; repeated location text | Separate location, apartment number, sales status, plan and specifications |
| Overview | Long display heading; three cramped statistics; action says apartment but selects a floor | Short heading, two meaningful statistics, action labeled “Выбрать этаж” |
| Floor choice | Small secondary text; persistent controls obscure the phone view | Readable floor labels, optional mobile sheet, independent scrolling and a clear close action |
| Scene labels | Fixed collision estimate ignores actual text size and panels | Measure visible label rectangles and exclude occupied interface areas |
| Hover text | Tooltip can leave the lower or left viewport edge | Clamp using its measured dimensions |
| Walkthrough | Room list, tour action and help have inconsistent text sizes | Consistent room hierarchy, separate tour row, optional panel; visible touch controls |
| Time and quality | Small control text; ambiguous automatic-cycle action | 44 px controls, explicit action and accessible quality label |
| Notes and feedback | Some rules reduce text to 8–11 px | Shared 12 px minimum for supporting viewer text; readable wrapping and contrast |
| Inventory | Tiny table/card labels and mobile footer; broad all-caps eyebrows | 12 px supporting labels, sentence case, wrapping and 44 px actions |

## Acceptance

- All eight apartment layouts: every marker and key entry present, finite positions, inside the canvas, no marker overlap at supported card sizes.
- Source geometry/areas untouched; repeated hidden-canvas redraws do not grow the drawing buffer.
- Browser review: overview, floor choice, apartment detail, time controls, walkthrough rooms, inventory and edit dialog; portrait and landscape widths.
- No clipped visible text, horizontal page overflow or overlapping plan labels in reviewed states.
- Build and existing inventory/showcase checks; publish to GitHub Pages and verify the served asset versions.

## Verification — 17 October 2026

- `check:ui`: eight source layouts at ten card sizes (80 cases), with every room/terrace present, no overlapping markers and unchanged areas. Twelve hidden redraws at DPR 2 retain a 512 × 460 drawing buffer.
- Browser review covered 1280 px desktop; 390, 360 and 320 px portrait; and 844 × 390 landscape. Apartment № 57 and the larger № 62 plan, floor previews, room navigation, time controls, inventory and its edit dialog were inspected. The edit dialog was cancelled without changing sales data.
- At 320 px the room key uses one column; wider cards use two. The short landscape layout uses a scrollable side drawer. No horizontal page overflow was observed. Opening time controls closes selection/room panels; opening room controls closes time controls. These behaviours were exercised in the browser.
- Actual browser capture: task `outputs/plan-text-320.png`. Additional release captures are retained alongside it.
- Navigation/motion, showcase geometry, inventory, daylight/offline and site checks passed; production build passed. The deployment workflow also runs navigation/motion and plan-label checks before publishing.

Browser viewport checks do not establish physical-device performance. The final public URL is refreshed and its served viewer asset is compared with the release build after deployment.

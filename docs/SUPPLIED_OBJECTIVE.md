- Features: The outer wall follows a sweeping quarter-circle/elliptical curve from (X = 13.7 m, Z = -12.5 m on Axis 39) curving smoothly around the northeast corner down to (X = 20.0 m, Z = 0.0 m on Axis Б'). Floor-to-ceiling curved glass curtain wall with dark bronze mullions, radial structural columns, custom curved modular bouclé sofa following the arc of the room, low travertine coffee table, sculptural lounge chairs, media/fireplace monolith on the interior wall.
5. Terrace 05 — The Wrap-Around Sky Terrace (Видовая терраса на уровне +75.000 м)
   - Bounds: 1.80 m wide curved cantilevered balcony wrapping outside the curved glass curtain wall of Room 04 (11.00 × 1.80 m · 19.8 m²).
   - Features: Curved white horizontal slab band and vertical architectural louver balustrade (matching the Shakhrofar facade elevation drawings), outdoor lounge chairs, and a breathtaking late-afternoon golden-hour skyline view 24 floors up.

EXACT CAMERA PATH, TURNS & SCROLL CHOREOGRAPHY (0% TO 100% SCROLL):
- 0% – 12% Scroll (The Flat Architectural Sheet):
  - Camera is positioned straight above the center of the plan at (X = 10.0, Y = 85.0, Z = -6.25), looking straight down at (10.0, 0.0, -6.25) with a narrow FOV (~14°) so perspective foreshortening is near zero—it looks 100% like a flat 2D printed CAD sheet on warm archival paper (#F5F2EB).
  - CAD overlays visible in the 3D scene: circled grid axes (Д', Г', В', Б' and 37, 38, 39), extension lines, dimension ticks ("7000", "6700", "6300", "20000", "6000", "6500", "12500"), Cyrillic + English room stamps, door swing arcs, and the "ШАХРОФАР · Блок В-24 · План 24-го этажа · М 1:200" title block.
  - All 3D geometry is rendered in crisp black/charcoal architectural ink lines on paper.
- 12% – 25% Scroll (The Walls Rise & Camera Drops to the Front Door):
  - The horizontal section cut plane rises from 0.05 m to full 3.30 m height as the walls extrude upward out of the drawing.
  - The camera swoops down in a smooth spline arc to eye height (Y = 1.65 m) right at the entrance threshold at (X = 10.0, Y = 1.65, Z = 0.8), looking north (Yaw = 0°, Pitch = 0°) through the open front door into Room 01.
- 25% – 40% Scroll (Walk into Room 01: Entrance Foyer & Gallery):
  - Camera glides forward to (X = 10.0, Y = 1.65, Z = -2.0).
  - Material wave #1 sweeps radially across Room 01: black ink lines dissolve into warm wide-plank oak flooring, honed travertine walls, and soft warm downlighting, while Room 02 ahead remains a crisp black-ink wireframe drawing on paper.
- 40% – 58% Scroll (Walk into Room 02: Kitchen & Dining + Glance Left at Room 03 Master Suite):
  - Camera advances north into the Kitchen & Dining Studio to (X = 10.2, Y = 1.65, Z = -6.8).
  - Camera smoothly pans 35° to the left (west, looking toward X = 3.5, Z = -9.0) as the material wave sweeps across Room 02 and Room 03 (revealing the stone kitchen island, walnut joinery, dining table, and Master Bedroom Suite through the open portal), while the massive Curved Corner Living Room to the east still stands in stark architectural line-drawing mode.
- 58% – 82% Scroll (Camera Turns Right into the Hero Room 04: Grand Curved Corner Living Room):
  - Camera executes a cinematic 95° clockwise turn to the right (east/northeast) and glides through the wide portal into the Grand Curved Corner Living Room, traveling along the curve from (X = 13.5, Y = 1.65, Z = -7.5) to (X = 16.5, Y = 1.65, Z = -5.5), looking across the sweeping curved glass curtain wall toward (X = 19.5, Y = 1.60, Z = -9.5).
  - Material wave #3 sweeps dramatically across the entire 61.8 m² curved hall: the wireframe mullions, curved bouclé sofa, travertine tables, and fluted columns transform into rich photorealistic PBR materials bathed in golden-hour late-afternoon sun streaming through the curved facade, casting long warm shadows across the oak floor.
- 82% – 100% Scroll (Step Out onto Terrace 05: The Wrap-Around Sky Terrace):
  - Glass sliding panel parts open; camera glides out onto the curved balcony to (X = 18.2, Y = 1.65, Z = -8.5), slowly panning along the curved balustrade overlooking the golden-hour skyline at +75.000 m elevation.

CASA SERRA UI & HUD OVERLAYS (MATCH THE EXACT WEBSITE VIBE):
- Top-left editorial header: "ШАХРОФАР · Сим-Сим · Блок В-24"
- Opening hero typography overlay (fades on scroll): "Every residence starts as a plan. A panoramic sky residence of 186 m² on the 24th floor. Scroll, and walk into the drawing."
- Sheet metadata table in the corner: Project: Sim-Sim (Сим-Сим) | Drawing: 24th Floor Plan (Блок В-24) | Scale: 1 : 200 | Elevation: +75.000 m | Sheet: АР-8.
- Interactive Room Spec Cards that appear and update as you enter each room ("Room 01 / The entrance gallery / 7.00 × 3.20 m · 22.4 m² · ceiling 3.30 · open file +", up to "Terrace 05 / The sky terrace / 11.00 × 1.80 m · 19.8 m² · +75.00 m elevation"). Clicking "open file +" opens a sleek architectural spec drawer with material swatches and CAD detail notes.
- Bottom progress HUD bar: 01  02  03  04  05 clickable room jump buttons + 00 / 05 rooms counter + live camera elevation/coordinates readout.

AUTONOMOUS SELF-LOOPING WORKFLOW (MANDATORY):
1. Do NOT stop after proposing a plan and do NOT ask the user any questions. If any ambiguity arises, choose the most architecturally authentic, visually impressive solution yourself.
2. Build the complete application end-to-end.
3. Start a local server and verify the running page (using headless browser / Playwright / Puppeteer or code verification if available):
   - Check console for zero WebGL, shader, Three.js, or GSAP errors.
   - Verify the 0% scroll state looks like an authentic 2D architectural CAD blueprint with legible grid circles (Д', Г', В', Б', 37, 38, 39) and millimeter dimensions (7000, 6700, 6300, 20000, 6000, 6500, 12500).
   - Verify the wall extrusion, camera drop to 1.65 m eye height, smooth spline navigation through Rooms 01 -> 02/03 -> 95° turn into Room 04 -> Terrace 05, and the ink-to-PBR material wave transition so that upcoming rooms remain line drawings until the camera arrives.
   - Keep iterating and refining the lighting, furniture detail, shader transitions, camera easing, and UI polish in a loop until the result is completely bug-free and museum-grade.
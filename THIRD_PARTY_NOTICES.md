# Third-party notices

The production application bundles Three.js 0.183.2 and its addon modules. The full MIT license is included in `licenses/THREE-LICENSE.txt` and in the standalone HTML. Three.js copyright belongs to its authors.

Vite 7.3.7, Playwright Core 1.64.0 and axe-core 4.14.0 are development tools, installed through the pinned npm lockfile. Their package licenses remain in their npm distributions. axe-core is used only by browser audits and is not shipped in the application. Browser binaries and `node_modules` are not included in the source archive.

CPU analysis used the bundled `@napi-rs/canvas` 0.1.100 runtime (MIT). It is not part of the production application or source archive.

The local build workspace retains unchanged scroll-craft engine workflow references. They are excluded from the delivered source archive and runtime bundle; the application does not import or require them.

The concept SVG, icon, scene geometry, furniture, procedural stone textures, city, terrain, and interface code were authored for this task. No skyline survey, paid generated media, or web fonts are included. Fonts use the browser's installed system fonts. The authored project is private with no public software license selected.

Locally bundled material maps are CC0-1.0 assets from Poly Haven. Their asset-specific sources, original download URLs, authors, byte counts, and SHA-256 pins are recorded in `docs/material-assets.json`. See [Poly Haven's asset license](https://polyhaven.com/license).

- [Wood Floor](https://polyhaven.com/a/wood_floor), Dimitrios Savva: diffuse, OpenGL normal, and roughness maps.
- [Natural Walnut Veneer](https://polyhaven.com/a/natural_walnut_veneer), Jenelle van Heerden: diffuse, OpenGL normal, and roughness maps.
- [Wool Boucle](https://polyhaven.com/a/wool_boucle), colormass (photography), Rico Cilliers (processing): OpenGL normal and roughness maps. The colored source fabric is not used; the material uses an authored ivory base color.

- [White Plaster 02](https://polyhaven.com/a/white_plaster_02), Rob Tuytel: OpenGL normal map.
- [Rough Linen](https://polyhaven.com/a/rough_linen), colormass and Rico Cilliers: OpenGL normal and roughness maps.

Casa Serra was inspected as a design and engineering reference. Its published scripts, assets, branding and text are not included in this application.

Assets were selected through the Poly Haven public API during local preparation. The application serves the downloaded maps locally and does not integrate with or call the live API at runtime.

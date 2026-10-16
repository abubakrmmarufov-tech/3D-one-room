# Third-party notices

The application bundles Three.js 0.170.0 and its addon modules under the MIT license. The full license is in `licenses/THREE-LICENSE.txt`. Vite 5.4.10 is a development dependency; its license remains in the npm package. Versions are pinned by `package-lock.json`.

The original building/site model and Blender sources were imported from [nurovvv/shahrofar-3d](https://github.com/nurovvv/shahrofar-3d) at commit `24498d1bffdaf3af5b611a32b0cc778f746a7763` for the owner's coworker project. That import does not establish a general public reuse license for the architectural material. See `docs/UPSTREAM.md`.

The locally bundled material maps below are CC0 assets from Poly Haven. Asset sources, download URLs and SHA-256 pins are in `docs/material-assets.json` and `docs/landscape-assets.json`. See [Poly Haven's asset license](https://polyhaven.com/license).

- [Wood Floor](https://polyhaven.com/a/wood_floor), Dimitrios Savva: diffuse, OpenGL normal and roughness.
- [Natural Walnut Veneer](https://polyhaven.com/a/natural_walnut_veneer), Jenelle van Heerden: diffuse, OpenGL normal and roughness.
- [Wool Boucle](https://polyhaven.com/a/wool_boucle), colormass and Rico Cilliers: normal and roughness; the base colour is authored.
- [White Plaster 02](https://polyhaven.com/a/white_plaster_02), Rob Tuytel: normal.
- [Rough Linen](https://polyhaven.com/a/rough_linen), colormass and Rico Cilliers: normal and roughness.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock): diffuse, OpenGL normal and roughness.
- [San Giuseppe Bridge](https://polyhaven.com/a/san_giuseppe_bridge), Andreas Mischok: 2K HDR environment inherited from the coworker's assets.

The viewer serves these files locally and does not call Poly Haven's API at runtime. Fonts use installed system fonts.

Casa Serra was inspected as a design and engineering reference. Its published scripts, assets, branding and text are not included in this application.

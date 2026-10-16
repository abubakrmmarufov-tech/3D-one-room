# Floor and apartment preview

Implemented: floor hover/focus bands before cutaway, exact apartment hover/selection outlines, persistent Russian block/floor/number context, and a clickable floor map from the existing architect polygons. Mouse, keyboard Enter/Space and ordinary tap selection keep interior entry behind the explicit button. No new dependencies, models, textures or external requests.

Verified locally: В floor 12 keyboard preview; V12-0 map selection and exact selected polygon; Б floor 12 map opens B12-0 / №57 / 125.08 m²; 375 × 812 responsive layout has no horizontal overflow; entering that apartment hides exterior selection context and room navigation works; browser console has zero errors. All 36 floor maps / 288 selections have finite geometry and exactly one selected unit; filtered units are disabled. Inventory 13 tests, lighting/offline checks and production build pass. Existing large-viewer-chunk advisory remains. Physical touch devices and every GPU/browser combination are unverified.

Customer demonstration candidate: Б / floor 12 / №57, living room (49.15 m² per model). Useful for layout, scale and room navigation. Furniture and shading remain stylized; this is not a photorealistic final interior or an approved sales drawing.

# Inventory administration and interface plan

## Research and decision (16 October 2026, before implementation)

The viewer is a static GitHub Pages site. Availability must be shared data, not a localStorage-only demo. A GitHub Contents API editor fits the existing deployment: the repository is already the source of truth, an authenticated edit produces a recoverable commit, and the existing Pages workflow publishes the data. No separate paid service is required. Supabase with Auth and row-level security is a future option for a larger sales team, private customer information or immediate multi-user transactions; this version does not collect customer information or process sales.

Primary references:

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Contents API: write permission and SHA conflict control](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).
- [Fine-grained access tokens and repository selection](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Owner-scoped fine-grained tokens are recommended. Outside collaborators have documented fine-grained-token restrictions; do not promise all staff can use that flow.
- [GitHub REST CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests).
- [API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), evaluated as a database alternative.

## Product behavior

1. A separate lightweight `admin.html` opens without the 3D model. It lists the exact 288 existing apartment IDs, split between В and Б; hotel А is excluded.
2. Every unit defaults to **Статус не указан**, never a guessed sale/availability claim. Explicit states are Свободна / Бронь / Продана. Optional asking prices are public, in TJS, and blank by default.
3. Search and block/floor/room/status filters, summary counts, CSV export, apartment preview links, local recoverable drafts and a review-before-publish dialog.
4. GitHub authentication uses an owner-created repository-scoped token, held only in page memory. No token is written to browser storage, URLs, analytics, exports, logs or source. Logout/reload removes it. Drafts contain only public status/price changes, never customer data.
5. Publish fetches the current repository file, detects conflicting changes to edited units, merges unrelated edits and writes with the current SHA. A race returns a conflict rather than silently overwriting. GitHub enforces permissions. A commit means **saved to repository**, not already live: the UI tracks the public JSON until deployed.
6. Public availability is fetched with a timeout separately from rendering, refreshed while visible, and falls back to dated cached data with an explicit stale label. The service worker must not freeze inventory behind the 3D shell cache.
7. The current model's apartment numbers and areas remain model identifiers / drawing data, not certified commercial measurements. Real sale statuses must be supplied by the owner.

## Visual direction

Domain: residential architecture and a small owner-operated inventory desk. Audience: buyers and the project owner. Tone: calm, precise and professional. Mood: considered. Motion: restrained 160–220 ms opacity/transform, respecting reduced motion. Layout sequence: architecture canvas with compact selection panels → legible apartment details; admin masthead → summary → filters → table → focused editor and publication review.

Use warm ivory surfaces, charcoal text, a restrained bronze accent and readable labeled status colors. Local system sans-serif for controls and a Cyrillic-capable local serif stack for editorial headings; no font download. Shared typography, spacing, borders, focus and status tokens. Smallest meaningful text at least 11–12 px, ordinary controls 13–14 px, touch controls approximately 44 px. Status always has text, not color alone. Dialogs have keyboard focus management. Preserve camera, clock, rooms toggle and navigation behavior.

## Acceptance

- Schema rejects unknown apartment IDs, invalid states/prices, unexpected fields and oversized input; CSV cells cannot become spreadsheet formulas.
- Unit tests cover draft recovery, validation, concurrent editors, auth failures, publication acknowledgement, stale/offline data and inventory cache behavior.
- Browser checks cover owner editing with test-only API responses, review/cancel/publish flow, filters, preview links, responsive layouts, keyboard dialogs and no secrets in storage.
- Existing navigation, lighting/offline, surroundings checks and production build remain passing. Test real GitHub write/conflict behavior on an isolated temporary branch, not live sales data.
- Deploy and verify viewer/admin on the actual public origin; publish concise Russian usage instructions and candid setup/latency limits.

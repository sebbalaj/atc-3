# Vector Control: ATC

A planned touch-first portrait air-traffic-control simulator built with TypeScript, Phaser 4, Vite, and PWA packaging.

## Current status

Tasks 1–3 passed owner phone testing. Task 4 adds the first active traffic: a deterministic 30 Hz fixed-step simulation, seeded non-overlapping light-prop spawns, continuous sector-crossing movement, lifecycle removal, pooled procedural aircraft/labels, responsive normalized coordinates, and synchronized mobile flight strips. Routing, selection, landing, fuel, and collisions remain intentionally unavailable until their dedicated tasks.

Task 4 is awaiting owner phone verification before Task 5 begins. The airport overlay now uses stronger adaptive contrast and viewport-scaled markings. A safe optional landscape path remains scheduled for release hardening.

## Commands

- `npm install` — install pinned dependencies.
- `npm run dev` — serve a development build on the local network.
- `npm run typecheck` — run strict TypeScript checks.
- `npm run build` — create the production PWA in `dist/`.
- `npm run preview` — serve the production build for verification.
- `npm run assets:fetch` — download and unpack optional CC0 placeholder art.
- `npm run assets:map` — fetch and provenance-stamp the selected NASA GIBS map image.

An installable PWA requires HTTPS in production (localhost is accepted for development). Double-clicking `index.html` with a `file://` URL is not a supported deployment mode.

## Development workflow

Implement and validate exactly one task from `.kiro/steering/07-task-breakdown.md` at a time. Do not attempt the full design in one pass.

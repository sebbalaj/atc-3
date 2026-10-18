# Vector Control: ATC

A planned touch-first portrait air-traffic-control simulator built with TypeScript, Phaser 4, Vite, and PWA packaging.

## Current status

Tasks 1 and 2 passed owner phone testing. Task 3 adds the first real map checkpoint: locally bundled NASA Earthdata satellite imagery, fictional regional-airfield geometry, runway `REG 09/27`, threshold/approach markings, taxiway/apron/terminal details, radar grid/rings/sweep, responsive status console, and an empty flight-strip stack. No aircraft simulation exists yet.

Task 3 is awaiting explicit owner confirmation of the satellite/ATC art direction before Task 4 begins. A safe optional landscape path is recorded for release hardening: it may crop decorative imagery only, never operational airspace, controls, or warnings.

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

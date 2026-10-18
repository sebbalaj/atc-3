# Vector Control: ATC

A planned touch-first portrait air-traffic-control simulator built with TypeScript, Phaser 4, Vite, and PWA packaging.

## Current status

Task 1 passed owner phone testing. Task 2 adds versioned LocalStorage saves, checksum validation, staging/backup/quarantine recovery, pure v0→v1 migration, independently versioned settings, save import/export, best-effort persistent-storage requests, and verified checkpointing before PWA updates. Core ATC gameplay remains intentionally unimplemented.

Task 2 is awaiting owner phone verification of Save Tools before Task 3 begins. Task 3 will provide the satellite-imagery/ATC map checkpoint and requires explicit owner art-style confirmation before aircraft implementation. A safe optional landscape path is recorded for release hardening: it may crop decorative imagery only, never operational airspace, controls, or warnings.

## Commands

- `npm install` — install pinned dependencies.
- `npm run dev` — serve a development build on the local network.
- `npm run typecheck` — run strict TypeScript checks.
- `npm run build` — create the production PWA in `dist/`.
- `npm run preview` — serve the production build for verification.
- `npm run assets:fetch` — download and unpack optional CC0 placeholder art.

An installable PWA requires HTTPS in production (localhost is accepted for development). Double-clicking `index.html` with a `file://` URL is not a supported deployment mode.

## Development workflow

Implement and validate exactly one task from `.kiro/steering/07-task-breakdown.md` at a time. Do not attempt the full design in one pass.

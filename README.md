# Vector Control: ATC

A planned touch-first portrait air-traffic-control simulator built with TypeScript, Phaser 4, Vite, and PWA packaging.

## Current status

Task 1 provides the Phaser-powered portrait shell and accessible mobile main menu. It includes orientation/interruption pause, explicit resume, safe-area diagnostics, retryable first-gesture audio, install guidance, offline/update readiness UI, settings, and placeholder New Shift/Save Tools actions. Core ATC gameplay and persistence remain intentionally unimplemented.

Task 1 is awaiting owner phone verification before Task 2 begins. The satellite-imagery/ATC map style will receive a separate playable confirmation gate in Task 3 before aircraft implementation.

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

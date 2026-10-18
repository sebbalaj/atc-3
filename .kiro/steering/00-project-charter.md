---
inclusion: always
---

# Project charter: Vector Control ATC

## Product promise

Build a readable, low-stress-to-learn but strategically deep mobile ATC simulator. The player directs aircraft by drawing routes on a portrait radar map, lands them at compatible destinations, manages runway occupancy and fuel, and grows an airport network across shifts. The game must feel fair: failures should follow visible warnings and understandable rules, never hidden state or unreliable gesture recognition.

## Approved technology baseline (pending owner sign-off)

- TypeScript 7 in strict mode.
- Phaser 4.2.1 for WebGL/Canvas rendering, scene lifecycle, and unified pointer input.
- Vite 8 with `vite-plugin-pwa` and Workbox-generated offline cache.
- DOM/CSS for accessibility-sensitive menus and overlays; Phaser canvas for radar action.
- Web Audio API for procedural effects. Browser speech synthesis is an optional enhancement, not a gameplay dependency.
- Versioned LocalStorage save envelope with migrations, validation, backup, export, and recovery.
- No server, account, analytics, ads, or paid dependencies in the initial release.

## Scope discipline

The exhaustive feature list describes the product direction, not the first playable release. Work proceeds one task at a time with a runnable phone checkpoint after each task. Phase 1 proves touch routing and reliable landing on Map 1. Economy, severe weather, emergencies, and Maps 2–4 remain locked until the core loop is demonstrably fun and stable.

## Non-negotiable quality bars

1. Portrait-first layout from 320×568 CSS pixels upward, safe-area aware and usable one-handed.
2. Aircraft never pause merely because a route gesture started.
3. Valid runway/pad drops snap predictably and land reliably.
4. Selected aircraft remain live-visible in fog; selection never moves the camera.
5. Every rule has a visual state and, where useful, an audio cue; color is never the only signal.
6. Simulation results do not depend on display refresh rate.
7. Target 60 rendered FPS on representative mid-range phones; simulation may use a 30 Hz fixed step with interpolation.
8. Save migrations never intentionally discard recognized progress. Corrupt/unknown data is preserved for recovery rather than overwritten.
9. The game boots and remains playable offline after its PWA shell is installed.
10. No core feature may depend on a remote CDN at runtime.

## Working agreements

- Do not implement the whole game in one request. Execute one numbered task from `07-task-breakdown.md`, verify its acceptance criteria, then wait for play-test feedback.
- Add tests only when the owner explicitly asks; task acceptance still requires deterministic debug scenarios and manual phone checks.
- Balance values live in typed configuration, never scattered magic numbers.
- Core simulation modules must not import Phaser.
- Record changed product decisions in the steering files before implementing contradictory behavior.

## Out of scope until explicitly promoted

True 3D flight physics, free camera movement, multiplayer, backend/cloud saves, real-world airport data, licensed aircraft brands, user-generated maps, and native App Store wrappers.

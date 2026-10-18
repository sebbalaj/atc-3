---
inclusion: always
---

# Step-by-step task breakdown

## Execution rule

Execute exactly one task at a time. At the end of each task: build, open the runnable checkpoint, verify the listed acceptance criteria, summarize files/behavior, and request phone play-test feedback. Do not automatically continue to the next task. A task may be split further when debugging warrants it.

## Phase 0 — Foundation and decisions

### Task 0 — Scaffold and architecture documents (complete)
- Pin TypeScript, Phaser, Vite, and PWA dependencies.
- Configure strict compilation, production bundle, manifest, service worker, portrait metadata, safe-area CSS, asset fetch script, and module layout.
- Document mechanics, architecture, save migration, mobile UX, and decisions.
- Acceptance: clean install/typecheck/build succeeds; no core gameplay exists; owner approves or amends open decisions.

### Task 1 — Mobile shell and main menu (complete; owner phone-approved)
- Boot Phaser in a portrait-safe canvas while keeping menu/settings/install UI accessible.
- Add orientation fallback, safe-area diagnostics, pause-on-background, first-interaction audio unlock, and update-prompt boundary.
- Menu actions: New Shift (placeholder), Continue disabled without save, Settings, Save Import/Export placeholder.
- Acceptance: usable at 320×568 and a tall phone; no page scroll/zoom; landscape pauses with rotate message; offline production shell reloads after first secure visit.

### Task 2 — Save service v1 (current; awaiting owner phone check)
- Implement envelope, runtime validation, atomic staging/backup write, load recovery, settings separation, export/import, and a sample future migration registry.
- Persist menu settings and a placeholder progression record.
- Acceptance: valid save round-trips; malformed primary falls back to backup without overwrite; future schema is preserved/rejected; update flow checkpoints first.

## Phase 1 — First playable routing loop (Map 1)

### Task 3 — Realistic satellite/ATC regional map and radar console
- Draw a simplified but credible regional environment using a subdued satellite-imagery base treatment beneath an aeronautical-chart/ATC overlay, plus airport/taxiway/building geometry, realistically marked runway `REG 09/27`, threshold identifiers, restrained radar rings/sweep, status row, and empty flight-strip stack.
- Use only locally bundled, license-audited imagery or generated satellite-style textures; the game must not depend on live map tiles. Establish normalized layout, resize mapping, and visual hierarchy that keeps operational contacts clearer than terrain detail.
- Acceptance: map reads as realistic satellite imagery blended with civilian ATC rather than arcade neon, remains legible across target portrait sizes, console consumes roughly 25%, and identifiers do not overlap critical controls.
- **Owner art gate:** publish a phone-playable checkpoint and explicitly ask the owner to confirm or revise imagery detail, radar color/opacity, labels, aircraft silhouettes, and overall realism. Do not begin Task 4 until the owner confirms the art direction after trying it.

### Task 4 — Aircraft simulation and spawning
- Add fixed-step simulation, seeded RNG, light-prop entity data, continuous movement, lifecycle, spawn reservation, pooled procedural renderer, labels, and strips.
- No routing yet.
- Acceptance: deterministic movement independent of frame rate; aircraft never spawn overlapping; 100 debug aircraft remain within frame budget; strips track lifecycle.

### Task 5 — Selection and communication
- Implement enlarged aircraft hit targets, strip selection, live selected marker/label, fixed camera, destination highlighting, tap/drag disambiguation, and empty-space deselect.
- Acceptance: reliable one-handed selection without visual enlargement; strip and plane select the same entity; camera never moves; runway requirement is unmistakable.

### Task 6 — Freehand route drawing
- Sample pointer path, finger offset, simplify/smooth/resample, preview validity, commit/cancel commands, route rendering, and look-ahead steering.
- Aircraft continues moving on old route while drawing; accepted path joins its release-time position.
- Acceptance: no midair pause; no backward snap; path follows finger intent; invalid route gives reason and preserves old route; route replacement works.

### Task 7 — Runway capture and reliable landing
- Add end-specific approach funnels, eligibility scoring, nearest-threshold snap, short generated capture segment, wind-compatible end, approach state, threshold crossing, score/despawn, red occupancy lights, and clear timer.
- Acceptance: deliberate drops in the funnel land consistently; no snap to triangle center/longer end; threshold-crossed aircraft cannot collide; strip disappears immediately; runway visibly reopens.

### Task 8 — Separation warnings and spatial hash
- Implement spatial hash, class radii, proximity start/end, collision, synchronized aircraft/strip warning feedback, alarm rate limiting, and runway-phase exclusion.
- Acceptance: pair evaluation is deduplicated; both flights warn; collision behavior matches policy; landed/threshold aircraft are absent; debug density meets budget.

### Task 9 — Phase 1 phone balance pass
- Tune size, speed, turn rate, spawn interval, approach magnetism, occupancy duration, route colors, and touch thresholds from owner play tests.
- Add deterministic scenarios for known prior failures.
- Acceptance: owner agrees basic selection, routing, landing, readability, and pacing feel reliable before scope expands.

## Phase 2 — Runway complexity, radar, and visibility

### Task 10 — Intersecting runway and destination intent
- Add second intersecting runway, shared conflict zones, forced/preferred/any destination rules, clear identifiers, selection reasons, and bonuses.
- Acceptance: legal/illegal/preferred states are obvious on map, labels, and strips; crossings cannot occupy simultaneously.

### Task 11 — Radar contact freshness
- Decouple authoritative position from displayed contacts; update unselected contacts on beam crossing; display contact age/question marks; selected communications stay live.
- Acceptance: radar sweep visibly matters; stale display never changes simulation; selection reveals current position without camera motion.

### Task 12 — Regional fog cells
- Add drifting soft-edged fog regions, terrain muting, hidden contact logic, grey strips, question marks, selected reveal, and reduced-motion treatment.
- Acceptance: only fog-covered regions conceal; map is never globally blank; selecting hidden traffic gives fair live control.

### Task 13 — Wind shifts
- Add active threshold direction, wind UI, warning countdown, 8-second dual-direction transition, new-route restrictions, and grandfathered captured routes.
- Acceptance: direction is clear before/after shift; both ends work only during transition; existing cleared traffic lands.

### Task 14 — Aircraft variety and helipads
- Add generic commercial jet, helicopter, and military classes via data definitions; add runway length/type compatibility, pad capture, direct heli deceleration, and wake emitters.
- Acceptance: each class feels distinct; helipad drops near the pad land reliably from any angle; invalid destinations explain why.

### Task 15 — Phase 2 phone balance pass
- Tune traffic mix, radar period, fog size/speed, wind frequency, destination distribution, fuel reserves, heli capture, and wake warning.
- Acceptance: visibility mechanics are challenging but not perceived as broken; owner signs off before economy/events.

## Phase 3 — Shift progression and economy

### Task 16 — Shift clock, scoring, and reputation
- Implement shift goals/time, landing formula, rate-limited penalties, crash/zero-reputation ending, pause/resume checkpoint, and summary statistics.
- Acceptance: all changes are traceable in UI; no penalty drains per frame; shift reliably completes/fails and restores.

### Task 17 — Economy and upgrade shop
- Add bank ledger and upgrades: radar range, runway length, ILS capability flag, holding automation flag, ground crew, and infrastructure slots. Only activated systems may be purchased.
- Acceptance: purchases validate funds/prerequisites, persist, migrate, and show exact effects.

### Task 18 — Fuel and emergency fundamentals
- Add tuned fuel burn/warnings, mayday engine failure routing, emergency priority feedback, and medical helicopter hospital waypoint requirement.
- Acceptance: emergencies always spawn solvable; strip priority follows spec; fuel creates pressure without unavoidable loss.

### Task 19 — Procedural audio and optional speech
- Complete procedural buses/cues/ambient tension, settings, background suspension, and optional speech acknowledgements with visual fallback.
- Acceptance: works after first tap on target phones; no stuck nodes/queued speech; mute is immediate; gameplay remains understandable silent.

## Phase 4 — Weather and content expansion

### Task 20 — Storm cells and ILS/fog upgrade behavior
- Add path-readable storm hazards with staged consequences; activate ILS benefit during fog and tune warning fairness.
- Acceptance: boundaries and outcomes are predictable; no unavoidable spawn deaths.

### Task 21 — Map 2: Twin Cities
- Two airports, overlapping patterns, type-based constraints, new terrain/content definitions, progression unlock.
- Acceptance: map is data-driven rather than scene-forked; save migration preserves Map 1 progress.

### Task 22 — Map 3: Coastal Hub
- Major airport, offshore pads, hospital/medivac routes, and moving carrier runway with conservative capture rules.
- Acceptance: moving threshold transforms routes correctly and remains touch-readable.

### Task 23 — Map 4: Mega Hub
- Four parallel runways, high-volume traffic, strict wake spacing, advanced ground flow and performance tuning.
- Acceptance: stable frame budget at designed peak; wake/runway conflicts remain readable on phone.

## Phase 5 — Release hardening

### Task 24 — Accessibility, onboarding, tutorial, and landscape fallback
- Guided first shift, contextual help, high contrast, reduced motion, audio controls, install/offline/update education.
- Add the owner-requested landscape **Proceed anyway** path: attempt native portrait lock, then allow a constrained portrait viewport only if no operational content or minimum touch target is cropped. Crop decorative satellite imagery only and retain the rotate prompt on unsafe dimensions.
- Acceptance: a new player can complete first landing without external instructions; the owner confirms the landscape fallback on a phone and no radar, console, warning, or control is hidden.

### Task 25 — PWA release and recovery audit
- Validate icons/manifest, secure hosting, offline cache, version update, save migrations from every fixture, export/import, storage persistence messaging, and phone browser matrix.
- Acceptance: installed app launches offline; upgrade does not lose known saves; unsupported capabilities degrade clearly.

### Task 26 — Final balance and content audit
- Tune economy/traffic/events from observed sessions; validate every map can generate solvable traffic; review asset licenses/provenance and production bundle.
- Acceptance: owner signs off release candidate after phone play test on at least one iOS and one Android class of browser, or explicitly narrows supported devices.

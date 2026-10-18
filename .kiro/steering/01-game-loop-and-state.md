---
inclusion: always
---

# Game loop and state model

## Player loop

1. **Briefing:** Review airport layout, active runway directions, weather, traffic mix, goals, and upgrades.
2. **Control:** Incoming aircraft enter radar coverage. The player selects an aircraft or flight strip and draws/replaces its route.
3. **Monitor:** Track fuel, destination constraints, wake spacing, weather, runway occupancy, and proximity warnings.
4. **Resolve:** A valid route captures an approach, crosses the threshold, leaves airborne collision space, occupies the runway briefly, then scores and despawns. Unsafe separation, fuel exhaustion, or event failures reduce reputation; a collision or zero reputation ends the shift.
5. **Debrief:** Present landings, efficiency, near misses, emergencies, reputation, and revenue.
6. **Invest:** Purchase upgrades and start the next shift/map.

## Runtime state machine

`Boot → MainMenu → SaveSlot/Continue → Briefing → ShiftPlaying ↔ Paused → ShiftSummary → UpgradeShop → Briefing`

Terminal transitions: `ShiftPlaying → IncidentSummary` on collision or reputation reaching zero; `IncidentSummary → Retry | MainMenu`.

A PWA update may be accepted only in `MainMenu`, `Briefing`, `ShiftSummary`, or `UpgradeShop`. During a live shift, show “update after shift” and checkpoint first.

## Authoritative timing

- Render loop aims at 60 FPS.
- Simulation runs fixed 1/30-second ticks with an accumulator and interpolated visuals.
- Clamp a foreground frame delta to 100 ms and cap catch-up steps to prevent a resume spiral.
- On `visibilitychange` to hidden, automatically pause and save a checkpoint. Never simulate elapsed wall-clock time while backgrounded.
- Shift clock advances from simulation time, not `Date.now()`.
- Seeded random streams make debug scenarios reproducible.

## Aircraft lifecycle

`INBOUND → CONTROLLED → ROUTED → APPROACH_CAPTURED → THRESHOLD_CROSSED → RUNWAY_OCCUPIED → LANDED → REMOVED`

Exceptional substates/flags: `LOW_FUEL`, `EMERGENCY`, `PROXIMITY_WARNING`, `RADAR_STALE`, `FOG_HIDDEN`, `MAYDAY`, and `MEDIVAC_PENDING_POI`.

Rules:
- Pointer-down and route drawing do not alter velocity or simulation state.
- A released valid route atomically replaces the old future route from the aircraft’s predicted current position.
- Existing routes remain active while a replacement gesture is being drawn.
- Once `THRESHOLD_CROSSED`, remove the aircraft from airborne separation and weather-destruction systems immediately. It cannot collide with airborne traffic; runway occupancy rules take over.
- The flight strip disappears at `LANDED`, not after the runway unlock animation.
- A captured route is grandfathered through later wind-direction changes.

## Runway lifecycle

`AVAILABLE → RESERVED(optional) → OCCUPIED → CLEARING → AVAILABLE`

- Runway lights are green/white when available, amber when reserved or wind direction is transitioning, and red while occupied/clearing.
- Crossing runways share conflict zones. Occupying one blocks any runway whose physical safety zone intersects it.
- Ground-crew upgrades reduce `CLEARING` duration with a configured floor.
- Initial target occupancy is deliberately short (roughly 2–4 real seconds), to match mobile pacing; exact values are tuned after Task 9 play tests.

## Loss and fairness

A proximity warning must precede a normal separation collision whenever geometry permits. Immediate overlap caused by spawn placement is invalid and must be prevented by spawn reservation. One crash ends the shift. Nonfatal failures reduce reputation with cooldowns so a single prolonged condition does not drain every tick.

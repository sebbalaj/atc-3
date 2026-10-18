---
inclusion: always
---

# Software architecture

## Architectural style

Use a layered, data-oriented architecture with ECS-style simulation, not a framework-heavy generic ECS library. Keep ownership explicit:

- **Domain:** authoritative serializable components, value objects, and pure simulation systems.
- **Application:** commands, events, shift orchestration, pause/update boundaries, and use cases.
- **Presentation:** thin Phaser scenes, pooled game objects, route graphics, DOM/Phaser UI adapters.
- **Infrastructure:** LocalStorage, migrations, asset loading, audio, PWA lifecycle, and browser capability adapters.
- **Content/config:** data definitions and balance values.

Dependency direction points inward. Domain code cannot import Phaser, DOM APIs, LocalStorage, or Web Audio.

## Entity/component model

Entity IDs are opaque numeric/string IDs. Suggested aircraft components: `Transform`, `Kinematics`, `AircraftType`, `FlightIdentity`, `DestinationIntent`, `Fuel`, `RoutePlan`, `ApproachClearance`, `RadarContact`, `Emergency`, `WakeEmitter`, `Renderable`, and lifecycle state. Infrastructure entities use `Runway`, `RunwayEnd`, `Helipad`, `Occupancy`, `WindRestriction`, and `ConflictZone`.

Prefer structure-of-arrays or compact maps for hot numeric data only after profiling. A straightforward typed component store is acceptable for Map 1. Avoid inheritance hierarchies such as one class per aircraft type.

## Ordered fixed-step systems

1. Apply queued player commands.
2. Update event/weather movement.
3. Update route guidance and aircraft kinematics.
4. Burn fuel and evaluate emergencies.
5. Capture approaches and resolve threshold/pad arrivals.
6. Rebuild spatial hash and evaluate separation/wake.
7. Advance runway occupancy/clearing.
8. Update radar contacts and visibility state.
9. Calculate scoring/reputation and lifecycle removals.
10. Publish immutable presentation events/snapshot.

System order is part of the rules and must be documented when changed.

## Commands and events

Presentation emits commands such as `SelectAircraft`, `CommitRoute`, `CancelRoute`, `PauseShift`, and `AcknowledgeUpdate`. Simulation emits domain events such as `AircraftSpawned`, `RouteAccepted`, `ApproachCaptured`, `ProximityStarted`, `ThresholdCrossed`, `AircraftLanded`, and `ReputationChanged`. Use a typed in-process bus drained per tick; do not allow scenes to mutate components directly.

## Route representation

Store accepted routes as sampled polyline points with cumulative arc lengths and metadata identifying player-drawn vs generated capture segments. The presentation may draw a smooth curve, but guidance follows deterministic resampled geometry. Keep route generation utilities pure and isolate Ramer–Douglas–Peucker, spline sampling, nearest-point, tangent, and capture scoring functions under `shared/math`.

## Rendering and pooling

- One authoritative simulation snapshot; renderers interpolate previous/current transforms.
- Pool aircraft sprites/shapes, labels, route graphics, warning rings, question marks, strips, and particles.
- Procedural rendering is the fallback implementation technique, not an arcade art direction: use it to create realistic radar symbology, airport markings, chart layers, weather, and correctly proportioned top-down silhouettes. Optional audited CC0 sprites may replace individual layers.
- Avoid per-frame object allocation, graphics recreation, DOM layout churn, and one timer per entity.
- Keep console updates event-driven or dirty-flagged rather than rebuilding every render frame.
- Use Phaser scale/responsive facilities only for canvas sizing; UI safe areas and orientation fallback are CSS-aware.

## Scene responsibilities

- `BootScene`: capabilities, minimal procedural assets, save load/migration, asset manifest.
- `MainMenuScene`: continue/new/settings/install/update entry points.
- `BriefingScene`: map goals and loadout.
- `ShiftScene`: simulation host, radar renderer, input adapter; no economy policy.
- `SummaryScene`: immutable results.
- `UpgradeScene`: purchase commands against progression state.

Do not create a separate scene for every popup; use UI layers/state where scene transitions are unnecessary.

## Performance budgets

Initial target on representative mid-range mobile hardware:
- 60 rendered FPS, 30 deterministic simulation ticks/second.
- Main-thread p95 frame work below 12 ms during Map 1; below 16 ms under maximum supported load.
- No routine long task over 50 ms during play.
- 100+ simultaneous aircraft should remain technically supportable, though actual map balance may use fewer.
- Spatial hash pair checks should grow near-linearly at ordinary density.
- Production initial compressed shell target under 1.5 MB excluding optional art packs.

Profile before micro-optimizing. Add object pools and spatial hashing from the start because their ownership affects design; defer typed-array conversion and web workers until measurements justify them.

## Error handling and diagnostics

Use invariant assertions in development, structured error boundaries around save/asset loading, and an opt-in debug overlay showing FPS, tick backlog, entity count, pair checks, selected entity state, radar contact age, and route-capture scores. Production must recover to menu from nonfatal content/save errors and offer save export before reset.

## Planned source layout

#[[file:src/game/README.md]]

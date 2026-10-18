---
inclusion: manual
---

# Review of prior prompts and corrections

## Requirements retained

- Portrait mobile touch is the primary platform.
- Draw custom routes from aircraft; aircraft strictly follow accepted routes within class turn limits.
- Aircraft must continue moving while the player draws.
- Route endpoints magnetically capture eligible runway thresholds/pads.
- Landing capture must be generous, direct, and deterministic.
- Once a threshold is crossed, airborne collision ends immediately and runway occupancy begins.
- Occupied runway lights turn red and unlock after a short clear time.
- Flight strips are stacked/full width, contain destination and fuel/contact information, and disappear immediately on landing.
- Selection means communication/live reveal, highlights destinations, and never moves the camera.
- Fog is regional and drifting; hidden contacts show `?`, grey strips, and stale radar information.
- Radar contacts update on sweep except selected live contacts.
- Wind determines active landing direction, allows a short dual-direction transition, and grandfathers captured approaches.
- Terrain must add visual interest without undermining radar readability.
- Deep economy, events, upgrades, and four maps remain part of the long-term design.

## Corrections to ambiguous or risky requirements

- “Make everything 25% speed/smaller” cannot be reproduced without the old build. New measurable pacing and touch-target criteria replace it.
- “Land immediately at the start of runway” is interpreted as immediate gameplay resolution at threshold crossing plus a short non-collidable visual clear sequence.
- A route does not snap to the visual middle of an approach triangle. Candidate scoring targets the nearest eligible runway threshold and minimizes extension cost.
- “Planes flying into storms are destroyed” is too punishing before storm boundaries/navigation feedback are proven. Stage this mechanic from warning/penalty to fatal only after play testing.
- Commercial trademarks are replaced with generic aircraft categories.
- “Mathematically balanced and deeply engaging” cannot be guaranteed before observation. Values are centralized and tuned through staged phone play tests.
- A large concurrent feature set does not by itself require a third-party ECS. A typed in-house ECS-style model avoids framework coupling while spatial hashing addresses pairwise collision cost.
- CDN use conflicts with offline robustness. Dependencies are bundled; external downloads are build-time only.
- Browser speech synthesis is not consistent enough to carry critical information or guarantee a particular voice offline.
- Browser storage can be evicted; migration/backup/export greatly reduce risk but cannot promise absolute retention without optional cloud sync.

## Risks to monitor

1. Route gestures competing with browser navigation/scroll on iOS.
2. Tiny plane artwork versus required finger hit area.
3. Radar staleness being mistaken for simulation lag.
4. Fog plus sweep staleness creating unfair collisions.
5. Captured routes reserving runways too early and reducing strategy.
6. Intersecting-runway conflict zones creating unclear rejection reasons.
7. Speech/audio initialization and interruption behavior on mobile.
8. LocalStorage origin changes between preview/deployment appearing as lost saves.
9. Service-worker updates mixing old/new asset manifests.
10. Scope expansion before the landing loop is enjoyable.

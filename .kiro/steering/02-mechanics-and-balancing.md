---
inclusion: always
---

# Mechanics and initial balance

## Coordinate and pacing model

Use normalized map coordinates internally and convert to portrait world pixels at presentation boundaries. Design reference is 390×844 CSS pixels, with the radar occupying about 75% and console 25%; safe areas reduce usable dimensions. Aircraft and runways should be visually smaller than the failed prototype while touch targets remain at least 44×44 CSS pixels through invisible hit areas.

The earlier “25% speed” instruction has no trustworthy numeric baseline. Start with forgiving transit times instead: a newly spawned aircraft should usually take 35–60 seconds to cross Map 1 without routing. All values are configuration data and must be calibrated by play test.

## Route drawing

### Gesture contract

- Tap/press within an aircraft’s enlarged hit target to communicate/select.
- Drag after a small movement threshold to preview a new route. The aircraft keeps moving on its current course/route.
- Sample pointer positions by distance, not every browser event. Store world coordinates so resize does not warp routes.
- Smooth input using a centripetal Catmull–Rom spline or equivalent, then resample at consistent arc length.
- Simplify jitter while preserving intent; never visibly reroute behind the player’s finger.
- On release, validate bounds, minimum length, aircraft turn limits, hazards, and destination capture. Invalid sections render dashed/red and do not replace the current route.

### Route following

Use look-ahead steering with maximum turn rate by aircraft class, not waypoint teleportation. Start the accepted path at the aircraft’s release-time predicted position and insert a short tangent-preserving join. This prevents the old bug where dragging stopped the aircraft or produced a backward loop.

## Landing capture

A runway has two threshold capture zones, each with an inbound approach axis and a generous funnel. Only wind-permitted ends accept new captures, except during the short wind transition when both ends do. Score candidate runway ends using:

1. hard eligibility (aircraft type, runway length, forced destination, runway not permanently unavailable),
2. endpoint distance to the **near threshold**, not the middle of the triangle/runway,
3. heading alignment,
4. path extension cost,
5. preferred-destination bonus.

When a release endpoint enters or passes close to a valid funnel, generate the shortest sensible capture segment from the final drawn tangent to the threshold centerline. Favor a quick snap over a textbook-long approach. Display the final snapped path before committing. Crossing the threshold completes airborne flight immediately, disables midair collision, starts a brief landing/clear animation, colors runway lights red, awards the landing, and removes the strip.

Already-captured approaches remain valid if wind changes. A runway becoming occupied after route capture may command a go-around or hold at the capture gate; the exact policy is an owner decision for later traffic-density tuning.

## Helicopter landing

Helipads use a large circular magnetic capture area with no heading constraint. A release near a compatible pad creates a direct decelerating segment to pad center. Arrival within the capture radius lands immediately. Medivac helicopters must first visit the hospital POI; completion is visibly checked on both craft label and strip.

## Destination semantics

Each flight has one of:
- `FORCED`: only a named runway group/airport/pad is legal.
- `PREFERRED`: one named destination gives a bonus, while listed alternatives are legal.
- `ANY_COMPATIBLE`: any compatible destination is legal.

Display destination on aircraft label and strip: e.g. `BAW42 · MUST R27`, `N172K · PREF A`, or `H03 · ANY PAD`. Selection highlights legal destinations strongly, the preferred destination with a star/pulse, and illegal locations dimly with a reason icon. The camera remains fixed.

## Aircraft classes (relative starting values)

| Class | Speed | Turn agility | Fuel pressure | Landing | Special |
|---|---:|---:|---:|---|---|
| Light prop | 0.70× | high | medium-high | short/long runway | small reward |
| Commercial jet | 1.00× | low | medium | long runway only | heavy wake trail |
| Helicopter | 0.45× | very high | medium | compatible pad | any approach angle |
| Military/supersonic | 1.45× | low at speed | very high | configured long runway | rare, high reward |

These are ratios only. Absolute speed is chosen to meet the 35–60 second map-crossing target. Fuel reserves should create decisions: routine flights begin with roughly 70–110 seconds at baseline burn; low-fuel warning appears with enough time for one reasonable approach plus a small correction. Emergency reserves are lower but never spawn mathematically impossible.

## Separation and wake

Use a uniform spatial hash rebuilt each simulation tick. Cell size equals the largest warning radius; compare entities only within neighboring cells and deduplicate pairs. Use gameplay radii rather than sprite bounds.

- Warning radius > collision radius and varies by class/altitude mode.
- Both aircraft and both strips blink red during an active warning.
- Low fuel/emergency strips remain solid red unless also in a proximity warning, then blink.
- Heavy jets leave a time-decaying wake corridor. Following too closely causes reputation loss/temporary control disturbance before later phases enable fatal wake incidents.
- Aircraft that have crossed a runway threshold are absent from the airborne hash.

## Flight-strip state priority

1. Proximity collision warning: blinking red.
2. Emergency or low fuel: solid red.
3. Fog-hidden/radar-stale: grey with `?` and age of last contact.
4. Cleared route ending in valid landing: blue with landing target.
5. Healthy, not landing-cleared: green.

Never rely only on color: use text, icons, border pattern, and animation. Strips are full-width stacked rows with large touch targets and vanish immediately on landing.

## Radar, fog, wind, and storms

- Radar sweep updates an unselected aircraft’s displayed blip only when the beam crosses it. Between scans, show last-known position/heading and contact age; the authoritative simulation still moves continuously.
- Selecting a flight establishes live communication: current position is fully revealed even inside fog and its strip no longer shows stale contact. Deselecting returns it to sweep updates.
- Fog is one or more drifting, soft-edged map regions, not a global invisibility switch. Inside fog, unselected aircraft show a `?` at last known/radar contact position. Terrain and infrastructure remain readable but muted.
- Wind selects a usable direction per runway. On a shift, enter a configured transition (initially 8 seconds) where both directions may capture; grandfather all already-captured routes.
- Storm cells drift and block route planning visually. Their initial consequence should be rerouting/reputation risk; instant destruction is postponed until players can reliably understand boundaries.

## Economy and reputation

Landing revenue = aircraft base + passenger/cargo factor + preferred destination bonus + efficiency bonus + emergency bonus − penalties. Efficiency must have a capped range so safety remains better than risky shortcuts. Upgrades use escalating costs and explicit before/after previews. Do not sell an upgrade whose system is not implemented.

Reputation starts at 100. Near misses, fuel emergencies, go-arounds caused by player error, and excessive holds apply discrete, rate-limited penalties. A crash or reputation 0 ends the shift.

---
inclusion: always
---

# Decisions and open questions

## Recommended interpretations of the pasted history

1. **2D/2.5D, not true 3D:** The request begins with “3d top down,” while the detailed specification repeatedly requires a 2D radar simulator. Recommendation: use a 2D Phaser radar with layered terrain, shadows, altitude indicators, and polished effects (“2.5D”). True 3D would materially reduce mobile clarity and increase scope.
2. **PWA, not double-click standalone HTML:** The later “standalone HTML, no host” instruction conflicts with installable/offline PWA service workers. Recommendation: build a bundled PWA hosted over HTTPS; it works offline after installation. A single-file export can be considered separately but would not be the canonical PWA.
3. **Phaser 4:** Current stable is 4.2.1. Recommendation: start on Phaser 4 and isolate domain logic from it.
4. **Satellite/ATC hybrid with procedural fallback:** The target aesthetic blends subdued satellite imagery with a credible civilian ATC display. Use locally bundled, license-audited imagery or generated satellite-style terrain beneath authentic radar/chart symbology, realistically proportioned airport geometry, and aircraft silhouettes. Never depend on live map tiles at runtime, and keep procedural fallbacks.
5. **Slow pacing:** “25% speed” referenced another implementation with unknown units. Recommendation: balance around 35–60 seconds for an un-routed Map 1 crossing, then tune from phone play tests.
6. **Landing semantics:** Recommendation: generous near-threshold snap; threshold crossing instantly exits airborne collision and flight strip, then a short runway occupancy animation blocks conflicting operations.
7. **Radar vs fog:** Radar sweeps control contact freshness everywhere; fog conceals unselected live aircraft inside moving cells. Selection reveals live location without moving camera.
8. **Branding:** Avoid Boeing/Airbus names in content. Use generic `light prop`, `regional jet`, `heavy jet`, `helicopter`, and `military` classes.

## Owner approval needed

Please approve or change these before Task 1:

### A. Visual dimensionality

- **Recommended:** 2D/2.5D radar presentation.
- Alternative: true 3D top-down models/camera (larger scope and different renderer considerations).

### B. Distribution

- **Recommended:** HTTPS-hosted installable PWA with offline support after first load.
- Future install flow: deploy `dist/` to an HTTPS URL; on Android open it in Chrome and choose **Install app**/**Add to Home screen**; on iPhone open it in Safari, use **Share → Add to Home Screen**, and confirm **Add**. It then launches from a home-screen icon in standalone portrait mode.
- No App Store or Play Store account is required for this PWA route.
- Optional later deliverable: non-installable single HTML build for sharing.

### C. Core failure policy

- Current design: one actual midair collision ends the shift; near misses/fuel/holds reduce reputation.
- Question: should running out of fuel also immediately end the shift, or be a major reputation penalty with aircraft loss?

### D. Occupied-runway approach policy

- **Recommended for early playability:** reserve a runway on approach capture; later captures to it are rejected until clear.
- Alternative: allow multiple clearances and force go-arounds/spacing, which is deeper but harder.

### E. Art direction — provisional owner decision; confirmation required after playable trial

Blend subdued satellite imagery with a realistic civilian ATC/radar layer: credible airport and runway geometry/markings, restrained phosphor-like symbology, realistic top-down aircraft silhouettes, professional console typography, and operational weather/radar overlays. Satellite detail must remain dim enough that contacts, routes, approach areas, and labels dominate. Do not use live map tiles at runtime. Task 3 must publish a phone-playable visual checkpoint and ask the owner to confirm or revise the style before Task 4 begins.

### F. Game name

Working title is **Vector Control: ATC**. Confirm it or provide another name.

### G. First milestone content

- **Recommended:** Map 1 only; light props and one runway first, then second intersecting runway, jets, and helicopters as separate tasks.
- Confirm whether you want a tutorial from the first playable or only after routing/landing is proven.

## Explicitly deferred questions

Exact economy prices, map unlock thresholds, Map 2–4 geometry, carrier physics, automated holding patterns, ILS behavior, advanced wake fatalities, and monetization are intentionally deferred until the core touch-and-landing loop survives phone testing.

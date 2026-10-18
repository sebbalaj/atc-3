---
inclusion: always
---

# Mobile UI, controls, and accessibility

## Viewport contract

- Native design orientation is portrait. Manifest requests `portrait-primary`; if the browser ignores it, a rotate-device overlay pauses the simulation in landscape.
- Support narrow phones from 320×568 CSS pixels, modern tall phones, display cutouts, and browser chrome using `100dvh` plus safe-area environment insets.
- Radar uses approximately the upper 75% and the console the lower 25%, but the divider may shift within 70/30–78/22 to preserve minimum console controls.
- Keep gameplay world fixed to the radar region. Selection never pans or recenters the camera.
- Use normalized map layout so airport geometry preserves relative spacing across aspect ratios.

## Touch grammar

- Tap aircraft: select/communicate and reveal live position; highlight legal/preferred destination. Tap selected aircraft or empty radar: deselect.
- Drag from aircraft: draw replacement route. Aircraft continues moving.
- Tap flight strip: select the aircraft without camera movement.
- Drag beginning on empty radar does not create routes; reserve future two-finger gestures for optional zoom only if play tests prove necessary.
- Cancel an in-progress route by returning to the start target, lifting over console/outside radar, or tapping a visible cancel affordance.
- Prevent browser scroll, text selection, pull-to-refresh, double-tap zoom, and accidental long-press menus within the game surface.

Use Pointer Events through Phaser’s unified input and pointer capture where supported. Distinguish taps from drags using both distance and duration. Expand hit areas without enlarging artwork. A finger/route-preview offset should keep the line visible above the fingertip.

## Console layout

Top status row within console: shift clock, bank, wind indicator, and reputation meter. Below it, a vertically scrolling stack of full-width flight strips. Each strip must be at least 48 CSS pixels tall, have readable callsign/type/altitude-or-state/fuel/destination, and use icons/text in addition to state color. If traffic exceeds visible space, keep emergency/warning strips pinned and indicate hidden count.

Suggested strip content:
- left: callsign and class icon,
- center: destination requirement (`MUST R27`, `PREF A`, `ANY PAD`) and clearance state,
- right: fuel estimate and contact/emergency icon.

Remove a landed strip immediately. Do not wait for runway clearing.

## Selection and destination communication

Selected aircraft receives a high-contrast ring, leader line, expanded label, and live radar update. Compatible destinations pulse with identifiers placed at both runway threshold and airport/runway label. Preferred targets add a star; forced targets add a lock. Incompatible targets remain visible but dim and can show a short reason such as `TOO SHORT`, `WRONG WIND`, or `PAD ONLY`.

Runways require stable names (airport code + runway heading pair, e.g. `REG 09/27`) and each active threshold displays its one-way designation. Labels rotate only when readability is preserved; otherwise use upright callouts.

## Fog and radar readability

Fog is a visible translucent moving region with a soft but readable boundary. It mutes terrain rather than turning the screen blank. Unselected obscured aircraft render a question mark at their last contact position with a sweep age ring; flight strips become grey. Selected aircraft render current position regardless of fog and retain a `COMMS` badge.

## Feedback and error recovery

- Accepted route: crisp cyan/blue line, short haptic pulse where available, radio click, destination acknowledgement.
- Valid landing capture: endpoint magnet animation, centerline preview, threshold/pad highlight, “CLEARED” status.
- Invalid route: do not silently fail; keep a brief dashed red preview and show one concise reason.
- Proximity: warning rings and blinking red strips, with rate-limited alarm.
- Runway occupied: red lights and clear countdown.
- Audio is never required to understand state.

## Accessibility and comfort

- Minimum 44×44 CSS pixel touch targets; 48 preferred for primary controls.
- Respect `prefers-reduced-motion`; replace blinking with alternating border/text states and reduce sweep/particle intensity.
- Offer separate master, effects, voice, and ambient controls plus mute.
- Offer high-contrast and color-vision-safe palettes eventually; from Task 1 onward, state must not be encoded by red/green alone.
- Avoid tiny rotating text, rapid flashes, and more than three flashes per second.
- Pause on interruption/backgrounding and provide a large resume affordance.

## Install and offline UX

Show install help only when the platform supports or needs it; iOS uses instructional UI because browser install prompts differ. Show offline status without blocking play. PWA updates are user-confirmed and applied only outside active shifts.

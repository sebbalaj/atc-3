---
inclusion: always
---

# Assets, audio, and PWA delivery

## Visual asset strategy

Use a satellite/ATC hybrid as the provisional visual baseline. A subdued, locally bundled and license-audited satellite image—or a generated satellite-style texture—sits beneath credible civilian radar and aeronautical-chart overlays. Phaser Graphics, generated textures, SVG, and selected sprites should produce realistically proportioned airport geometry, runway markings, aircraft silhouettes, terrain labels, and weather overlays. Colors are restrained phosphor/chart tones rather than arcade neon. Optional CC0 packs may provide placeholder terrain/UI elements, but gameplay semantics must not depend on their filenames or availability. Wrap assets behind logical keys and keep a procedural fallback for each required key. Readability at phone scale takes priority over imagery detail. Task 3 requires owner confirmation after trying the visual checkpoint.

The setup scripts retain provenance for both optional placeholders and shipped map imagery:

- `fetch-assets.mjs` downloads Kenney’s CC0 Top-down Shooter pack into ignored source storage.
- `fetch-map-imagery.mjs` downloads the selected NASA Earthdata GIBS Blue Marble regional image into the shipped map assets, validates JPEG type/signature/size, and writes source, request, credit, and media-policy metadata.

#[[file:scripts/fetch-assets.mjs]]
#[[file:scripts/fetch-map-imagery.mjs]]

Do not blindly add internet assets. For each pack retain source URL, author/publisher, exact license, fetch date, and included license. Only CC0/public-domain assets are eligible by default; ask before introducing attribution/share-alike/noncommercial terms. Optimize chosen files into the shipped build rather than precaching an entire source pack.

## Terrain and map presentation

Map 1 should resemble a simplified real regional satellite view beneath an ATC/aeronautical overlay rather than an empty green game board. Include subdued land/water texture, roads, airport property, taxiway/building silhouettes, hospital POI, terrain/elevation hints, realistic runway heading numbers, centerlines, thresholds, edge lights, and approach areas. Satellite imagery must be local and license-audited; never request live map tiles during play. Apply believable scale and hierarchy while keeping routes and radar contacts dominant. Terrain is decorative unless a mechanic explicitly marks it hazardous; do not imply exact real-world navigation data.

## Procedural Web Audio

Create one lazily initialized `AudioContext` after the first deliberate tap. Route nodes through master/effects/voice/ambient gain buses and a limiter. Reuse nodes/buffers where practical.

Planned procedural cues:
- radio click/static: filtered noise burst with fast envelope,
- route accepted: short two-tone oscillator,
- approach captured/landing: distinct descending/settling tones,
- warning: rate-limited alternating oscillator plus noise edge,
- runway clear: soft confirmation ping,
- ambient: low-volume filtered noise/drone whose density responds gradually to traffic.

Avoid continuous oscillator leaks: stop/disconnect scheduled sources. Suspend/quiet audio when backgrounded. Respect mute and volume settings immediately.

## Voice acknowledgements

Browser `speechSynthesis` may speak “Roger” or “Cleared to land” after user interaction, but voice availability, pronunciation, latency, and offline behavior vary by device. Treat speech as optional flavor. Always pair it with procedural radio clicks and visual text; provide a voice toggle and cancel queued speech when state changes. Do not fetch cloud TTS in the initial release.

## PWA behavior

Use Vite PWA/Workbox to precache the production shell and selected local assets. No runtime CDN dependencies. Manifest requests standalone portrait display. Production must be served over HTTPS; localhost is acceptable for development. `file://` cannot provide a service worker/installable PWA, so the old “standalone HTML, no host” requirement is incompatible with this architecture.

Use prompt-based service-worker updates, not surprise reloads. Cache names are versioned by Workbox; remove outdated caches after activation. Avoid caching arbitrary cross-origin asset sources at runtime; fetched placeholders become local build inputs.

## Mobile deployment, installation, and testing

For development, use Vite on the LAN for gameplay checks, understanding that service-worker/install behavior requires a trusted secure origin on phones. For install/offline testing, deploy `dist/` to an HTTPS static host (for example GitHub Pages, Cloudflare Pages, Netlify, or equivalent). The final hosting choice is an owner decision.

Future owner installation flow:
1. Build and deploy the current `dist/` directory to the chosen HTTPS host.
2. Open that URL once while online.
3. On Android Chrome, use the browser’s **Install app** or **Add to Home screen** action; Task 1 will also reserve an in-game install affordance when the browser exposes one.
4. On iPhone, open the URL in Safari, tap **Share**, choose **Add to Home Screen**, then confirm **Add**.
5. Launch **Vector Control** from its home-screen icon. The manifest requests standalone portrait mode, and precached game files remain playable offline after a successful initial cache.
6. When a new version is deployed and the phone is online, download it in the background and ask the player to apply it only at a safe menu/checkpoint boundary.

This installation does not require publishing through the Apple App Store or Google Play Store. Changing the host/origin later creates a separate browser storage area, so keep a stable production URL and provide save export/import before any move.

## Current references

- [Phaser 4.2.1 stable release](https://phaser.io/download/stable)
- [Phaser scale manager concepts](https://docs.phaser.io/phaser/concepts/scale-manager)
- [Phaser unified input concepts](https://docs.phaser.io/phaser/concepts/input)
- [Vite PWA getting started](https://vite-pwa-org.netlify.app/guide/)
- [MDN service worker secure-context requirement](https://developer.mozilla.org/docs/Web/API/Service_Worker_API)
- [MDN PWA orientation manifest member](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/orientation)
- [MDN audio for web games and user-gesture restrictions](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)
- [Kenney CC0 policy](https://kenney.nl/support)
- [NASA Earthdata GIBS API](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api)
- [NASA images and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [MDN installing and uninstalling web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing)
- [Google Chrome Help: install and manage web apps](https://support.google.com/chrome/answer/9658361)
- [MDN persistent storage request](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)

Content was rephrased for compliance with licensing restrictions.

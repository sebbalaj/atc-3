# Fetched source assets

Run `npm run assets:fetch` to download optional CC0 placeholder art into this directory. Downloaded packs are ignored by Git and excluded from production automatically; each contains `.source.json` and `ASSET-LICENSE.txt` provenance records.

Future asset tasks must explicitly optimize and copy only selected runtime files into `public/assets/`. The game must remain bootable with procedural fallback art when fetched sources are absent.

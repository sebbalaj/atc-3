---
inclusion: always
---

# Save data, migrations, and recovery

## Goals and limits

Preserve progression across patches and reject malformed data safely. LocalStorage is explicitly required, but browser storage can still be cleared by the user/OS, private mode, origin changes, or quota policy. Therefore “no progress loss” is addressed with migration safety, rotating backup, checkpointing, storage-persistence request where available, and manual JSON export/import—not an impossible absolute guarantee.

## Keys and envelope

Use namespaced keys:
- `vector-control:save:primary`
- `vector-control:save:backup`
- `vector-control:save:staging`
- `vector-control:save:quarantine:<timestamp>`
- `vector-control:settings` (separate, independently versioned)

Conceptual envelope:

```ts
interface SaveEnvelope<T> {
  schemaVersion: number;
  gameVersion: string;
  revision: number;
  savedAt: string;
  checksum: string;
  payload: T;
}
```

Payload starts with player progression, map/shift unlocks, bank, reputation meta-state, purchased upgrades, statistics, settings references, and an optional resumable shift checkpoint. Save only domain data; never Phaser objects, textures, timers, callbacks, or derived caches.

## Write protocol

1. Convert runtime state into a canonical serializable DTO.
2. Validate, normalize key ordering for checksum, and serialize.
3. Write to staging.
4. Read staging back, parse, verify checksum/schema, and validate.
5. If primary is valid, copy it to backup.
6. Copy verified staging to primary.
7. Remove staging.

A single LocalStorage key assignment is synchronous, but this protocol protects against serialization bugs and interrupted multi-key rotation. Coalesce routine saves to avoid excessive main-thread work. Save at meaningful boundaries: route-independent progression changes, purchases, shift checkpoint intervals, backgrounding, summaries, and update acceptance.

## Load protocol

Try primary, then backup, then staging. For each candidate:
1. Preserve raw text until recovery succeeds.
2. Parse defensively.
3. Verify envelope checksum when present.
4. Validate known minimum shape without assuming optional fields.
5. Reject future `schemaVersion` with a clear “newer game version” message—never down-migrate or overwrite it.
6. Clone and run sequential migrations to current version.
7. Validate the fully migrated DTO.
8. Hydrate domain state and immediately write a current-version save while retaining the pre-migration raw save in backup/quarantine.

If all candidates fail, offer export of raw candidates and start-new confirmation. Never silently reset.

## Migration contract

- One pure function per edge: `migrateV1ToV2(input): SaveV2`.
- Registry contains every consecutive version; no skipped edges.
- Migration functions do not read browser state, current balance tables, random values, or wall-clock time.
- Preserve unknown fields under a `legacy`/`extensions` object when reasonable.
- Added fields get explicit defaults based on old state.
- Renames copy then validate before old fields disappear.
- Currency/progression changes are monotonic unless a documented economy conversion is required.
- Each migration records notes in source and updates a changelog fixture when tests are later requested.
- Keep representative old-save fixtures in the repository once migration implementation begins.

## Corruption and compatibility

Use runtime validators implemented locally or with a small schema library only if justified. Check number finiteness/ranges, enum membership, unique IDs, and referential integrity. Repair safe derived inconsistencies; quarantine destructive ambiguity. A checksum detects accidental truncation/tampering but is not security—client saves remain user-editable.

## Persistence and export

After a clear user gesture and install/first-save flow, call `navigator.storage.persist()` when available and report its best-effort result without alarming the player. Provide “Export Save” and “Import Save” in settings. Import validates and migrates into staging before replacing primary; it creates a backup first.

Keep saves compact (initial target below 100 KB). Assets and audio never belong in LocalStorage.

## PWA update interaction

Prompt for an available service-worker update outside gameplay. Before activation, write and verify a checkpoint. If a live shift is active, defer activation until pause/summary unless the user explicitly exits the shift.

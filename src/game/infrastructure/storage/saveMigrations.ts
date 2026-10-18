import { CURRENT_SAVE_SCHEMA, type SavePayloadV1 } from '../../application/ports/persistence';
import { isRecord, SaveValidationError, validatePayloadV1 } from './saveValidation';

type Migration = (payload: unknown) => unknown;

const migrations = new Map<number, Migration>([[0, migrateV0ToV1]]);

export function migratePayload(fromVersion: number, payload: unknown): SavePayloadV1 {
  let version = fromVersion;
  let current = structuredClone(payload);

  while (version < CURRENT_SAVE_SCHEMA) {
    const migration = migrations.get(version);
    if (!migration) {
      throw new SaveValidationError(`Missing save migration from version ${version}.`);
    }
    current = migration(current);
    version += 1;
  }

  return validatePayloadV1(current);
}

function migrateV0ToV1(payload: unknown): SavePayloadV1 {
  if (!isRecord(payload)) {
    throw new SaveValidationError('Legacy v0 payload must be an object.');
  }

  const bank = safeLegacyNumber(payload.money, 0, 1_000_000_000, 0);
  const reputation = safeLegacyNumber(payload.reputation, 0, 100, 100);
  const unlockedMapIds = Array.isArray(payload.unlockedMaps)
    ? payload.unlockedMaps.filter(
        (value): value is string => typeof value === 'string' && value.length > 0 && value.length <= 64,
      )
    : ['regional'];
  const uniqueMaps = [...new Set(unlockedMapIds.length > 0 ? unlockedMapIds : ['regional'])];
  const requestedMap = typeof payload.currentMap === 'string' ? payload.currentMap : uniqueMaps[0];
  const currentMapId = requestedMap && uniqueMaps.includes(requestedMap) ? requestedMap : uniqueMaps[0] ?? 'regional';

  return {
    controller: {
      id: typeof payload.controllerId === 'string' && payload.controllerId.length > 0
        ? payload.controllerId.slice(0, 128)
        : 'legacy-controller-v0',
      createdAt: '1970-01-01T00:00:00.000Z',
    },
    progression: {
      bank: Math.trunc(bank),
      reputation,
      unlockedMapIds: uniqueMaps,
      currentMapId,
    },
    upgrades: {},
    statistics: {
      shiftsStarted: 0,
      shiftsCompleted: 0,
      aircraftLanded: Math.trunc(safeLegacyNumber(payload.landings, 0, 1_000_000_000, 0)),
    },
    checkpoint: null,
    extensions: {
      legacyV0: structuredClone(payload),
    },
  };
}

function safeLegacyNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

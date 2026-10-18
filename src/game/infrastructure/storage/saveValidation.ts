import { checksumFor } from './canonicalJson';
import {
  CURRENT_SAVE_SCHEMA,
  type SaveEnvelopeUnknown,
  type SaveEnvelopeV1,
  type SavePayloadV1,
} from '../../application/ports/persistence';

export interface DecodedKnownSave {
  envelope: SaveEnvelopeV1;
  migrated: boolean;
}

export class SaveValidationError extends Error {}

export function parseEnvelopeShape(raw: string): SaveEnvelopeUnknown {
  if (raw.length === 0 || raw.length > 1_000_000) {
    throw new SaveValidationError('Save text is empty or exceeds the 1 MB safety limit.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SaveValidationError('Save text is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new SaveValidationError('Save envelope must be an object.');
  }

  const schemaVersion = finiteInteger(parsed.schemaVersion, 'schemaVersion', 0);
  const gameVersion = boundedString(parsed.gameVersion, 'gameVersion', 1, 64);
  const revision = finiteInteger(parsed.revision, 'revision', 0);
  const savedAt = isoDateString(parsed.savedAt, 'savedAt');
  const checksum = boundedString(parsed.checksum, 'checksum', 1, 128);

  return {
    schemaVersion,
    gameVersion,
    revision,
    savedAt,
    checksum,
    payload: parsed.payload,
  };
}

export function verifyKnownEnvelope(envelope: SaveEnvelopeUnknown): void {
  const material = {
    schemaVersion: envelope.schemaVersion,
    gameVersion: envelope.gameVersion,
    revision: envelope.revision,
    savedAt: envelope.savedAt,
    payload: envelope.payload,
  };
  if (checksumFor(material) !== envelope.checksum) {
    throw new SaveValidationError('Save checksum does not match its contents.');
  }
}

export function validatePayloadV1(payload: unknown): SavePayloadV1 {
  if (!isRecord(payload)) {
    throw new SaveValidationError('Save payload must be an object.');
  }
  if (!isRecord(payload.controller) || !isRecord(payload.progression)) {
    throw new SaveValidationError('Save is missing controller or progression data.');
  }
  if (!isRecord(payload.statistics) || !isRecord(payload.upgrades) || !isRecord(payload.extensions)) {
    throw new SaveValidationError('Save is missing statistics, upgrades, or extensions.');
  }
  if (payload.checkpoint !== null) {
    throw new SaveValidationError('This build only accepts an empty shift checkpoint.');
  }

  const unlockedMapIds = stringArray(payload.progression.unlockedMapIds, 'unlockedMapIds', 32);
  const currentMapId = boundedString(payload.progression.currentMapId, 'currentMapId', 1, 64);
  if (!unlockedMapIds.includes(currentMapId)) {
    throw new SaveValidationError('Current map is not present in unlocked maps.');
  }

  const upgrades: Record<string, number> = {};
  const upgradeEntries = Object.entries(payload.upgrades);
  if (upgradeEntries.length > 128) {
    throw new SaveValidationError('Save has too many upgrade entries.');
  }
  for (const [key, value] of upgradeEntries) {
    if (key.length === 0 || key.length > 64) {
      throw new SaveValidationError('Upgrade key length is invalid.');
    }
    upgrades[key] = finiteInteger(value, `upgrade.${key}`, 0, 1_000_000);
  }

  assertJsonCompatible(payload.extensions, 0);

  return {
    controller: {
      id: boundedString(payload.controller.id, 'controller.id', 1, 128),
      createdAt: isoDateString(payload.controller.createdAt, 'controller.createdAt'),
    },
    progression: {
      bank: finiteInteger(payload.progression.bank, 'bank', 0, 1_000_000_000),
      reputation: finiteNumber(payload.progression.reputation, 'reputation', 0, 100),
      unlockedMapIds,
      currentMapId,
    },
    upgrades,
    statistics: {
      shiftsStarted: finiteInteger(payload.statistics.shiftsStarted, 'shiftsStarted', 0, 1_000_000_000),
      shiftsCompleted: finiteInteger(payload.statistics.shiftsCompleted, 'shiftsCompleted', 0, 1_000_000_000),
      aircraftLanded: finiteInteger(payload.statistics.aircraftLanded, 'aircraftLanded', 0, 1_000_000_000),
    },
    checkpoint: null,
    extensions: structuredClone(payload.extensions),
  };
}

export function asEnvelopeV1(
  envelope: SaveEnvelopeUnknown,
  payload: SavePayloadV1,
): SaveEnvelopeV1 {
  if (envelope.schemaVersion !== CURRENT_SAVE_SCHEMA) {
    throw new SaveValidationError('Envelope schema is not current.');
  }
  return { ...envelope, schemaVersion: CURRENT_SAVE_SCHEMA, payload };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string {
  if (typeof value !== 'string' || value.length < minimumLength || value.length > maximumLength) {
    throw new SaveValidationError(`${field} is not a valid string.`);
  }
  return value;
}

function isoDateString(value: unknown, field: string): string {
  const text = boundedString(value, field, 1, 64);
  if (Number.isNaN(Date.parse(text))) {
    throw new SaveValidationError(`${field} is not a valid date.`);
  }
  return text;
}

function finiteInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new SaveValidationError(`${field} is not a valid integer.`);
  }
  return value as number;
}

function finiteNumber(value: unknown, field: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new SaveValidationError(`${field} is not a valid number.`);
  }
  return value;
}

function stringArray(value: unknown, field: string, maximumItems: number): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximumItems) {
    throw new SaveValidationError(`${field} is not a valid list.`);
  }
  const result = value.map((entry, index) => boundedString(entry, `${field}[${index}]`, 1, 64));
  if (new Set(result).size !== result.length) {
    throw new SaveValidationError(`${field} contains duplicate entries.`);
  }
  return result;
}

function assertJsonCompatible(value: unknown, depth: number): void {
  if (depth > 12) {
    throw new SaveValidationError('Extensions exceed the maximum nesting depth.');
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 512) {
      throw new SaveValidationError('Extensions contain an oversized array.');
    }
    value.forEach((entry) => assertJsonCompatible(entry, depth + 1));
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > 512) {
      throw new SaveValidationError('Extensions contain an oversized object.');
    }
    entries.forEach(([key, entry]) => {
      if (key.length > 128) {
        throw new SaveValidationError('Extensions contain an oversized key.');
      }
      assertJsonCompatible(entry, depth + 1);
    });
    return;
  }
  throw new SaveValidationError('Extensions contain a non-JSON value.');
}

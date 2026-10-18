import { checksumFor } from './canonicalJson';
import { migratePayload } from './saveMigrations';
import {
  CURRENT_SAVE_SCHEMA,
  GAME_VERSION,
  type SaveEnvelopeUnknown,
  type SaveEnvelopeV1,
  type SaveExportFile,
  type SaveExportResult,
  type SaveImportResult,
  type SaveLoadResult,
  type SavePayloadV1,
  type SavePersistencePort,
  type SaveSource,
} from '../../application/ports/persistence';
import {
  asEnvelopeV1,
  parseEnvelopeShape,
  SaveValidationError,
  validatePayloadV1,
  verifyKnownEnvelope,
} from './saveValidation';

export const SAVE_KEYS = {
  primary: 'vector-control:save:primary',
  backup: 'vector-control:save:backup',
  staging: 'vector-control:save:staging',
  quarantinePrefix: 'vector-control:save:quarantine:',
} as const;

class StorageUnavailableError extends Error {}

interface DecodedSave {
  envelope: SaveEnvelopeV1;
  migrated: boolean;
}

export class LocalStorageSaveService implements SavePersistencePort {
  readonly #storage: Storage | null;
  readonly #now: () => Date;
  #revision = 0;

  constructor(storage: Storage | null, now: () => Date = () => new Date()) {
    this.#storage = storage;
    this.#now = now;
  }

  load(): SaveLoadResult {
    if (!this.#storage) {
      return { status: 'unavailable', message: 'Browser storage is unavailable.' };
    }

    const rawCandidates: Partial<Record<SaveSource, string>> = {};
    const errors: string[] = [];

    try {
      for (const source of ['primary', 'backup', 'staging'] as const) {
        const raw = this.#read(SAVE_KEYS[source]);
        if (raw === null) {
          continue;
        }
        rawCandidates[source] = raw;

        try {
          const shape = parseEnvelopeShape(raw);
          if (shape.schemaVersion > CURRENT_SAVE_SCHEMA) {
            return { status: 'future', source, schemaVersion: shape.schemaVersion, raw };
          }

          const decoded = this.#decodeKnown(shape);
          this.#revision = Math.max(this.#revision, decoded.envelope.revision);
          const warnings = [...errors];

          if (decoded.migrated) {
            this.#quarantine(`pre-migration-${source}`, raw);
            const migratedEnvelope = this.save(decoded.envelope.payload);
            warnings.push(
              `Recovered ${source} schema ${shape.schemaVersion}, migrated it to ${CURRENT_SAVE_SCHEMA}, and retained the source data.`,
            );
            return {
              status: 'loaded',
              source: 'primary',
              envelope: migratedEnvelope,
              migrated: true,
              warnings,
            };
          }

          if (source !== 'primary') {
            warnings.push(`Loaded recovery data from ${source}; primary was not overwritten.`);
          }
          return {
            status: 'loaded',
            source,
            envelope: decoded.envelope,
            migrated: false,
            warnings,
          };
        } catch (error) {
          errors.push(`${source}: ${errorMessage(error)}`);
        }
      }
    } catch (error) {
      return { status: 'unavailable', message: errorMessage(error) };
    }

    return Object.keys(rawCandidates).length === 0
      ? { status: 'empty' }
      : { status: 'corrupt', rawCandidates, errors };
  }

  save(payload: SavePayloadV1): SaveEnvelopeV1 {
    const normalizedPayload = validatePayloadV1(payload);
    this.#assertStorageAvailable();
    this.#assertNoFutureCandidate();
    const envelope = this.#buildEnvelope(normalizedPayload, this.#revision + 1, this.#now());
    this.#commit(envelope);
    return envelope;
  }

  exportForUser(): SaveExportResult | null {
    if (!this.#storage) {
      return null;
    }

    try {
      const recovery = this.#readAllCandidates();
      const loaded = this.load();
      let save: SaveEnvelopeUnknown | null = null;
      if (loaded.status === 'loaded') {
        save = loaded.envelope;
      } else if (loaded.status === 'future') {
        save = parseEnvelopeShape(loaded.raw);
      }

      if (!save && Object.keys(recovery).length === 0) {
        return null;
      }

      const exportedAt = this.#now().toISOString();
      const exportFile: SaveExportFile = {
        format: 'vector-control-save-export',
        formatVersion: 1,
        exportedAt,
        save,
        recovery,
      };
      return {
        filename: `vector-control-save-${exportedAt.slice(0, 10)}.json`,
        text: `${JSON.stringify(exportFile, null, 2)}\n`,
        hasUsableSave: save !== null,
      };
    } catch {
      return null;
    }
  }

  importFromUser(text: string): SaveImportResult {
    if (!this.#storage) {
      return { ok: false, reason: 'unavailable', message: 'Browser storage is unavailable.' };
    }
    if (text.length === 0) {
      return { ok: false, reason: 'empty', message: 'The selected save file is empty.' };
    }
    if (text.length > 1_000_000) {
      return { ok: false, reason: 'invalid', message: 'The selected save exceeds the 1 MB safety limit.' };
    }

    try {
      const existingFuture = this.#findFutureCandidate();
      if (existingFuture !== null) {
        return {
          ok: false,
          reason: 'future',
          message: `The device already contains newer ${existingFuture.source} save schema ${existingFuture.schemaVersion}. Import was blocked and no stored data was changed.`,
        };
      }

      const candidateRaw = this.#extractImportEnvelope(text);
      const shape = parseEnvelopeShape(candidateRaw);
      if (shape.schemaVersion > CURRENT_SAVE_SCHEMA) {
        return {
          ok: false,
          reason: 'future',
          message: `This save uses schema ${shape.schemaVersion}; this build supports ${CURRENT_SAVE_SCHEMA}. The existing save was not changed.`,
        };
      }

      const decoded = this.#decodeKnown(shape);
      this.#revision = Math.max(this.#revision, shape.revision);
      if (decoded.migrated) {
        this.#quarantine('imported-legacy', candidateRaw);
      }
      const envelope = this.#buildEnvelope(
        decoded.envelope.payload,
        this.#revision + 1,
        this.#now(),
      );
      this.#commit(envelope);
      return { ok: true, envelope, migrated: decoded.migrated };
    } catch (error) {
      return { ok: false, reason: 'invalid', message: errorMessage(error) };
    }
  }

  checkpointBeforeUpdate(): boolean {
    const loaded = this.load();
    if (loaded.status === 'empty') {
      return true;
    }
    if (loaded.status !== 'loaded') {
      return false;
    }

    try {
      this.save(loaded.envelope.payload);
      return true;
    } catch {
      return false;
    }
  }

  #decodeKnown(shape: SaveEnvelopeUnknown): DecodedSave {
    verifyKnownEnvelope(shape);
    const migrated = shape.schemaVersion < CURRENT_SAVE_SCHEMA;
    const payload = migrated ? migratePayload(shape.schemaVersion, shape.payload) : validatePayloadV1(shape.payload);

    if (!migrated) {
      return { envelope: asEnvelopeV1(shape, payload), migrated: false };
    }

    const envelope = this.#buildEnvelope(payload, shape.revision, new Date(shape.savedAt));
    return { envelope, migrated: true };
  }

  #buildEnvelope(payload: SavePayloadV1, revision: number, savedAt: Date): SaveEnvelopeV1 {
    const material: Omit<SaveEnvelopeV1, 'checksum'> = {
      schemaVersion: CURRENT_SAVE_SCHEMA,
      gameVersion: GAME_VERSION,
      revision,
      savedAt: savedAt.toISOString(),
      payload,
    };
    return { ...material, checksum: checksumFor(material) };
  }

  #commit(envelope: SaveEnvelopeV1): void {
    this.#assertStorageAvailable();

    const existingStagingRaw = this.#read(SAVE_KEYS.staging);
    const existingStaging = this.#inspectDisplacedCandidate('staging', existingStagingRaw);
    if (existingStaging && existingStaging.envelope.revision > envelope.revision) {
      throw new StorageUnavailableError(
        `Refusing to overwrite newer staging revision ${existingStaging.envelope.revision}.`,
      );
    }

    const primaryRaw = this.#read(SAVE_KEYS.primary);
    const primary = this.#inspectDisplacedCandidate('primary', primaryRaw);
    let shouldRotatePrimary = primary !== null && primaryRaw !== null;

    if (shouldRotatePrimary && primary) {
      const backupRaw = this.#read(SAVE_KEYS.backup);
      const backup = this.#inspectDisplacedCandidate('backup', backupRaw);
      if (backup && backup.envelope.revision > primary.envelope.revision) {
        shouldRotatePrimary = false;
      }
    }

    const serialized = JSON.stringify(envelope);
    this.#write(SAVE_KEYS.staging, serialized);

    const stagedRaw = this.#read(SAVE_KEYS.staging);
    if (stagedRaw === null) {
      throw new StorageUnavailableError('Staging save could not be read back.');
    }
    const stagedShape = parseEnvelopeShape(stagedRaw);
    if (stagedShape.schemaVersion !== CURRENT_SAVE_SCHEMA) {
      throw new SaveValidationError('Staging save has an unexpected schema.');
    }
    this.#decodeKnown(stagedShape);

    if (shouldRotatePrimary && primaryRaw !== null) {
      this.#write(SAVE_KEYS.backup, primaryRaw);
    }

    this.#write(SAVE_KEYS.primary, stagedRaw);
    this.#remove(SAVE_KEYS.staging);
    this.#revision = envelope.revision;
  }

  #inspectDisplacedCandidate(source: SaveSource, raw: string | null): DecodedSave | null {
    if (raw === null) {
      return null;
    }
    try {
      const shape = parseEnvelopeShape(raw);
      if (shape.schemaVersion > CURRENT_SAVE_SCHEMA) {
        throw new StorageUnavailableError(
          `Refusing to overwrite newer ${source} schema ${shape.schemaVersion}.`,
        );
      }
      const decoded = this.#decodeKnown(shape);
      if (decoded.migrated) {
        this.#quarantine(`displaced-legacy-${source}`, raw);
      }
      return decoded;
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        throw error;
      }
      this.#quarantine(`displaced-corrupt-${source}`, raw);
      return null;
    }
  }

  #extractImportEnvelope(text: string): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new SaveValidationError('Import file is not valid JSON.');
    }

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>).format === 'vector-control-save-export'
    ) {
      const record = parsed as Record<string, unknown>;
      if (record.formatVersion !== 1 || record.save === null || record.save === undefined) {
        throw new SaveValidationError('Export file does not contain a usable save.');
      }
      return JSON.stringify(record.save);
    }
    return text;
  }

  #findFutureCandidate(): { source: SaveSource; schemaVersion: number } | null {
    for (const source of ['primary', 'backup', 'staging'] as const) {
      const raw = this.#read(SAVE_KEYS[source]);
      if (raw === null) {
        continue;
      }
      try {
        const shape = parseEnvelopeShape(raw);
        if (shape.schemaVersion > CURRENT_SAVE_SCHEMA) {
          return { source, schemaVersion: shape.schemaVersion };
        }
      } catch {
        // Corrupt candidates are preserved and handled by load/commit recovery.
      }
    }
    return null;
  }

  #assertNoFutureCandidate(): void {
    const future = this.#findFutureCandidate();
    if (future) {
      throw new StorageUnavailableError(
        `Refusing to overwrite newer ${future.source} save schema ${future.schemaVersion}.`,
      );
    }
  }

  #readAllCandidates(): Partial<Record<SaveSource, string>> {
    const result: Partial<Record<SaveSource, string>> = {};
    for (const source of ['primary', 'backup', 'staging'] as const) {
      const raw = this.#read(SAVE_KEYS[source]);
      if (raw !== null) {
        result[source] = raw;
      }
    }
    return result;
  }

  #quarantine(label: string, raw: string): void {
    const timestamp = this.#now().toISOString().replaceAll(/[:.]/g, '-');
    let suffix = 0;
    let key = `${SAVE_KEYS.quarantinePrefix}${timestamp}:${label}`;
    while (this.#read(key) !== null) {
      suffix += 1;
      key = `${SAVE_KEYS.quarantinePrefix}${timestamp}:${label}:${suffix}`;
    }
    this.#write(key, raw);
  }

  #assertStorageAvailable(): void {
    if (!this.#storage) {
      throw new StorageUnavailableError('Browser storage is unavailable.');
    }
  }

  #read(key: string): string | null {
    if (!this.#storage) {
      throw new StorageUnavailableError('Browser storage is unavailable.');
    }
    try {
      return this.#storage.getItem(key);
    } catch {
      throw new StorageUnavailableError('Browser storage could not be read.');
    }
  }

  #write(key: string, value: string): void {
    if (!this.#storage) {
      throw new StorageUnavailableError('Browser storage is unavailable.');
    }
    try {
      this.#storage.setItem(key, value);
    } catch {
      throw new StorageUnavailableError('Browser storage is full or blocked.');
    }
  }

  #remove(key: string): void {
    if (!this.#storage) {
      throw new StorageUnavailableError('Browser storage is unavailable.');
    }
    try {
      this.#storage.removeItem(key);
    } catch {
      throw new StorageUnavailableError('Browser storage could not remove staging data.');
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown save error.';
}

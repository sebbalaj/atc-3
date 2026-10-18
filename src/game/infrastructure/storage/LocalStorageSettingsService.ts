import {
  CURRENT_SETTINGS_SCHEMA,
  DEFAULT_SETTINGS,
  type SettingsLoadResult,
  type SettingsPersistencePort,
  type UserSettingsV1,
} from '../../application/ports/persistence';

export const SETTINGS_KEY = 'vector-control:settings';
const SETTINGS_QUARANTINE_PREFIX = 'vector-control:settings:quarantine:';

interface SettingsEnvelopeV1 {
  schemaVersion: typeof CURRENT_SETTINGS_SCHEMA;
  savedAt: string;
  payload: UserSettingsV1;
}

export class LocalStorageSettingsService implements SettingsPersistencePort {
  readonly #storage: Storage | null;
  readonly #now: () => Date;
  #writable = true;

  constructor(storage: Storage | null, now: () => Date = () => new Date()) {
    this.#storage = storage;
    this.#now = now;
  }

  load(): SettingsLoadResult {
    if (!this.#storage) {
      this.#writable = false;
      return { settings: { ...DEFAULT_SETTINGS }, status: 'unavailable', writable: false };
    }

    let raw: string | null;
    try {
      raw = this.#storage.getItem(SETTINGS_KEY);
    } catch {
      this.#writable = false;
      return { settings: { ...DEFAULT_SETTINGS }, status: 'unavailable', writable: false };
    }
    if (raw === null) {
      return { settings: { ...DEFAULT_SETTINGS }, status: 'default', writable: true };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed) || !Number.isSafeInteger(parsed.schemaVersion)) {
        throw new Error('Invalid settings envelope.');
      }
      if ((parsed.schemaVersion as number) > CURRENT_SETTINGS_SCHEMA) {
        this.#writable = false;
        return { settings: { ...DEFAULT_SETTINGS }, status: 'future', writable: false };
      }
      if (parsed.schemaVersion !== CURRENT_SETTINGS_SCHEMA || !isRecord(parsed.payload)) {
        throw new Error('Unsupported settings schema.');
      }
      return { settings: validateSettings(parsed.payload), status: 'loaded', writable: true };
    } catch {
      try {
        const timestamp = this.#now().toISOString().replaceAll(/[:.]/g, '-');
        this.#storage.setItem(`${SETTINGS_QUARANTINE_PREFIX}${timestamp}`, raw);
      } catch {
        this.#writable = false;
        return { settings: { ...DEFAULT_SETTINGS }, status: 'unavailable', writable: false };
      }
      return { settings: { ...DEFAULT_SETTINGS }, status: 'recovered', writable: true };
    }
  }

  save(settings: UserSettingsV1): boolean {
    if (!this.#storage || !this.#writable) {
      return false;
    }
    const payload = validateSettings(settings);
    const envelope: SettingsEnvelopeV1 = {
      schemaVersion: CURRENT_SETTINGS_SCHEMA,
      savedAt: this.#now().toISOString(),
      payload,
    };
    try {
      this.#storage.setItem(SETTINGS_KEY, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }
}

function validateSettings(value: unknown): UserSettingsV1 {
  if (
    !isRecord(value) ||
    typeof value.audioMuted !== 'boolean' ||
    typeof value.reducedMotion !== 'boolean' ||
    typeof value.voiceEnabled !== 'boolean' ||
    typeof value.masterVolume !== 'number' ||
    !Number.isFinite(value.masterVolume) ||
    value.masterVolume < 0 ||
    value.masterVolume > 1
  ) {
    throw new Error('Settings values are invalid.');
  }
  return {
    audioMuted: value.audioMuted,
    reducedMotion: value.reducedMotion,
    voiceEnabled: value.voiceEnabled,
    masterVolume: value.masterVolume,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

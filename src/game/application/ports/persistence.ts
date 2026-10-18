export const CURRENT_SAVE_SCHEMA = 1;
export const GAME_VERSION = '0.1.0';
export const CURRENT_SETTINGS_SCHEMA = 1;

export interface SavePayloadV1 {
  controller: {
    id: string;
    createdAt: string;
  };
  progression: {
    bank: number;
    reputation: number;
    unlockedMapIds: string[];
    currentMapId: string;
  };
  upgrades: Record<string, number>;
  statistics: {
    shiftsStarted: number;
    shiftsCompleted: number;
    aircraftLanded: number;
  };
  checkpoint: null;
  extensions: Record<string, unknown>;
}

export interface SaveEnvelopeV1 {
  schemaVersion: typeof CURRENT_SAVE_SCHEMA;
  gameVersion: string;
  revision: number;
  savedAt: string;
  checksum: string;
  payload: SavePayloadV1;
}

export interface SaveEnvelopeUnknown {
  schemaVersion: number;
  gameVersion: string;
  revision: number;
  savedAt: string;
  checksum: string;
  payload: unknown;
}

export type SaveSource = 'primary' | 'backup' | 'staging';

export type SaveLoadResult =
  | { status: 'empty' }
  | {
      status: 'loaded';
      source: SaveSource;
      envelope: SaveEnvelopeV1;
      migrated: boolean;
      warnings: string[];
    }
  | { status: 'future'; source: SaveSource; schemaVersion: number; raw: string }
  | { status: 'corrupt'; rawCandidates: Partial<Record<SaveSource, string>>; errors: string[] }
  | { status: 'unavailable'; message: string };

export type SaveImportResult =
  | { ok: true; envelope: SaveEnvelopeV1; migrated: boolean }
  | { ok: false; reason: 'empty' | 'invalid' | 'future' | 'unavailable'; message: string };

export interface SaveExportFile {
  format: 'vector-control-save-export';
  formatVersion: 1;
  exportedAt: string;
  save: SaveEnvelopeUnknown | null;
  recovery: Partial<Record<SaveSource, string>>;
}

export interface SaveExportResult {
  filename: string;
  text: string;
  hasUsableSave: boolean;
}

export interface SavePersistencePort {
  load(): SaveLoadResult;
  save(payload: SavePayloadV1): SaveEnvelopeV1;
  exportForUser(): SaveExportResult | null;
  importFromUser(text: string): SaveImportResult;
  checkpointBeforeUpdate(): boolean;
}

export interface UserSettingsV1 {
  audioMuted: boolean;
  reducedMotion: boolean;
  voiceEnabled: boolean;
  masterVolume: number;
}

export interface SettingsLoadResult {
  settings: UserSettingsV1;
  status: 'default' | 'loaded' | 'recovered' | 'future' | 'unavailable';
  writable: boolean;
}

export interface SettingsPersistencePort {
  load(): SettingsLoadResult;
  save(settings: UserSettingsV1): boolean;
}

export const DEFAULT_SETTINGS: UserSettingsV1 = {
  audioMuted: false,
  reducedMotion: false,
  voiceEnabled: true,
  masterVolume: 0.7,
};

export function createInitialSavePayload(now: Date, controllerId: string): SavePayloadV1 {
  return {
    controller: {
      id: controllerId,
      createdAt: now.toISOString(),
    },
    progression: {
      bank: 0,
      reputation: 100,
      unlockedMapIds: ['regional'],
      currentMapId: 'regional',
    },
    upgrades: {},
    statistics: {
      shiftsStarted: 0,
      shiftsCompleted: 0,
      aircraftLanded: 0,
    },
    checkpoint: null,
    extensions: {},
  };
}

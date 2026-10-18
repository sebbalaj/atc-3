import {
  createInitialSavePayload,
  type SaveImportResult,
  type SaveLoadResult,
  type SavePersistencePort,
  type SettingsLoadResult,
  type SettingsPersistencePort,
  type UserSettingsV1,
} from './ports/persistence';

export interface MenuSaveState {
  canContinue: boolean;
  shortLabel: string;
  detail: string;
  tone: 'neutral' | 'ready' | 'warning' | 'error';
}

export interface MenuExportResult {
  filename: string;
  text: string;
  hasUsableSave: boolean;
}

export interface MenuImportResult {
  result: SaveImportResult;
  state: MenuSaveState;
}

export class MenuPersistenceController {
  readonly #saves: SavePersistencePort;
  readonly #settings: SettingsPersistencePort;
  readonly #now: () => Date;
  readonly #newControllerId: () => string;
  #lastLoad: SaveLoadResult;

  constructor(
    saves: SavePersistencePort,
    settings: SettingsPersistencePort,
    now: () => Date,
    newControllerId: () => string,
  ) {
    this.#saves = saves;
    this.#settings = settings;
    this.#now = now;
    this.#newControllerId = newControllerId;
    this.#lastLoad = saves.load();
  }

  loadSettings(): SettingsLoadResult {
    return this.#settings.load();
  }

  currentSaveState(): MenuSaveState {
    return toMenuSaveState(this.#lastLoad);
  }

  createInitialProfile(): MenuSaveState {
    if (this.#lastLoad.status === 'empty') {
      try {
        this.#saves.save(createInitialSavePayload(this.#now(), this.#newControllerId()));
        this.#lastLoad = this.#saves.load();
      } catch (error) {
        this.#lastLoad = {
          status: 'unavailable',
          message: error instanceof Error ? error.message : 'Save could not be created.',
        };
      }
    }
    return toMenuSaveState(this.#lastLoad);
  }

  refresh(): MenuSaveState {
    this.#lastLoad = this.#saves.load();
    return toMenuSaveState(this.#lastLoad);
  }

  saveSettings(settings: UserSettingsV1): boolean {
    return this.#settings.save(settings);
  }

  exportSave(): MenuExportResult | null {
    const exported = this.#saves.exportForUser();
    return exported ? { ...exported } : null;
  }

  importSave(text: string): MenuImportResult {
    const result = this.#saves.importFromUser(text);
    this.#lastLoad = this.#saves.load();
    return { result, state: toMenuSaveState(this.#lastLoad) };
  }

  checkpointBeforeUpdate(): boolean {
    const saved = this.#saves.checkpointBeforeUpdate();
    this.#lastLoad = this.#saves.load();
    return saved;
  }
}

function toMenuSaveState(result: SaveLoadResult): MenuSaveState {
  switch (result.status) {
    case 'empty':
      return {
        canContinue: false,
        shortLabel: 'NO SAVED SHIFT',
        detail: 'No controller profile exists on this device.',
        tone: 'neutral',
      };
    case 'loaded': {
      const recovered = result.source !== 'primary';
      return {
        canContinue: true,
        shortLabel: recovered ? `RECOVERED ${result.source.toUpperCase()}` : 'PROFILE READY',
        detail: recovered
          ? `Progress loaded safely from ${result.source}. The damaged primary remains preserved.`
          : `Schema ${result.envelope.schemaVersion} · revision ${result.envelope.revision} · Regional unlocked`,
        tone: recovered || result.migrated ? 'warning' : 'ready',
      };
    }
    case 'future':
      return {
        canContinue: false,
        shortLabel: 'NEWER SAVE FOUND',
        detail: `Save schema ${result.schemaVersion} requires a newer game build and was not modified.`,
        tone: 'error',
      };
    case 'corrupt':
      return {
        canContinue: false,
        shortLabel: 'RECOVERY REQUIRED',
        detail: 'Stored save candidates are unreadable. Export them before replacing any progress.',
        tone: 'error',
      };
    case 'unavailable':
      return {
        canContinue: false,
        shortLabel: 'STORAGE UNAVAILABLE',
        detail: result.message,
        tone: 'error',
      };
  }
}

import './styles/global.css';
import { MenuPersistenceController } from './game/application/MenuPersistenceController';
import { AudioGate } from './game/infrastructure/audio/AudioGate';
import { AppLifecycle } from './game/infrastructure/platform/AppLifecycle';
import { PwaUpdateController } from './game/infrastructure/pwa/PwaUpdateController';
import {
  getBrowserStorage,
  requestPersistentBrowserStorage,
} from './game/infrastructure/storage/browserStorage';
import { LocalStorageSaveService } from './game/infrastructure/storage/LocalStorageSaveService';
import { LocalStorageSettingsService } from './game/infrastructure/storage/LocalStorageSettingsService';
import { createGame } from './game/presentation/createGame';
import { MobileShell } from './game/presentation/ui/MobileShell';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) {
  throw new Error('Application mount point #app was not found.');
}

const storage = getBrowserStorage();
const persistence = new MenuPersistenceController(
  new LocalStorageSaveService(storage),
  new LocalStorageSettingsService(storage),
  () => new Date(),
  () => globalThis.crypto.randomUUID(),
);
const settings = persistence.loadSettings().settings;

let shell: MobileShell;
let game: ReturnType<typeof createGame> | null = null;
const audio = new AudioGate((state) => shell?.setAudioState(state));
audio.setMuted(settings.audioMuted);
shell = new MobileShell(mount, audio, settings, {
  createInitialProfile: () => persistence.createInitialProfile(),
  requestPersistentStorage: () => {
    void requestPersistentBrowserStorage();
  },
  exportSave: () => persistence.exportSave(),
  importSave: (text) => persistence.importSave(text),
  saveSettings: (nextSettings) => persistence.saveSettings(nextSettings),
  startRegionalMap: () => {
    game?.scene.stop('shell');
    game?.scene.start('regional-map');
  },
  returnToMenu: () => {
    game?.scene.stop('regional-map');
    game?.scene.start('shell');
  },
});
shell.setSaveState(persistence.currentSaveState());

game = createGame();
const lifecycle = new AppLifecycle(game, audio, (paused) => shell.setInterruptionPaused(paused));
shell.setResumeAction(() => lifecycle.resumeAfterInterruption());
const updates = new PwaUpdateController(
  shell,
  () => shell.isAtSafeUpdateBoundary,
  () => persistence.checkpointBeforeUpdate(),
);
updates.register();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lifecycle.destroy();
    shell.destroy();
    audio.destroy();
    game?.destroy(true);
  });
}

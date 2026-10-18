import './styles/global.css';
import { AudioGate } from './game/infrastructure/audio/AudioGate';
import { AppLifecycle } from './game/infrastructure/platform/AppLifecycle';
import { PwaUpdateController } from './game/infrastructure/pwa/PwaUpdateController';
import { createGame } from './game/presentation/createGame';
import { MobileShell } from './game/presentation/ui/MobileShell';

const mount = document.querySelector<HTMLElement>('#app');
if (!mount) {
  throw new Error('Application mount point #app was not found.');
}

let shell: MobileShell;
const audio = new AudioGate((state) => shell?.setAudioState(state));
shell = new MobileShell(mount, audio);
const game = createGame();
const lifecycle = new AppLifecycle(game, audio, (paused) => shell.setInterruptionPaused(paused));
shell.setResumeAction(() => lifecycle.resumeAfterInterruption());
const updates = new PwaUpdateController(shell, () => shell.isAtSafeUpdateBoundary);
updates.register();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    lifecycle.destroy();
    shell.destroy();
    audio.destroy();
    game.destroy(true);
  });
}

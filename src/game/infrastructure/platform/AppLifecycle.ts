import type Phaser from 'phaser';
import type { AudioGate } from '../audio/AudioGate';

export class AppLifecycle {
  readonly #game: Phaser.Game;
  readonly #audio: AudioGate;
  readonly #onInterruptionChange: (paused: boolean) => void;
  readonly #portraitQuery = window.matchMedia('(orientation: portrait)');
  #interruptionLatched = false;
  #sleeping = false;

  constructor(
    game: Phaser.Game,
    audio: AudioGate,
    onInterruptionChange: (paused: boolean) => void,
  ) {
    this.#game = game;
    this.#audio = audio;
    this.#onInterruptionChange = onInterruptionChange;
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    this.#portraitQuery.addEventListener('change', this.#synchronize);
    window.addEventListener('pagehide', this.#handlePageHide);
    this.#synchronize();
  }

  resumeAfterInterruption(): void {
    if (document.hidden || !this.#portraitQuery.matches) {
      return;
    }
    this.#interruptionLatched = false;
    this.#onInterruptionChange(false);
    this.#synchronize();
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange);
    this.#portraitQuery.removeEventListener('change', this.#synchronize);
    window.removeEventListener('pagehide', this.#handlePageHide);
  }

  readonly #handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.#latchInterruption();
    }
    this.#synchronize();
  };

  readonly #handlePageHide = (): void => {
    this.#latchInterruption();
    this.#synchronize();
  };

  #latchInterruption(): void {
    if (this.#interruptionLatched) {
      return;
    }
    this.#interruptionLatched = true;
    this.#onInterruptionChange(true);
  }

  readonly #synchronize = (): void => {
    const shouldSleep =
      document.hidden || !this.#portraitQuery.matches || this.#interruptionLatched;
    document.documentElement.dataset.appPaused = String(shouldSleep);

    if (shouldSleep && !this.#sleeping) {
      this.#game.loop.sleep();
      this.#audio.suspend();
      this.#sleeping = true;
      return;
    }

    if (!shouldSleep && this.#sleeping) {
      this.#game.loop.wake();
      this.#audio.resume();
      this.#sleeping = false;
    }
  };
}

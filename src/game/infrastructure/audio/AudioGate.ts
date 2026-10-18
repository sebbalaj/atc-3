type AudioContextConstructor = new (contextOptions?: AudioContextOptions) => AudioContext;

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor;
  };

export type AudioGateState = 'locked' | 'ready' | 'muted' | 'unsupported';

export class AudioGate {
  readonly #onStateChange: (state: AudioGateState) => void;
  #context: AudioContext | null = null;
  #master: GainNode | null = null;
  #state: AudioGateState = 'locked';
  #muted = false;
  #unsupported = false;

  constructor(onStateChange: (state: AudioGateState) => void) {
    this.#onStateChange = onStateChange;
    window.addEventListener('pointerdown', this.#unlock, { passive: true });
    window.addEventListener('keydown', this.#unlock);
    queueMicrotask(() => this.#onStateChange(this.#state));
  }

  get state(): AudioGateState {
    return this.#state;
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
    if (this.#master && this.#context) {
      this.#master.gain.setTargetAtTime(muted ? 0 : 0.7, this.#context.currentTime, 0.015);
    }
    this.#refreshState();
  }

  playConfirmation(): void {
    if (!this.#context || !this.#master || this.#muted || this.#context.state !== 'running') {
      return;
    }

    const now = this.#context.currentTime;
    const oscillator = this.#context.createOscillator();
    const envelope = this.#context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.07);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(envelope).connect(this.#master);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      envelope.disconnect();
    });
  }

  suspend(): void {
    if (this.#context?.state === 'running') {
      void this.#context.suspend().catch(() => undefined).finally(() => this.#refreshState());
    }
  }

  resume(): void {
    if (!this.#muted) {
      void this.#tryResume();
    }
  }

  destroy(): void {
    window.removeEventListener('pointerdown', this.#unlock);
    window.removeEventListener('keydown', this.#unlock);
    if (this.#context) {
      this.#context.removeEventListener('statechange', this.#refreshState);
      void this.#context.close();
    }
  }

  readonly #unlock = (): void => {
    if (!this.#context) {
      const AudioContextClass =
        window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) {
        this.#unsupported = true;
        this.#refreshState();
        return;
      }

      this.#context = new AudioContextClass({ latencyHint: 'interactive' });
      this.#context.addEventListener('statechange', this.#refreshState);
      this.#master = this.#context.createGain();
      const limiter = this.#context.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 4;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;
      this.#master.gain.value = this.#muted ? 0 : 0.7;
      this.#master.connect(limiter).connect(this.#context.destination);
    }

    if (!this.#muted) {
      void this.#tryResume();
    } else {
      this.#refreshState();
    }
  };

  async #tryResume(): Promise<void> {
    const context = this.#context;
    if (!context || context.state === 'closed' || this.#muted) {
      this.#refreshState();
      return;
    }

    if (context.state !== 'running') {
      try {
        await context.resume();
      } catch {
        // A later deliberate tap will retry; mobile browsers may reject non-gesture resumes.
      }
    }
    this.#refreshState();
  }

  readonly #refreshState = (): void => {
    const nextState: AudioGateState = this.#unsupported
      ? 'unsupported'
      : this.#muted
        ? 'muted'
        : this.#context?.state === 'running'
          ? 'ready'
          : 'locked';

    if (nextState === this.#state) {
      return;
    }
    this.#state = nextState;
    this.#onStateChange(this.#state);
  };
}

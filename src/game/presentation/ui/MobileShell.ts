import type { AudioGate, AudioGateState } from '../../infrastructure/audio/AudioGate';
import type { PwaUpdateView } from '../../infrastructure/pwa/PwaUpdateController';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export class MobileShell implements PwaUpdateView {
  readonly #root: HTMLElement;
  readonly #audio: AudioGate;
  #installPrompt: InstallPromptEvent | null = null;
  #diagnosticTimer = 0;
  #offlineReady = Boolean(navigator.serviceWorker?.controller);
  #resumeAction: (() => void) | null = null;

  constructor(root: HTMLElement, audio: AudioGate) {
    this.#root = root;
    this.#audio = audio;
    this.#render();
    this.#bindEvents();
    this.#updateConnectivity();
    this.#updateInstallState();
    this.#updateDiagnostics();
  }

  get isAtSafeUpdateBoundary(): boolean {
    return !this.#root.querySelector<HTMLDialogElement>('dialog[open]');
  }

  setAudioState(state: AudioGateState): void {
    const status = this.#requiredElement<HTMLElement>('#audio-status');
    const labels: Record<AudioGateState, string> = {
      locked: 'AUDIO: TAP TO ARM',
      ready: 'AUDIO: READY',
      muted: 'AUDIO: MUTED',
      unsupported: 'AUDIO: UNAVAILABLE',
    };
    status.textContent = labels[state];
    status.dataset.state = state;
  }

  setResumeAction(action: () => void): void {
    this.#resumeAction = action;
  }

  setInterruptionPaused(paused: boolean): void {
    document.documentElement.dataset.interrupted = String(paused);
    if (paused) {
      this.#requiredElement<HTMLButtonElement>('#resume-control').focus();
    }
  }

  showOfflineReady(): void {
    this.#offlineReady = true;
    this.#updateInstallState();
    this.#showToast('OFFLINE READY', 'The control room is cached for offline launch.');
  }

  showUpdateReady(applyUpdate: () => void): void {
    const toast = this.#requiredElement<HTMLElement>('#system-toast');
    toast.hidden = false;
    toast.innerHTML = `
      <div><strong>UPDATE READY</strong><span>A new control-room build is available.</span></div>
      <button type="button" class="compact-button" id="apply-update">APPLY</button>
    `;
    toast.querySelector<HTMLButtonElement>('#apply-update')?.addEventListener('click', applyUpdate, {
      once: true,
    });
  }

  destroy(): void {
    window.clearTimeout(this.#diagnosticTimer);
    window.removeEventListener('online', this.#updateConnectivity);
    window.removeEventListener('offline', this.#updateConnectivity);
    window.removeEventListener('resize', this.#queueDiagnostics);
    window.visualViewport?.removeEventListener('resize', this.#queueDiagnostics);
    window.removeEventListener('beforeinstallprompt', this.#captureInstallPrompt);
  }

  #render(): void {
    this.#root.innerHTML = `
      <div class="game-shell">
        <div id="phaser-stage" aria-hidden="true"></div>
        <div class="safe-area-probe" id="safe-area-probe" aria-hidden="true"></div>

        <header class="system-bar" aria-label="System status">
          <span class="system-label"><i class="status-dot" aria-hidden="true"></i> REGIONAL CONTROL</span>
          <span id="network-status">ONLINE</span>
        </header>

        <section class="menu-panel" aria-labelledby="game-title">
          <div class="brand-lockup">
            <img src="./icons/app-icon.svg" width="72" height="72" alt="" />
            <div>
              <p class="eyebrow">AIRSPACE MANAGEMENT SIMULATOR</p>
              <h1 id="game-title">VECTOR CONTROL</h1>
              <p class="subtitle">REGIONAL ATC</p>
            </div>
          </div>

          <div class="readiness-row" aria-label="System readiness">
            <span>SYS 0.1</span>
            <span id="audio-status" data-state="locked">AUDIO: TAP TO ARM</span>
          </div>

          <nav class="menu-actions" aria-label="Main menu">
            <button type="button" class="primary-button" id="new-shift">
              <span>NEW SHIFT</span><small>REGIONAL TRAINING</small>
            </button>
            <button type="button" id="continue-shift" disabled aria-describedby="continue-help">
              <span>CONTINUE</span><small>NO SAVED SHIFT</small>
            </button>
            <p class="sr-only" id="continue-help">Continue becomes available after save support is added.</p>
            <div class="split-actions">
              <button type="button" id="open-settings">SETTINGS</button>
              <button type="button" id="save-tools">SAVE TOOLS</button>
            </div>
            <button type="button" class="install-button" id="install-app">INSTALL / OFFLINE HELP</button>
          </nav>

          <p class="menu-footnote">PORTRAIT MODE · TOUCH-FIRST · OFFLINE CAPABLE</p>
        </section>

        <footer class="build-footer">
          <span>CONTROL LINK STANDBY</span>
          <span aria-hidden="true">///</span>
        </footer>

        <dialog id="settings-dialog" aria-labelledby="settings-title">
          <form method="dialog" class="dialog-card">
            <header><p class="eyebrow">CONTROL ROOM</p><h2 id="settings-title">Settings</h2></header>
            <label class="setting-row">
              <span><strong>Master audio</strong><small>Procedural effects and ambience</small></span>
              <input type="checkbox" id="master-audio" checked />
            </label>
            <label class="setting-row">
              <span><strong>Reduced motion</strong><small>Minimize sweep and pulse animation</small></span>
              <input type="checkbox" id="reduced-motion" />
            </label>
            <div class="diagnostics" aria-live="polite">
              <strong>VIEWPORT DIAGNOSTICS</strong>
              <output id="viewport-diagnostics">Measuring…</output>
            </div>
            <button type="submit" class="primary-button">CLOSE</button>
          </form>
        </dialog>

        <dialog id="info-dialog" aria-labelledby="info-title">
          <form method="dialog" class="dialog-card">
            <header><p class="eyebrow" id="info-kicker">NOTICE</p><h2 id="info-title">Stand by</h2></header>
            <div id="info-message" class="info-message"></div>
            <button type="submit" class="primary-button">ACKNOWLEDGE</button>
          </form>
        </dialog>

        <aside id="system-toast" class="system-toast" aria-live="polite" hidden></aside>

        <section class="resume-overlay" role="alertdialog" aria-labelledby="resume-title" aria-describedby="resume-message">
          <p class="eyebrow">SESSION INTERRUPTED</p>
          <h2 id="resume-title">Control room paused</h2>
          <p id="resume-message">Review the airspace before resuming operations.</p>
          <button type="button" class="primary-button" id="resume-control">RESUME CONTROL</button>
        </section>

        <section class="rotate-overlay" role="alert" aria-label="Portrait orientation required">
          <div class="rotate-phone" aria-hidden="true">↻</div>
          <p class="eyebrow">AIRSPACE PAUSED</p>
          <h2>Rotate to portrait</h2>
          <p>Vector Control is designed for upright phone operation.</p>
        </section>
      </div>
    `;
  }

  #bindEvents(): void {
    this.#requiredElement('#new-shift').addEventListener('click', () => {
      this.#audio.playConfirmation();
      this.#showInfo(
        'TRAINING AIRSPACE',
        'Shift preparation is online. The interactive regional radar map arrives in the next map milestone; no progress is created by this preview.',
        'OPERATIONS',
      );
    });

    this.#requiredElement('#open-settings').addEventListener('click', () => {
      this.#requiredElement<HTMLDialogElement>('#settings-dialog').showModal();
      this.#updateDiagnostics();
    });

    this.#requiredElement('#save-tools').addEventListener('click', () => {
      this.#showInfo(
        'SAVE TOOLS',
        'Versioned export, import, backup, and migration controls are scheduled for the next task.',
        'DATA MANAGEMENT',
      );
    });

    this.#requiredElement<HTMLInputElement>('#master-audio').addEventListener('change', (event) => {
      this.#audio.setMuted(!(event.currentTarget as HTMLInputElement).checked);
    });

    this.#requiredElement<HTMLInputElement>('#reduced-motion').addEventListener('change', (event) => {
      document.documentElement.dataset.reduceMotion = String(
        (event.currentTarget as HTMLInputElement).checked,
      );
    });

    this.#requiredElement('#install-app').addEventListener('click', () => {
      void this.#requestInstall();
    });

    this.#requiredElement('#resume-control').addEventListener('click', () => {
      this.#resumeAction?.();
    });

    window.addEventListener('online', this.#updateConnectivity);
    window.addEventListener('offline', this.#updateConnectivity);
    window.addEventListener('resize', this.#queueDiagnostics, { passive: true });
    window.visualViewport?.addEventListener('resize', this.#queueDiagnostics, { passive: true });
    window.addEventListener('beforeinstallprompt', this.#captureInstallPrompt);
  }

  readonly #captureInstallPrompt = (event: Event): void => {
    event.preventDefault();
    this.#installPrompt = event as InstallPromptEvent;
    this.#updateInstallState();
  };

  async #requestInstall(): Promise<void> {
    if (this.#isInstalled()) {
      this.#showInfo('ALREADY INSTALLED', 'Vector Control is running in installed app mode.', 'INSTALLATION');
      return;
    }

    if (this.#installPrompt) {
      await this.#installPrompt.prompt();
      const choice = await this.#installPrompt.userChoice;
      this.#installPrompt = null;
      this.#showInfo(
        choice.outcome === 'accepted' ? 'INSTALL ACCEPTED' : 'INSTALL DISMISSED',
        choice.outcome === 'accepted'
          ? 'The app icon will appear on your device when installation completes.'
          : 'You can install later from this menu or your browser menu.',
        'INSTALLATION',
      );
      this.#updateInstallState();
      return;
    }

    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    this.#showInfo(
      isAppleMobile ? 'INSTALL ON IPHONE / IPAD' : 'INSTALL ON THIS DEVICE',
      isAppleMobile
        ? 'Open this site in Safari, tap the Share button, choose “Add to Home Screen,” then tap Add.'
        : 'Open your browser menu and choose “Install app” or “Add to Home screen.” Installation requires the HTTPS production address.',
      'OFFLINE APP',
    );
  }

  #updateInstallState(): void {
    const button = this.#requiredElement<HTMLButtonElement>('#install-app');
    if (this.#isInstalled()) {
      button.textContent = this.#offlineReady ? 'INSTALLED · OFFLINE READY' : 'INSTALLED · CACHE PENDING';
      return;
    }
    if (this.#installPrompt) {
      button.textContent = this.#offlineReady ? 'INSTALL APP · OFFLINE READY' : 'INSTALL APP';
      return;
    }
    button.textContent = this.#offlineReady ? 'OFFLINE READY · INSTALL HELP' : 'INSTALL / OFFLINE HELP';
  }

  #isInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as NavigatorWithStandalone).standalone)
    );
  }

  readonly #updateConnectivity = (): void => {
    const indicator = this.#requiredElement<HTMLElement>('#network-status');
    indicator.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    indicator.dataset.state = navigator.onLine ? 'online' : 'offline';
  };

  readonly #queueDiagnostics = (): void => {
    window.clearTimeout(this.#diagnosticTimer);
    this.#diagnosticTimer = window.setTimeout(() => this.#updateDiagnostics(), 100);
  };

  #updateDiagnostics(): void {
    const probe = this.#requiredElement<HTMLElement>('#safe-area-probe');
    const styles = getComputedStyle(probe);
    const orientation = matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    const visualWidth = Math.round(window.visualViewport?.width ?? window.innerWidth);
    const visualHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
    const output = this.#requiredElement<HTMLOutputElement>('#viewport-diagnostics');
    output.textContent = [
      `${visualWidth}×${visualHeight} CSS px · DPR ${devicePixelRatio.toFixed(2)}`,
      orientation,
      `safe T${styles.paddingTop} R${styles.paddingRight} B${styles.paddingBottom} L${styles.paddingLeft}`,
    ].join(' · ');
  }

  #showInfo(title: string, message: string, kicker: string): void {
    this.#requiredElement('#info-title').textContent = title;
    this.#requiredElement('#info-kicker').textContent = kicker;
    this.#requiredElement('#info-message').textContent = message;
    this.#requiredElement<HTMLDialogElement>('#info-dialog').showModal();
  }

  #showToast(title: string, message: string): void {
    const toast = this.#requiredElement<HTMLElement>('#system-toast');
    toast.hidden = false;
    toast.innerHTML = `<div><strong>${title}</strong><span>${message}</span></div>`;
    window.setTimeout(() => {
      toast.hidden = true;
    }, 5_000);
  }

  #requiredElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.#root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Required shell element not found: ${selector}`);
    }
    return element;
  }
}

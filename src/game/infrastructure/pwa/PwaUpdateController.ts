import { registerSW } from 'virtual:pwa-register';

export interface PwaUpdateView {
  showOfflineReady(): void;
  showUpdateReady(applyUpdate: () => void): void;
}

export class PwaUpdateController {
  readonly #view: PwaUpdateView;
  readonly #isSafeToUpdate: () => boolean;
  #applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

  constructor(view: PwaUpdateView, isSafeToUpdate: () => boolean) {
    this.#view = view;
    this.#isSafeToUpdate = isSafeToUpdate;
  }

  register(): void {
    this.#applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        this.#view.showUpdateReady(() => this.apply());
      },
      onOfflineReady: () => {
        this.#view.showOfflineReady();
      },
      onRegisterError: (error) => {
        console.warn('Offline service worker registration failed.', error);
      },
    });
  }

  apply(): void {
    if (!this.#applyUpdate || !this.#isSafeToUpdate()) {
      return;
    }
    void this.#applyUpdate(true);
  }
}

import { registerSW } from 'virtual:pwa-register';

export interface PwaUpdateView {
  showOfflineReady(): void;
  showUpdateReady(applyUpdate: () => void): void;
  showUpdateBlocked(): void;
}

export class PwaUpdateController {
  readonly #view: PwaUpdateView;
  readonly #isSafeToUpdate: () => boolean;
  readonly #checkpointBeforeUpdate: () => boolean | Promise<boolean>;
  #applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

  constructor(
    view: PwaUpdateView,
    isSafeToUpdate: () => boolean,
    checkpointBeforeUpdate: () => boolean | Promise<boolean>,
  ) {
    this.#view = view;
    this.#isSafeToUpdate = isSafeToUpdate;
    this.#checkpointBeforeUpdate = checkpointBeforeUpdate;
  }

  register(): void {
    this.#applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        this.#view.showUpdateReady(() => {
          void this.apply();
        });
      },
      onOfflineReady: () => {
        this.#view.showOfflineReady();
      },
      onRegisterError: (error) => {
        console.warn('Offline service worker registration failed.', error);
      },
    });
  }

  async apply(): Promise<void> {
    if (!this.#applyUpdate || !this.#isSafeToUpdate()) {
      return;
    }
    const checkpointed = await this.#checkpointBeforeUpdate();
    if (!checkpointed) {
      this.#view.showUpdateBlocked();
      return;
    }
    await this.#applyUpdate(true);
  }
}

import Phaser from 'phaser';

export class ShellScene extends Phaser.Scene {
  #base!: Phaser.GameObjects.Graphics;
  #radar!: Phaser.GameObjects.Graphics;
  #lastWidth = 0;
  #lastHeight = 0;
  #lastReducedMotion: boolean | null = null;
  readonly #systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    super('shell');
  }

  create(): void {
    this.#base = this.add.graphics();
    this.#radar = this.add.graphics();
    this.#redrawBase();
  }

  override update(time: number): void {
    const resized = this.scale.width !== this.#lastWidth || this.scale.height !== this.#lastHeight;
    if (resized) {
      this.#redrawBase();
    }

    const reducedMotion =
      this.#systemReducedMotion.matches || document.documentElement.dataset.reduceMotion === 'true';
    if (!reducedMotion || resized || reducedMotion !== this.#lastReducedMotion) {
      this.#drawRadarSweep(time, reducedMotion);
    }
    this.#lastReducedMotion = reducedMotion;
  }

  #redrawBase(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.#lastWidth = width;
    this.#lastHeight = height;
    this.#base.clear();

    this.#base.fillStyle(0x071015, 1);
    this.#base.fillRect(0, 0, width, height);

    // A subdued satellite-like land layer beneath operational symbology.
    this.#base.fillStyle(0x182a25, 0.78);
    this.#base.beginPath();
    this.#base.moveTo(-20, height * 0.12);
    this.#base.lineTo(width * 0.18, height * 0.07);
    this.#base.lineTo(width * 0.42, height * 0.2);
    this.#base.lineTo(width * 0.36, height * 0.42);
    this.#base.lineTo(width * 0.5, height * 0.61);
    this.#base.lineTo(width * 0.32, height * 0.82);
    this.#base.lineTo(-20, height * 0.9);
    this.#base.closePath();
    this.#base.fillPath();

    this.#base.fillStyle(0x26382b, 0.32);
    for (let y = 30; y < height; y += 44) {
      for (let x = (y / 44) % 2 === 0 ? 24 : 46; x < width; x += 72) {
        this.#base.fillCircle(x, y, 8 + ((x + y) % 11));
      }
    }

    this.#base.lineStyle(1, 0x66847b, 0.2);
    this.#base.beginPath();
    this.#base.moveTo(0, height * 0.57);
    this.#base.lineTo(width * 0.23, height * 0.52);
    this.#base.lineTo(width * 0.45, height * 0.58);
    this.#base.lineTo(width * 0.7, height * 0.5);
    this.#base.lineTo(width, height * 0.54);
    this.#base.strokePath();

    const spacing = Math.max(54, Math.min(width, height) / 6);
    this.#base.lineStyle(1, 0x7fa79c, 0.075);
    for (let x = spacing; x < width; x += spacing) {
      this.#base.lineBetween(x, 0, x, height);
    }
    for (let y = spacing; y < height; y += spacing) {
      this.#base.lineBetween(0, y, width, y);
    }
  }

  #drawRadarSweep(time: number, reducedMotion: boolean): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width * 0.72;
    const centerY = height * 0.3;
    const radius = Math.max(width, height) * 0.58;
    const angle = reducedMotion ? -Math.PI / 2 : (time / 8_000) * Math.PI * 2;
    const endX = centerX + Math.cos(angle) * radius;
    const endY = centerY + Math.sin(angle) * radius;

    this.#radar.clear();
    this.#radar.lineStyle(1, 0x77baa6, 0.11);
    for (const factor of [0.25, 0.5, 0.75, 1]) {
      this.#radar.strokeCircle(centerX, centerY, radius * factor);
    }
    this.#radar.lineStyle(2, 0x9bd6c1, reducedMotion ? 0.14 : 0.24);
    this.#radar.lineBetween(centerX, centerY, endX, endY);
  }
}

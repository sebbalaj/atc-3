import Phaser from 'phaser';
import type { AircraftSimulationFrame } from '../../application/AircraftSimulation';
import type { RadarViewport } from '../ports/RegionalMapView';

const LIGHT_PROP_TEXTURE = 'aircraft-light-prop';

interface AircraftView {
  container: Phaser.GameObjects.Container;
  symbol: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  aircraftId: number | null;
  labelText: string;
  seenFrame: number;
}

export class AircraftRenderer {
  readonly #scene: Phaser.Scene;
  readonly #active = new Map<number, AircraftView>();
  readonly #pool: AircraftView[] = [];
  #frame = 0;

  constructor(scene: Phaser.Scene, prewarmCount = 16) {
    this.#scene = scene;
    this.#createTexture();
    for (let index = 0; index < prewarmCount; index += 1) {
      this.#pool.push(this.#createView());
    }
  }

  render(frame: AircraftSimulationFrame, viewport: RadarViewport): void {
    this.#frame += 1;
    const showLabels = frame.aircraft.length <= 30;
    for (const aircraft of frame.aircraft) {
      const view = this.#active.get(aircraft.id) ?? this.#acquire(aircraft.id);
      view.seenFrame = this.#frame;
      const normalizedX = Phaser.Math.Linear(aircraft.previousX, aircraft.x, frame.alpha);
      const normalizedY = Phaser.Math.Linear(aircraft.previousY, aircraft.y, frame.alpha);
      view.container.setPosition(
        viewport.x + normalizedX * viewport.width,
        viewport.y + normalizedY * viewport.height,
      );
      view.symbol.setRotation(aircraft.headingRadians + Math.PI / 2);
      view.label.setVisible(showLabels);
      const labelText = `${aircraft.callsign}\n${Math.round(aircraft.altitudeFeet / 100)} · ${aircraft.lifecycle}`;
      if (showLabels && view.labelText !== labelText) {
        view.label.setText(labelText);
        view.labelText = labelText;
      }
    }

    for (const [id, view] of this.#active) {
      if (view.seenFrame !== this.#frame) {
        this.#active.delete(id);
        this.#release(view);
      }
    }
  }

  clear(): void {
    for (const view of this.#active.values()) {
      this.#release(view);
    }
    this.#active.clear();
    this.#pool.length = 0;
  }

  #acquire(aircraftId: number): AircraftView {
    const view = this.#pool.pop() ?? this.#createView();
    view.aircraftId = aircraftId;
    view.labelText = '';
    view.container.setVisible(true).setActive(true);
    this.#active.set(aircraftId, view);
    return view;
  }

  #release(view: AircraftView): void {
    view.aircraftId = null;
    view.labelText = '';
    view.seenFrame = 0;
    view.container.setVisible(false).setActive(false).setPosition(-1_000, -1_000);
    this.#pool.push(view);
  }

  #createView(): AircraftView {
    const symbol = this.#scene.add.image(0, 0, LIGHT_PROP_TEXTURE).setOrigin(0.5);
    const label = this.#scene.add
      .text(13, -18, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        color: '#e5f2ed',
        backgroundColor: '#061216d9',
        padding: { x: 3, y: 2 },
        lineSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const container = this.#scene.add
      .container(-1_000, -1_000, [symbol, label])
      .setDepth(8)
      .setVisible(false)
      .setActive(false);
    return { container, symbol, label, aircraftId: null, labelText: '', seenFrame: 0 };
  }

  #createTexture(): void {
    if (this.#scene.textures.exists(LIGHT_PROP_TEXTURE)) {
      return;
    }
    const graphics = this.#scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x061216, 0.65);
    graphics.fillEllipse(17, 18, 8, 24);
    graphics.fillStyle(0xe4eee9, 1);
    graphics.fillTriangle(16, 3, 12, 21, 20, 21);
    graphics.fillRect(4, 14, 24, 5);
    graphics.fillTriangle(4, 14, 16, 11, 16, 19);
    graphics.fillTriangle(28, 14, 16, 11, 16, 19);
    graphics.fillRect(10, 23, 12, 3);
    graphics.fillStyle(0x6f9788, 1);
    graphics.fillCircle(16, 10, 2);
    graphics.generateTexture(LIGHT_PROP_TEXTURE, 32, 32);
    graphics.destroy();
  }
}

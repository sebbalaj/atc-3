import Phaser from 'phaser';

const SATELLITE_TEXTURE = 'regional-satellite';

interface Point {
  x: number;
  y: number;
}

export class RegionalMapScene extends Phaser.Scene {
  #satellite: Phaser.GameObjects.Image | null = null;
  #shade!: Phaser.GameObjects.Graphics;
  #chart!: Phaser.GameObjects.Graphics;
  #sweep!: Phaser.GameObjects.Graphics;
  #labels: Phaser.GameObjects.Text[] = [];
  #lastWidth = 0;
  #lastHeight = 0;
  #lastReducedMotion: boolean | null = null;
  #radarCenter: Point = { x: 0, y: 0 };
  #radarRadius = 0;
  readonly #systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    super('regional-map');
  }

  preload(): void {
    this.load.image(SATELLITE_TEXTURE, './assets/maps/regional-satellite.jpg');
  }

  create(): void {
    if (this.textures.exists(SATELLITE_TEXTURE)) {
      this.#satellite = this.add.image(0, 0, SATELLITE_TEXTURE).setOrigin(0).setDepth(0);
    }
    this.#shade = this.add.graphics().setDepth(1);
    this.#chart = this.add.graphics().setDepth(2);
    this.#sweep = this.add.graphics().setDepth(3);
    this.#redrawMap();
  }

  override update(time: number): void {
    const resized = this.scale.width !== this.#lastWidth || this.scale.height !== this.#lastHeight;
    if (resized) {
      this.#redrawMap();
    }

    const reducedMotion =
      this.#systemReducedMotion.matches || document.documentElement.dataset.reduceMotion === 'true';
    if (!reducedMotion || resized || reducedMotion !== this.#lastReducedMotion) {
      this.#drawSweep(time, reducedMotion);
    }
    this.#lastReducedMotion = reducedMotion;
  }

  #redrawMap(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const radarHeight = height * (height <= 650 ? 0.7 : 0.75);
    this.#lastWidth = width;
    this.#lastHeight = height;
    this.#labels.forEach((label) => label.destroy());
    this.#labels = [];
    this.#chart.clear();
    this.#shade.clear();

    if (this.#satellite) {
      this.#fitSatellite(width, radarHeight);
    } else {
      this.#drawFallbackTerrain(width, radarHeight);
    }
    this.#shade.fillStyle(0x061419, this.#satellite ? 0.5 : 0.26);
    this.#shade.fillRect(0, 0, width, radarHeight);
    this.#shade.fillStyle(0x071015, 1);
    this.#shade.fillRect(0, radarHeight, width, height - radarHeight);

    this.#drawCoordinateGrid(width, radarHeight);
    this.#drawAirport(width, radarHeight);
    this.#drawSector(width, radarHeight);
    this.#drawMapLabels(width, radarHeight);
  }

  #fitSatellite(width: number, radarHeight: number): void {
    const satellite = this.#satellite;
    if (!satellite) {
      return;
    }
    const sourceWidth = satellite.width;
    const sourceHeight = satellite.height;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = width / radarHeight;

    if (targetRatio < sourceRatio) {
      const cropWidth = sourceHeight * targetRatio;
      satellite.setCrop((sourceWidth - cropWidth) / 2, 0, cropWidth, sourceHeight);
    } else {
      const cropHeight = sourceWidth / targetRatio;
      satellite.setCrop(0, (sourceHeight - cropHeight) / 2, sourceWidth, cropHeight);
    }
    satellite.setPosition(0, 0).setDisplaySize(width, radarHeight).setTint(0xa9b8aa);
  }

  #drawFallbackTerrain(width: number, radarHeight: number): void {
    this.#shade.fillStyle(0x153345, 1);
    this.#shade.fillRect(0, 0, width, radarHeight);
    this.#shade.fillStyle(0x273b2b, 1);
    this.#shade.beginPath();
    this.#shade.moveTo(width * 0.32, 0);
    this.#shade.lineTo(width, 0);
    this.#shade.lineTo(width, radarHeight);
    this.#shade.lineTo(width * 0.18, radarHeight);
    this.#shade.lineTo(width * 0.25, radarHeight * 0.78);
    this.#shade.lineTo(width * 0.22, radarHeight * 0.55);
    this.#shade.lineTo(width * 0.34, radarHeight * 0.3);
    this.#shade.closePath();
    this.#shade.fillPath();
    this.#shade.fillStyle(0x5a6546, 0.22);
    for (let y = 24; y < radarHeight; y += 36) {
      for (let x = width * 0.28; x < width; x += 42) {
        this.#shade.fillCircle(x, y, 8 + ((x + y) % 10));
      }
    }
  }

  #drawCoordinateGrid(width: number, radarHeight: number): void {
    const columns = 6;
    const rows = 9;
    this.#chart.lineStyle(1, 0x9db7ad, 0.12);
    for (let column = 1; column < columns; column += 1) {
      const x = (width / columns) * column;
      this.#chart.lineBetween(x, 0, x, radarHeight);
    }
    for (let row = 1; row < rows; row += 1) {
      const y = (radarHeight / rows) * row;
      this.#chart.lineBetween(0, y, width, y);
    }

    this.#chart.lineStyle(1, 0xc3d8cf, 0.28);
    const tickLength = 5;
    for (let x = 0; x <= width; x += width / columns) {
      this.#chart.lineBetween(x, 0, x, tickLength);
      this.#chart.lineBetween(x, radarHeight - tickLength, x, radarHeight);
    }
  }

  #drawAirport(width: number, radarHeight: number): void {
    const center = { x: width * 0.55, y: radarHeight * 0.56 };
    const angle = -0.16;
    const runwayLength = Math.min(width * 0.46, radarHeight * 0.33);
    const runwayWidth = Math.max(11, Math.min(16, width * 0.037));
    const transform = (localX: number, localY: number): Point => ({
      x: center.x + localX * Math.cos(angle) - localY * Math.sin(angle),
      y: center.y + localX * Math.sin(angle) + localY * Math.cos(angle),
    });

    const perimeterWidth = runwayLength * 0.72;
    const perimeterHeight = runwayWidth * 7.2;
    const perimeter = [
      transform(-perimeterWidth / 2, -perimeterHeight / 2),
      transform(perimeterWidth / 2, -perimeterHeight / 2),
      transform(perimeterWidth / 2, perimeterHeight / 2),
      transform(-perimeterWidth / 2, perimeterHeight / 2),
    ];
    this.#chart.fillStyle(0x17231f, 0.46);
    this.#fillPolygon(perimeter);
    this.#drawDashedPolygon(perimeter, 0xa7bdb4, 0.3);

    // Taxiway, apron, and terminal geometry use a muted aerodrome-chart hierarchy.
    this.#chart.lineStyle(Math.max(5, runwayWidth * 0.46), 0x6e705f, 0.86);
    const taxiStart = transform(-runwayLength * 0.31, runwayWidth * 1.2);
    const taxiMiddle = transform(runwayLength * 0.06, runwayWidth * 2.4);
    const taxiEnd = transform(runwayLength * 0.3, runwayWidth * 1.2);
    this.#chart.beginPath();
    this.#chart.moveTo(taxiStart.x, taxiStart.y);
    this.#chart.lineTo(taxiMiddle.x, taxiMiddle.y);
    this.#chart.lineTo(taxiEnd.x, taxiEnd.y);
    this.#chart.strokePath();
    this.#chart.lineStyle(1, 0xd2ba73, 0.62);
    this.#chart.beginPath();
    this.#chart.moveTo(taxiStart.x, taxiStart.y);
    this.#chart.lineTo(taxiMiddle.x, taxiMiddle.y);
    this.#chart.lineTo(taxiEnd.x, taxiEnd.y);
    this.#chart.strokePath();

    const apronCenter = transform(runwayLength * 0.02, runwayWidth * 3.25);
    this.#chart.fillStyle(0x555c55, 0.76);
    this.#chart.fillRoundedRect(
      apronCenter.x - runwayLength * 0.13,
      apronCenter.y - runwayWidth * 0.8,
      runwayLength * 0.26,
      runwayWidth * 1.6,
      3,
    );
    this.#chart.fillStyle(0x26302d, 0.94);
    this.#chart.fillRect(
      apronCenter.x - runwayLength * 0.11,
      apronCenter.y + runwayWidth * 0.9,
      runwayLength * 0.22,
      runwayWidth * 0.85,
    );
    this.#chart.fillStyle(0xc8cbbd, 0.35);
    for (let index = -2; index <= 2; index += 1) {
      this.#chart.fillRect(
        apronCenter.x + index * runwayLength * 0.04 - 1,
        apronCenter.y + runwayWidth * 0.2,
        2,
        runwayWidth * 0.7,
      );
    }

    const runway = [
      transform(-runwayLength / 2, -runwayWidth / 2),
      transform(runwayLength / 2, -runwayWidth / 2),
      transform(runwayLength / 2, runwayWidth / 2),
      transform(-runwayLength / 2, runwayWidth / 2),
    ];
    this.#chart.fillStyle(0x202727, 0.98);
    this.#fillPolygon(runway);
    this.#chart.lineStyle(1, 0xe0e5dc, 0.86);
    this.#strokePolygon(runway);

    this.#chart.lineStyle(1, 0xf1f0e6, 0.88);
    for (let localX = -runwayLength * 0.31; localX < runwayLength * 0.32; localX += 14) {
      const start = transform(localX, 0);
      const end = transform(Math.min(localX + 7, runwayLength * 0.32), 0);
      this.#chart.lineBetween(start.x, start.y, end.x, end.y);
    }

    for (const direction of [-1, 1] as const) {
      const thresholdX = direction * (runwayLength / 2 - 12);
      for (let stripe = -2; stripe <= 2; stripe += 1) {
        const start = transform(thresholdX, stripe * runwayWidth * 0.16 - runwayWidth * 0.055);
        const end = transform(thresholdX - direction * 7, stripe * runwayWidth * 0.16 - runwayWidth * 0.055);
        this.#chart.lineStyle(Math.max(1, runwayWidth * 0.09), 0xffffff, 0.92);
        this.#chart.lineBetween(start.x, start.y, end.x, end.y);
      }
    }

    this.#drawRunwayLights(transform, runwayLength, runwayWidth);
    this.#drawApproach(transform, runwayLength, runwayWidth, -1, '09');
    this.#drawApproach(transform, runwayLength, runwayWidth, 1, '27');

    const numberStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(8, runwayWidth * 0.66)}px`,
      color: '#f1f0e6',
      fontStyle: 'bold',
    };
    const marker09 = transform(-runwayLength / 2 + 27, 0);
    const marker27 = transform(runwayLength / 2 - 27, 0);
    this.#labels.push(
      this.add.text(marker09.x, marker09.y, '09', numberStyle).setOrigin(0.5).setRotation(angle).setDepth(4),
      this.add.text(marker27.x, marker27.y, '27', numberStyle).setOrigin(0.5).setRotation(angle).setDepth(4),
    );

    this.#radarCenter = center;
    this.#radarRadius = Math.max(width, radarHeight) * 0.58;
  }

  #drawRunwayLights(
    transform: (localX: number, localY: number) => Point,
    runwayLength: number,
    runwayWidth: number,
  ): void {
    this.#chart.fillStyle(0xe7eadc, 0.82);
    for (let localX = -runwayLength / 2; localX <= runwayLength / 2; localX += 12) {
      for (const localY of [-runwayWidth * 0.68, runwayWidth * 0.68]) {
        const light = transform(localX, localY);
        this.#chart.fillCircle(light.x, light.y, 0.9);
      }
    }
  }

  #drawApproach(
    transform: (localX: number, localY: number) => Point,
    runwayLength: number,
    runwayWidth: number,
    direction: -1 | 1,
    designation: string,
  ): void {
    const threshold = transform(direction * runwayLength / 2, 0);
    const outerX = direction * (runwayLength / 2 + Math.min(92, runwayLength * 0.46));
    const outerLeft = transform(outerX, -runwayWidth * 2.4);
    const outerRight = transform(outerX, runwayWidth * 2.4);
    const centerOuter = transform(outerX, 0);
    this.#chart.lineStyle(1, 0xd7c483, 0.5);
    this.#chart.lineBetween(threshold.x, threshold.y, outerLeft.x, outerLeft.y);
    this.#chart.lineBetween(threshold.x, threshold.y, outerRight.x, outerRight.y);
    this.#chart.lineBetween(outerLeft.x, outerLeft.y, outerRight.x, outerRight.y);
    this.#chart.lineStyle(1, 0xd7c483, 0.3);
    this.#chart.lineBetween(threshold.x, threshold.y, centerOuter.x, centerOuter.y);

    const labelX = Phaser.Math.Clamp(centerOuter.x, 34, this.scale.width - 34);
    const labelY = Phaser.Math.Clamp(centerOuter.y - 13, 92, this.#lastHeight * 0.68);
    this.#labels.push(
      this.add
        .text(labelX, labelY, `RWY ${designation}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          color: '#e1cf91',
          backgroundColor: '#071015cc',
          padding: { x: 3, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(4),
    );
  }

  #drawSector(width: number, radarHeight: number): void {
    const center = this.#radarCenter;
    const ringStep = Math.min(width, radarHeight) * 0.19;
    this.#chart.lineStyle(1, 0xa9c9bc, 0.24);
    for (let ring = 1; ring <= 4; ring += 1) {
      this.#chart.strokeCircle(center.x, center.y, ringStep * ring);
    }
    this.#chart.lineStyle(1, 0xa9c9bc, 0.18);
    for (let degrees = 0; degrees < 360; degrees += 45) {
      const angle = Phaser.Math.DegToRad(degrees);
      this.#chart.lineBetween(
        center.x,
        center.y,
        center.x + Math.cos(angle) * this.#radarRadius,
        center.y + Math.sin(angle) * this.#radarRadius,
      );
    }

    this.#chart.lineStyle(1, 0xc2d8cf, 0.38);
    this.#chart.strokeCircle(center.x, center.y, 3);

    const compassX = width - 25;
    const compassY = 58;
    this.#chart.lineStyle(2, 0xd4e2dc, 0.66);
    this.#chart.lineBetween(compassX, compassY + 18, compassX, compassY - 14);
    this.#chart.lineBetween(compassX, compassY - 14, compassX - 4, compassY - 7);
    this.#chart.lineBetween(compassX, compassY - 14, compassX + 4, compassY - 7);
  }

  #drawMapLabels(width: number, radarHeight: number): void {
    const commonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#c8dad3',
      backgroundColor: '#061216c7',
      padding: { x: 5, y: 3 },
    };
    this.#labels.push(
      this.add.text(12, 44, 'REGIONAL CONTROL AREA', commonStyle).setDepth(4),
      this.add
        .text(12, 63, 'SECTOR R-1  •  118.70', {
          ...commonStyle,
          fontSize: '8px',
          color: '#9cb3aa',
        })
        .setDepth(4),
      this.add
        .text(this.#radarCenter.x, this.#radarCenter.y - 42, 'REGIONAL AIRFIELD  •  REG', {
          ...commonStyle,
          fontSize: '9px',
          color: '#e0e8e4',
        })
        .setOrigin(0.5)
        .setDepth(4),
      this.add
        .text(this.#radarCenter.x, this.#radarCenter.y - 27, 'RWY 09/27  •  ELEV 214', {
          ...commonStyle,
          fontSize: '8px',
          color: '#aebfb8',
        })
        .setOrigin(0.5)
        .setDepth(4),
      this.add.text(width - 25, 31, 'N', { ...commonStyle, backgroundColor: '#00000000' }).setOrigin(0.5).setDepth(4),
      this.add
        .text(9, radarHeight - 18, 'NASA EARTHDATA GIBS • FICTIONAL AIRSPACE • NOT FOR NAVIGATION', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '7px',
          color: '#adc0b8',
          backgroundColor: '#061216b8',
          padding: { x: 3, y: 2 },
        })
        .setDepth(4),
    );
  }

  #drawSweep(time: number, reducedMotion: boolean): void {
    const angle = reducedMotion ? -Math.PI / 2 : (time / 9_000) * Math.PI * 2;
    const end = {
      x: this.#radarCenter.x + Math.cos(angle) * this.#radarRadius,
      y: this.#radarCenter.y + Math.sin(angle) * this.#radarRadius,
    };
    this.#sweep.clear();
    this.#sweep.lineStyle(2, 0x9dd4bf, reducedMotion ? 0.17 : 0.32);
    this.#sweep.lineBetween(this.#radarCenter.x, this.#radarCenter.y, end.x, end.y);
  }

  #fillPolygon(points: Point[]): void {
    const first = points[0];
    if (!first) {
      return;
    }
    this.#chart.beginPath();
    this.#chart.moveTo(first.x, first.y);
    points.slice(1).forEach((point) => this.#chart.lineTo(point.x, point.y));
    this.#chart.closePath();
    this.#chart.fillPath();
  }

  #strokePolygon(points: Point[]): void {
    const first = points[0];
    if (!first) {
      return;
    }
    this.#chart.beginPath();
    this.#chart.moveTo(first.x, first.y);
    points.slice(1).forEach((point) => this.#chart.lineTo(point.x, point.y));
    this.#chart.closePath();
    this.#chart.strokePath();
  }

  #drawDashedPolygon(points: Point[], color: number, alpha: number): void {
    this.#chart.lineStyle(1, color, alpha);
    for (let index = 0; index < points.length; index += 1) {
      const from = points[index];
      const to = points[(index + 1) % points.length];
      if (!from || !to) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const steps = Math.max(1, Math.floor(distance / 9));
      for (let step = 0; step < steps; step += 2) {
        const startT = step / steps;
        const endT = Math.min(1, (step + 1) / steps);
        this.#chart.lineBetween(
          Phaser.Math.Linear(from.x, to.x, startT),
          Phaser.Math.Linear(from.y, to.y, startT),
          Phaser.Math.Linear(from.x, to.x, endT),
          Phaser.Math.Linear(from.y, to.y, endT),
        );
      }
    }
  }
}

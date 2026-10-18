import type { AircraftSimulationConfig } from '../config/aircraftSimulation';
import { createAircraftWorld, type AircraftSnapshot, type AircraftWorld } from '../domain/components/Aircraft';
import { moveAircraft } from '../domain/systems/moveAircraft';
import { removeExitedAircraft } from '../domain/systems/removeAircraft';
import { minimumPairDistance, spawnDebugPopulation, spawnPerimeterAircraft } from '../domain/systems/spawnAircraft';
import { SeededRng } from '../shared/SeededRng';

export interface AircraftSimulationOptions {
  seed: number;
  debugAircraftCount?: number;
  config: AircraftSimulationConfig;
}

export interface AircraftSimulationFrame {
  readonly tick: number;
  readonly alpha: number;
  readonly aircraft: readonly AircraftSnapshot[];
  readonly removedIds: readonly number[];
  readonly droppedBacklog: boolean;
}

export interface AircraftSimulationDiagnostics {
  tick: number;
  activeAircraft: number;
  rngState: number;
  minimumPairDistance: number;
  droppedBacklogFrames: number;
}

export class AircraftSimulation {
  readonly #config: AircraftSimulationConfig;
  readonly #rng: SeededRng;
  readonly #world: AircraftWorld = createAircraftWorld();
  #accumulator = 0;
  #tick = 0;
  #nextSpawnTick: number;
  #lastRemovedIds: number[] = [];
  #snapshot: readonly AircraftSnapshot[] = [];
  #droppedBacklogFrames = 0;
  readonly #debugMode: boolean;

  constructor(options: AircraftSimulationOptions) {
    this.#config = options.config;
    this.#rng = new SeededRng(options.seed);
    this.#debugMode = (options.debugAircraftCount ?? 0) > 0;

    if (this.#debugMode) {
      spawnDebugPopulation(this.#world, this.#rng, options.debugAircraftCount ?? 100);
    } else {
      for (let index = 0; index < this.#config.initialAircraftCount; index += 1) {
        spawnPerimeterAircraft(this.#world, this.#rng, this.#config);
      }
    }
    this.#nextSpawnTick = this.#config.spawnIntervalTicks;
    this.#snapshot = this.#createSnapshot();
  }

  advance(frameSeconds: number): AircraftSimulationFrame {
    this.#accumulator += Math.min(
      Math.max(frameSeconds, 0),
      this.#config.maximumFrameSeconds,
    );
    let steps = 0;
    let droppedBacklog = false;
    this.#lastRemovedIds = [];

    while (
      this.#accumulator >= this.#config.fixedStepSeconds &&
      steps < this.#config.maximumCatchUpSteps
    ) {
      this.#step();
      this.#accumulator -= this.#config.fixedStepSeconds;
      steps += 1;
    }

    if (this.#accumulator >= this.#config.fixedStepSeconds) {
      this.#accumulator %= this.#config.fixedStepSeconds;
      this.#droppedBacklogFrames += 1;
      droppedBacklog = true;
    }

    return {
      tick: this.#tick,
      alpha: this.#accumulator / this.#config.fixedStepSeconds,
      aircraft: this.#snapshot,
      removedIds: this.#lastRemovedIds,
      droppedBacklog,
    };
  }

  diagnostics(): AircraftSimulationDiagnostics {
    return {
      tick: this.#tick,
      activeAircraft: this.#world.aircraft.size,
      rngState: this.#rng.state,
      minimumPairDistance: minimumPairDistance(this.#world),
      droppedBacklogFrames: this.#droppedBacklogFrames,
    };
  }

  signature(): string {
    return this.#snapshot
      .map((aircraft) => `${aircraft.id}:${aircraft.x.toFixed(6)}:${aircraft.y.toFixed(6)}`)
      .join('|');
  }

  destroy(): void {
    this.#world.aircraft.clear();
    this.#snapshot = [];
    this.#lastRemovedIds = [];
    this.#accumulator = 0;
  }

  #step(): void {
    this.#tick += 1;
    if (!this.#debugMode && this.#tick >= this.#nextSpawnTick) {
      this.#nextSpawnTick += this.#config.spawnIntervalTicks;
      if (this.#world.aircraft.size < this.#config.maximumNormalAircraft) {
        spawnPerimeterAircraft(this.#world, this.#rng, this.#config);
      }
    }

    moveAircraft(this.#world, this.#config.fixedStepSeconds);
    this.#lastRemovedIds.push(
      ...removeExitedAircraft(this.#world, this.#config.removalMargin),
    );
    this.#snapshot = this.#createSnapshot();
  }

  #createSnapshot(): readonly AircraftSnapshot[] {
    return [...this.#world.aircraft.values()].map((aircraft) => ({
      id: aircraft.id,
      type: aircraft.type,
      callsign: aircraft.callsign,
      altitudeFeet: aircraft.altitudeFeet,
      destinationLabel: aircraft.destinationLabel,
      x: aircraft.x,
      y: aircraft.y,
      previousX: aircraft.previousX,
      previousY: aircraft.previousY,
      headingRadians: aircraft.headingRadians,
      lifecycle: aircraft.lifecycle,
    }));
  }
}

import { LIGHT_PROP } from '../../content/aircraft/lightProp';
import type { AircraftEntity, AircraftWorld } from '../components/Aircraft';
import type { AircraftSimulationConfig } from '../../config/aircraftSimulation';
import type { SeededRng } from '../../shared/SeededRng';

const CALLSIGN_PREFIXES = ['N', 'REG', 'SKY', 'COA', 'PAC', 'CAS'] as const;

interface SpawnCandidate {
  x: number;
  y: number;
  headingRadians: number;
  speed: number;
  callsign: string;
  altitudeFeet: number;
}

export function spawnPerimeterAircraft(
  world: AircraftWorld,
  rng: SeededRng,
  config: AircraftSimulationConfig,
): AircraftEntity | null {
  for (let attempt = 0; attempt < config.spawnAttempts; attempt += 1) {
    const candidate = createPerimeterCandidate(rng, config.spawnMargin);
    if (hasSpawnClearance(world, candidate.x, candidate.y, config.spawnClearance)) {
      return addCandidate(world, candidate);
    }
  }
  return null;
}

export function spawnDebugPopulation(
  world: AircraftWorld,
  rng: SeededRng,
  count: number,
): void {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = 0.05 + (column / Math.max(1, columns - 1)) * 0.9;
    const y = 0.05 + (row / Math.max(1, rows - 1)) * 0.9;
    const headingRadians = 0;
    const speed = (LIGHT_PROP.minimumSpeed + LIGHT_PROP.maximumSpeed) / 2;
    addCandidate(world, {
      x,
      y,
      headingRadians,
      speed,
      callsign: createCallsign(rng),
      altitudeFeet: createAltitude(rng),
    });
  }
}

export function minimumPairDistance(world: AircraftWorld): number {
  const aircraft = [...world.aircraft.values()];
  let minimum = Number.POSITIVE_INFINITY;
  for (let first = 0; first < aircraft.length; first += 1) {
    const a = aircraft[first];
    if (!a) continue;
    for (let second = first + 1; second < aircraft.length; second += 1) {
      const b = aircraft[second];
      if (!b) continue;
      minimum = Math.min(minimum, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return minimum;
}

function createPerimeterCandidate(rng: SeededRng, margin: number): SpawnCandidate {
  const edge = rng.integer(0, 4);
  const edgePosition = rng.range(0.08, 0.92);
  const inwardJitter = rng.range(-0.22, 0.22);
  let x: number;
  let y: number;
  let headingRadians: number;

  switch (edge) {
    case 0:
      x = -margin;
      y = edgePosition;
      headingRadians = inwardJitter;
      break;
    case 1:
      x = 1 + margin;
      y = edgePosition;
      headingRadians = Math.PI + inwardJitter;
      break;
    case 2:
      x = edgePosition;
      y = -margin;
      headingRadians = Math.PI / 2 + inwardJitter;
      break;
    default:
      x = edgePosition;
      y = 1 + margin;
      headingRadians = -Math.PI / 2 + inwardJitter;
      break;
  }

  return {
    x,
    y,
    headingRadians,
    speed: rng.range(LIGHT_PROP.minimumSpeed, LIGHT_PROP.maximumSpeed),
    callsign: createCallsign(rng),
    altitudeFeet: createAltitude(rng),
  };
}

function hasSpawnClearance(
  world: AircraftWorld,
  x: number,
  y: number,
  clearance: number,
): boolean {
  const clearanceSquared = clearance * clearance;
  for (const aircraft of world.aircraft.values()) {
    const deltaX = aircraft.x - x;
    const deltaY = aircraft.y - y;
    if (deltaX * deltaX + deltaY * deltaY < clearanceSquared) {
      return false;
    }
  }
  return true;
}

function addCandidate(world: AircraftWorld, candidate: SpawnCandidate): AircraftEntity {
  const id = world.nextAircraftId;
  world.nextAircraftId += 1;
  const velocityX = Math.cos(candidate.headingRadians) * candidate.speed;
  const velocityY = Math.sin(candidate.headingRadians) * candidate.speed;
  const aircraft: AircraftEntity = {
    id,
    type: LIGHT_PROP.type,
    callsign: candidate.callsign,
    altitudeFeet: candidate.altitudeFeet,
    destinationLabel: LIGHT_PROP.destinationLabel,
    x: candidate.x,
    y: candidate.y,
    previousX: candidate.x,
    previousY: candidate.y,
    velocityX,
    velocityY,
    headingRadians: candidate.headingRadians,
    speed: candidate.speed,
    hasEnteredAirspace: candidate.x >= 0 && candidate.x <= 1 && candidate.y >= 0 && candidate.y <= 1,
    lifecycle: 'INBOUND',
  };
  world.aircraft.set(id, aircraft);
  return aircraft;
}

function createCallsign(rng: SeededRng): string {
  const prefix = CALLSIGN_PREFIXES[rng.integer(0, CALLSIGN_PREFIXES.length)] ?? 'REG';
  return `${prefix}${rng.integer(101, 999)}`;
}

function createAltitude(rng: SeededRng): number {
  const hundreds = rng.integer(
    LIGHT_PROP.minimumAltitudeFeet / 100,
    LIGHT_PROP.maximumAltitudeFeet / 100 + 1,
  );
  return hundreds * 100;
}

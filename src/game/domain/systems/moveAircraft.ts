import type { AircraftWorld } from '../components/Aircraft';

export function moveAircraft(world: AircraftWorld, fixedStepSeconds: number): void {
  for (const aircraft of world.aircraft.values()) {
    aircraft.previousX = aircraft.x;
    aircraft.previousY = aircraft.y;
    aircraft.x += aircraft.velocityX * fixedStepSeconds;
    aircraft.y += aircraft.velocityY * fixedStepSeconds;

    if (aircraft.x >= 0 && aircraft.x <= 1 && aircraft.y >= 0 && aircraft.y <= 1) {
      aircraft.hasEnteredAirspace = true;
    }
  }
}

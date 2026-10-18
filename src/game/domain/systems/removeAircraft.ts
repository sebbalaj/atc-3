import type { AircraftId, AircraftWorld } from '../components/Aircraft';

export function removeExitedAircraft(world: AircraftWorld, removalMargin: number): AircraftId[] {
  const removed: AircraftId[] = [];
  for (const [id, aircraft] of world.aircraft) {
    if (
      aircraft.hasEnteredAirspace &&
      (aircraft.x < -removalMargin ||
        aircraft.x > 1 + removalMargin ||
        aircraft.y < -removalMargin ||
        aircraft.y > 1 + removalMargin)
    ) {
      world.aircraft.delete(id);
      removed.push(id);
    }
  }
  return removed;
}

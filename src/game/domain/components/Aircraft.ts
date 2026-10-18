export type AircraftId = number;

export interface AircraftEntity {
  id: AircraftId;
  type: 'light-prop';
  callsign: string;
  altitudeFeet: number;
  destinationLabel: string;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  headingRadians: number;
  speed: number;
  hasEnteredAirspace: boolean;
  lifecycle: 'INBOUND';
}

export interface AircraftWorld {
  aircraft: Map<AircraftId, AircraftEntity>;
  nextAircraftId: number;
}

export interface AircraftSnapshot {
  readonly id: AircraftId;
  readonly type: 'light-prop';
  readonly callsign: string;
  readonly altitudeFeet: number;
  readonly destinationLabel: string;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly headingRadians: number;
  readonly lifecycle: 'INBOUND';
}

export function createAircraftWorld(): AircraftWorld {
  return {
    aircraft: new Map(),
    nextAircraftId: 1,
  };
}

export interface AircraftSimulationConfig {
  fixedStepSeconds: number;
  maximumFrameSeconds: number;
  maximumCatchUpSteps: number;
  spawnIntervalTicks: number;
  spawnClearance: number;
  spawnAttempts: number;
  spawnMargin: number;
  removalMargin: number;
  initialAircraftCount: number;
  maximumNormalAircraft: number;
}

export const AIRCRAFT_SIMULATION_CONFIG: AircraftSimulationConfig = {
  fixedStepSeconds: 1 / 30,
  maximumFrameSeconds: 0.1,
  maximumCatchUpSteps: 5,
  spawnIntervalTicks: 150,
  spawnClearance: 0.105,
  spawnAttempts: 12,
  spawnMargin: 0.045,
  removalMargin: 0.12,
  initialAircraftCount: 4,
  maximumNormalAircraft: 12,
};

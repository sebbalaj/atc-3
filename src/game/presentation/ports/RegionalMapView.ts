export interface RadarViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlightStripItem {
  id: number;
  callsign: string;
  aircraftType: string;
  altitude: string;
  destination: string;
  state: string;
}

export interface RegionalMapView {
  getRadarViewport(canvasWidth: number, canvasHeight: number): RadarViewport;
  reconcileFlightStrips(items: readonly FlightStripItem[]): void;
  clearFlightStrips(): void;
  setSimulationDiagnostics(text: string): void;
}

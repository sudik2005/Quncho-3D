export interface GpxPoint {
    lat: number;
    lon: number;
    ele: number;
    time: Date | null;
}

export interface GpxTrackData {
    name: string;
    points: GpxPoint[];
    totalDistance: number; // in km
    elevationGain: number; // in meters
    elevationLoss: number; // in meters
    maxElevation: number; // in meters
    minElevation: number; // in meters
    estimatedPace: number; // min/km
    duration: number; // in seconds
    startPoint: GpxPoint | null;
    endPoint: GpxPoint | null;
}

export interface ElevationDataPoint {
    distance: number; // cumulative distance in km
    elevation: number; // elevation in meters
}

import { GpxPoint, GpxTrackData, ElevationDataPoint } from "@/types/gpx";

/**
 * Haversine formula to calculate distance between two GPS points
 */
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Parse GPX file content and extract track data
 */
export async function parseGpxFile(file: File): Promise<GpxTrackData> {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    // Get track name
    const nameEl = xmlDoc.querySelector("trk > name") || xmlDoc.querySelector("name");
    const name = nameEl?.textContent || file.name.replace(".gpx", "");

    // Extract all track points
    const trkpts = xmlDoc.querySelectorAll("trkpt");
    const points: GpxPoint[] = [];

    trkpts.forEach((pt) => {
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");
        const eleEl = pt.querySelector("ele");
        const timeEl = pt.querySelector("time");

        points.push({
            lat,
            lon,
            ele: eleEl ? parseFloat(eleEl.textContent || "0") : 0,
            time: timeEl ? new Date(timeEl.textContent || "") : null,
        });
    });

    // If no trkpts found, try route points (rtept)
    if (points.length === 0) {
        const rtepts = xmlDoc.querySelectorAll("rtept");
        rtepts.forEach((pt) => {
            const lat = parseFloat(pt.getAttribute("lat") || "0");
            const lon = parseFloat(pt.getAttribute("lon") || "0");
            const eleEl = pt.querySelector("ele");
            const timeEl = pt.querySelector("time");

            points.push({
                lat,
                lon,
                ele: eleEl ? parseFloat(eleEl.textContent || "0") : 0,
                time: timeEl ? new Date(timeEl.textContent || "") : null,
            });
        });
    }

    // Calculate stats
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;

    for (let i = 0; i < points.length; i++) {
        if (points[i].ele > maxElevation) maxElevation = points[i].ele;
        if (points[i].ele < minElevation) minElevation = points[i].ele;

        if (i > 0) {
            const dist = haversineDistance(
                points[i - 1].lat,
                points[i - 1].lon,
                points[i].lat,
                points[i].lon
            );
            totalDistance += dist;

            const eleDiff = points[i].ele - points[i - 1].ele;
            if (eleDiff > 0) elevationGain += eleDiff;
            else elevationLoss += Math.abs(eleDiff);
        }
    }

    // Calculate duration if timestamps available
    let duration = 0;
    if (
        points.length >= 2 &&
        points[0].time &&
        points[points.length - 1].time
    ) {
        duration =
            (points[points.length - 1].time!.getTime() -
                points[0].time!.getTime()) /
            1000;
    }

    // Estimated pace (min/km)
    const estimatedPace =
        totalDistance > 0 && duration > 0 ? duration / 60 / totalDistance : 0;

    return {
        name,
        points,
        totalDistance,
        elevationGain,
        elevationLoss,
        maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
        minElevation: minElevation === Infinity ? 0 : minElevation,
        estimatedPace,
        duration,
        startPoint: points.length > 0 ? points[0] : null,
        endPoint: points.length > 0 ? points[points.length - 1] : null,
    };
}

/**
 * Generate elevation profile data for the chart
 */
export function generateElevationProfile(
    points: GpxPoint[]
): ElevationDataPoint[] {
    const profile: ElevationDataPoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < points.length; i++) {
        if (i > 0) {
            cumulativeDistance += haversineDistance(
                points[i - 1].lat,
                points[i - 1].lon,
                points[i].lat,
                points[i].lon
            );
        }

        profile.push({
            distance: parseFloat(cumulativeDistance.toFixed(2)),
            elevation: parseFloat(points[i].ele.toFixed(1)),
        });
    }

    // Downsample to ~200 points for performance
    if (profile.length > 200) {
        const step = Math.floor(profile.length / 200);
        const downsampled: ElevationDataPoint[] = [];
        for (let i = 0; i < profile.length; i += step) {
            downsampled.push(profile[i]);
        }
        // Always include the last point
        if (downsampled[downsampled.length - 1] !== profile[profile.length - 1]) {
            downsampled.push(profile[profile.length - 1]);
        }
        return downsampled;
    }

    return profile;
}

/**
 * Convert GpxPoints to GeoJSON LineString coordinates
 */
export function pointsToGeoJSON(points: GpxPoint[]): GeoJSON.Feature {
    return {
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lon, p.lat, p.ele]),
        },
    };
}

/**
 * Format duration from seconds to readable string
 */
export function formatDuration(seconds: number): string {
    if (seconds === 0) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Format pace to mm:ss/km
 */
export function formatPace(paceMinPerKm: number): string {
    if (paceMinPerKm === 0) return "N/A";
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GpxTrackData } from "@/types/gpx";
import { pointsToGeoJSON } from "@/lib/gpx-parser";

interface MapViewportProps {
    trackData: GpxTrackData | null;
}

// Ethiopian Highlands center coordinates
const ETHIOPIA_CENTER: [number, number] = [39.5, 9.0];
const INITIAL_ZOOM = 6;
const MAPTILER_KEY = "get_your_free_key"; // Users should replace with their free MapTiler key

export default function MapViewport({ trackData }: MapViewportProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const startMarker = useRef<maplibregl.Marker | null>(null);
    const endMarker = useRef<maplibregl.Marker | null>(null);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const mapInstance = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                name: "Dark Terrain",
                sources: {
                    "osm-tiles": {
                        type: "raster",
                        tiles: [
                            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                        ],
                        tileSize: 256,
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                        maxzoom: 19,
                    },
                    terrainSource: {
                        type: "raster-dem",
                        tiles: [
                            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
                        ],
                        encoding: "terrarium",
                        tileSize: 256,
                        maxzoom: 15,
                    },
                    hillshadeSource: {
                        type: "raster-dem",
                        tiles: [
                            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
                        ],
                        encoding: "terrarium",
                        tileSize: 256,
                        maxzoom: 15,
                    },
                },
                layers: [
                    {
                        id: "osm-tiles-layer",
                        type: "raster",
                        source: "osm-tiles",
                        minzoom: 0,
                        maxzoom: 19,
                    },
                    {
                        id: "hillshade",
                        type: "hillshade",
                        source: "hillshadeSource",
                        paint: {
                            "hillshade-exaggeration": 0.6,
                            "hillshade-shadow-color": "#000000",
                            "hillshade-highlight-color": "#ffffff",
                            "hillshade-accent-color": "#1a1a2e",
                        },
                    },
                ],
                terrain: {
                    source: "terrainSource",
                    exaggeration: 1.5,
                },
                glyphs:
                    "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
            },
            center: ETHIOPIA_CENTER,
            zoom: INITIAL_ZOOM,
            pitch: 45,
            bearing: -15,
            maxPitch: 85,
        } as maplibregl.MapOptions);

        mapInstance.addControl(
            new maplibregl.NavigationControl({ visualizePitch: true }),
            "top-right"
        );

        mapInstance.addControl(new maplibregl.ScaleControl(), "bottom-right");

        map.current = mapInstance;

        return () => {
            mapInstance.remove();
            map.current = null;
        };
    }, []);

    // Draw route when track data changes
    const drawRoute = useCallback(
        (mapInstance: maplibregl.Map, data: GpxTrackData) => {
            // Remove existing route layers and source
            if (mapInstance.getLayer("route-glow-outer")) {
                mapInstance.removeLayer("route-glow-outer");
            }
            if (mapInstance.getLayer("route-glow-inner")) {
                mapInstance.removeLayer("route-glow-inner");
            }
            if (mapInstance.getLayer("route-line")) {
                mapInstance.removeLayer("route-line");
            }
            if (mapInstance.getSource("route")) {
                mapInstance.removeSource("route");
            }

            const geojson = pointsToGeoJSON(data.points);

            mapInstance.addSource("route", {
                type: "geojson",
                data: geojson,
            });

            // Outer glow layer
            mapInstance.addLayer({
                id: "route-glow-outer",
                type: "line",
                source: "route",
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#00d4ff",
                    "line-width": 12,
                    "line-opacity": 0.15,
                    "line-blur": 8,
                },
            });

            // Inner glow layer
            mapInstance.addLayer({
                id: "route-glow-inner",
                type: "line",
                source: "route",
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#00d4ff",
                    "line-width": 6,
                    "line-opacity": 0.4,
                    "line-blur": 4,
                },
            });

            // Core route line
            mapInstance.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#00d4ff",
                    "line-width": 3,
                    "line-opacity": 0.95,
                },
            });

            // Add start marker
            if (startMarker.current) {
                startMarker.current.remove();
            }
            if (data.startPoint) {
                const startEl = document.createElement("div");
                startEl.className = "start-marker";
                startEl.innerHTML = `
          <div style="
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            background: #00ff87; 
            border: 3px solid #ffffff; 
            box-shadow: 0 0 15px rgba(0, 255, 135, 0.6), 0 0 30px rgba(0, 255, 135, 0.3);
            animation: pulse 2s ease-in-out infinite;
          "></div>
        `;
                startMarker.current = new maplibregl.Marker({ element: startEl })
                    .setLngLat([data.startPoint.lon, data.startPoint.lat])
                    .setPopup(
                        new maplibregl.Popup({ offset: 15 }).setHTML(
                            `<div style="color:#000;font-weight:600;font-size:13px;">🚀 Start</div>`
                        )
                    )
                    .addTo(mapInstance);
            }

            // Add end marker
            if (endMarker.current) {
                endMarker.current.remove();
            }
            if (data.endPoint) {
                const endEl = document.createElement("div");
                endEl.className = "end-marker";
                endEl.innerHTML = `
          <div style="
            width: 20px; 
            height: 20px; 
            border-radius: 50%; 
            background: #ff3366; 
            border: 3px solid #ffffff; 
            box-shadow: 0 0 15px rgba(255, 51, 102, 0.6), 0 0 30px rgba(255, 51, 102, 0.3);
          "></div>
        `;
                endMarker.current = new maplibregl.Marker({ element: endEl })
                    .setLngLat([data.endPoint.lon, data.endPoint.lat])
                    .setPopup(
                        new maplibregl.Popup({ offset: 15 }).setHTML(
                            `<div style="color:#000;font-weight:600;font-size:13px;">🏁 Finish</div>`
                        )
                    )
                    .addTo(mapInstance);
            }

            // Fly to the start of the route with 3D perspective
            if (data.startPoint) {
                mapInstance.flyTo({
                    center: [data.startPoint.lon, data.startPoint.lat],
                    zoom: 13,
                    pitch: 60,
                    bearing: 30,
                    duration: 3000,
                    essential: true,
                });

                // --- NEW: Elevation Backfilling Logic ---
                // If the file has 0 elevation gain, try to find the elevation using the map's terrain data
                if (data.elevationGain === 0) {
                    // We wait a tiny bit for terrain to load
                    setTimeout(() => {
                        let totalGain = 0;
                        let totalLoss = 0;
                        let maxEle = -Infinity;
                        let lastEle: number | null = null;

                        const enrichedPoints = data.points.map((p) => {
                            const mapEle = mapInstance.queryTerrainElevation([p.lon, p.lat]) || 0;
                            if (mapEle > maxEle) maxEle = mapEle;
                            
                            if (lastEle !== null) {
                                const diff = mapEle - lastEle;
                                if (diff > 0) totalGain += diff;
                                else totalLoss += Math.abs(diff);
                            }
                            lastEle = mapEle;
                            return { ...p, ele: mapEle };
                        });

                        // Notify parent with enriched data (Distance/Time remain same)
                        // This dynamically fixes "Empty Elevation" files like Google Maps exports
                        if (totalGain > 0) {
                          const event = new CustomEvent("enrich-track", {
                            detail: {
                                ...data,
                                points: enrichedPoints,
                                elevationGain: totalGain,
                                elevationLoss: totalLoss,
                                maxElevation: maxEle,
                            }
                          });
                          window.dispatchEvent(event);
                        }
                    }, 1500);
                }
            }
        },
        []
    );

    useEffect(() => {
        if (!map.current || !trackData) return;

        const mapInstance = map.current;

        if (mapInstance.isStyleLoaded()) {
            drawRoute(mapInstance, trackData);
        } else {
            mapInstance.on("load", () => {
                drawRoute(mapInstance, trackData);
            });
        }
    }, [trackData, drawRoute]);

    // Function to toggle between 3D and 2D view
    const toggle3D = useCallback(() => {
        if (!map.current) return;
        const currentPitch = map.current.getPitch();
        map.current.easeTo({
            pitch: currentPitch > 10 ? 0 : 60,
            bearing: currentPitch > 10 ? 0 : 30,
            duration: 1000,
        });
    }, []);

    // Reset camera to show whole route
    const resetCamera = useCallback(() => {
        if (!map.current || !trackData) return;
        const bounds = new maplibregl.LngLatBounds();
        trackData.points.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.current.fitBounds(bounds, {
            padding: 80,
            pitch: 45,
            bearing: -15,
            duration: 1500,
        });
    }, [trackData]);

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Map overlay gradient */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Map Controls Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                <button
                    onClick={toggle3D}
                    className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    Toggle 3D
                </button>
                <button
                    onClick={resetCamera}
                    disabled={!trackData}
                    className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    Fit Route
                </button>
            </div>

            {/* Coordinate display */}
            <div className="absolute bottom-3 left-3 pointer-events-none">
                <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white/60 font-mono">
                    {trackData?.startPoint
                        ? `${trackData.startPoint.lat.toFixed(4)}°N, ${trackData.startPoint.lon.toFixed(4)}°E`
                        : "Ethiopian Highlands · 9.0°N, 39.5°E"}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      ` }} />
        </div>
    );
}

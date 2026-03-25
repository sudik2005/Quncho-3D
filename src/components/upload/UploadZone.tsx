"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Upload, 
    FileUp, 
    X, 
    CheckCircle2, 
    AlertCircle,
    Link as LinkIcon
} from "lucide-react";

interface UploadZoneProps {
    onFileUpload: (file: File) => void;
    isLoading: boolean;
    fileName: string | null;
}

export default function UploadZone({
    onFileUpload,
    isLoading,
    fileName,
}: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback(
        (file: File) => {
            setError(null);
            if (!file.name.toLowerCase().endsWith(".gpx")) {
                setError("Please upload a .GPX file");
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setError("File size must be under 50MB");
                return;
            }
            onFileUpload(file);
        },
        [onFileUpload]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile]
    );

    const [googleUrl, setGoogleUrl] = useState("");

    const handleGoogleMapsConvert = useCallback(async () => {
        if (!googleUrl) return;
        setError(null);
        onFileUpload(new File([], "loading_route_data.gpx")); 

        try {
            let finalUrl = googleUrl;
            let htmlContent = "";

            // 1. Triple-Proxy Expansion Engine
            if (googleUrl.includes("maps.app.goo.gl") || googleUrl.includes("goo.gl/maps")) {
                const proxyServices = [
                    `https://api.allorigins.win/get?url=${encodeURIComponent(googleUrl)}`,
                    `https://corsproxy.io/?${encodeURIComponent(googleUrl)}`,
                    `https://proxy.cors.sh/${googleUrl}`
                ];
                for (const svc of proxyServices) {
                    try {
                        const res = await fetch(svc);
                        const data = svc.includes("allorigins") ? await res.json() : { contents: await res.text() };
                        htmlContent = data.contents || data;
                        const expandedMatch = htmlContent.match(/https:\/\/www\.google\.[a-z.]+\/maps\/[^"']+/i);
                        if (expandedMatch) { finalUrl = expandedMatch[0]; break; }
                    } catch (e) { continue; }
                }
            }

            // 2. Optimized Sequential Harvester
            const scanSource = finalUrl + " " + htmlContent;
            const coordRegex = /(-?\d+\.\d{4,})[%,!/d]*,\s?(-?\d+\.\d{4,})/g;
            let sequentialCoords: [number, number][] = [];
            
            // Capture every Lat/Lon pair in the exact order they appear
            const matches = [...scanSource.matchAll(coordRegex)];
            matches.forEach(m => {
                const lat = parseFloat(m[1]);
                const lon = parseFloat(m[2]);
                if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                    sequentialCoords.push([lat, lon]);
                }
            });

            // 3. Fallback: Place Name Extraction (only if no coordinates found)
            if (sequentialCoords.length === 0) {
                const candidates = finalUrl.split(/[\/\\?&=+!]/).filter(c => c.length > 5 && !c.includes("google") && !c.includes("maps"));
                if (candidates.length > 0) {
                    const searchResults = await Promise.all(candidates.slice(0, 2).map(async (q) => {
                        try {
                            const name = q.split("@")[0].replace(/\+/g, " ");
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`);
                            const data = await res.json();
                            return data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number] : null;
                        } catch (e) { return null; }
                    }));
                    sequentialCoords = searchResults.filter(r => r !== null) as [number, number][];
                }
            }

            // 4. Deduplicate while preserving Natural Order
            const uniqueCoords = sequentialCoords.filter((c, index, self) =>
                index === self.findIndex((t) => Math.abs(t[0] - c[0]) < 0.0001 && Math.abs(t[1] - c[1]) < 0.0001)
            );

            if (uniqueCoords.length === 0) {
                throw new Error("Could not find a location. Try sharing a different Directions link.");
            }

            // 5. Build Final Map View
            onFileUpload(new File([], "rendering_3d_route.gpx"));
            let finalTrack: any;

            // Detect if it's likely a direction (multiple distict points)
            const isRouteIntent = uniqueCoords.length >= 2 || finalUrl.includes("/dir/") || finalUrl.includes("saddr=") || htmlContent.includes("/dir/");

            if (isRouteIntent && uniqueCoords.length >= 2) {
                // Connect the points sequentially
                const coordsString = uniqueCoords.slice(0, 15).map(c => `${c[1]},${c[0]}`).join(";");
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
                const data = await res.json();
                
                if (!data.routes || data.routes.length === 0) throw new Error("Could not build a road route between these points.");
                
                const routePoints = data.routes[0].geometry.coordinates;
                finalTrack = {
                    name: "Shared Route",
                    points: routePoints.map((p: any) => ({ lon: p[0], lat: p[1], ele: 0, time: null })),
                    totalDistance: data.routes[0].distance / 1000,
                    elevationGain: 0, duration: data.routes[0].duration, estimatedPace: 0,
                    startPoint: { lat: uniqueCoords[0][0], lon: uniqueCoords[0][1], ele: 0, time: null },
                    endPoint: { lat: uniqueCoords[uniqueCoords.length - 1][0], lon: uniqueCoords[uniqueCoords.length - 1][1], ele: 0, time: null }
                };
            } else {
                // Focus on the SINGLE destination
                const [lat, lon] = uniqueCoords[uniqueCoords.length - 1]; // Use the LAST coordinate as the destination
                finalTrack = {
                    name: "Pinned Location",
                    points: [{ lat, lon, ele: 0, time: null }, { lat: lat + 0.0001, lon: lon + 0.0001, ele: 0, time: null }],
                    totalDistance: 0, elevationGain: 0, duration: 0, estimatedPace: 0,
                    startPoint: { lat, lon, ele: 0, time: null },
                    endPoint: { lat, lon, ele: 0, time: null }
                };
            }

            window.dispatchEvent(new CustomEvent("enrich-track", { detail: finalTrack }));
            setGoogleUrl("");
        } catch (err: any) {
            setError(err.message || "Failed to convert link.");
            onFileUpload(new File([], "")); 
        }
    }, [googleUrl, onFileUpload]);


    // 1. Auto-Detect Engine
    useEffect(() => {
        if (googleUrl.includes("google.com/maps") || googleUrl.includes("goo.gl/maps") || googleUrl.includes("maps.app.goo.gl")) {
            const timer = setTimeout(() => {
                handleGoogleMapsConvert();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [googleUrl, handleGoogleMapsConvert]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-full flex flex-col gap-3"
        >
            {/* Google Maps Input */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 group focus-within:border-cyan-500/50 transition-colors">
                <div className="pl-2">
                    <LinkIcon className="w-3 h-3 text-white/20 group-focus-within:text-cyan-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="Paste Google Maps link here..." 
                    className="flex-1 bg-transparent border-none outline-none text-[10px] text-white/70 px-2 placeholder:text-white/20"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                />
                <div className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${isLoading ? "text-cyan-400 animate-pulse" : "text-white/10"}`}>
                    {isLoading ? "Expanding link..." : "Direct Preview"}
                </div>
            </div>

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          relative flex-1 rounded-xl border-2 border-dashed 
          transition-all duration-300 ease-out cursor-pointer
          flex flex-col items-center justify-center gap-3 p-6
          group overflow-hidden
          ${isDragging
                        ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]"
                        : fileName
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                    }
        `}
                onClick={() => document.getElementById("gpx-file-input")?.click()}
            >
                {/* Background glow effect */}
                <div
                    className={`
            absolute inset-0 opacity-0 transition-opacity duration-500
            ${isDragging ? "opacity-100" : "group-hover:opacity-50"}
          `}
                    style={{
                        background:
                            "radial-gradient(circle at center, rgba(0, 212, 255, 0.08) 0%, transparent 70%)",
                    }}
                />

                <input
                    id="gpx-file-input"
                    type="file"
                    accept=".gpx"
                    onChange={handleInputChange}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                            </div>
                            <p className="text-sm text-white/60 font-medium">
                                Processing GPX...
                            </p>
                        </motion.div>
                    ) : fileName ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center gap-3 relative z-10"
                        >
                            <div className="p-3 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-emerald-400 truncate max-w-[180px]">
                                    {fileName}
                                </p>
                                <p className="text-xs text-white/40 mt-1">
                                    Drop another file to replace
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center gap-3 relative z-10"
                        >
                            <div
                                className={`
                  p-3 rounded-full transition-all duration-300
                  ${isDragging
                                        ? "bg-cyan-400/20 border border-cyan-400/40 scale-110"
                                        : "bg-white/5 border border-white/10 group-hover:bg-white/10"
                                    }
                `}
                            >
                                {isDragging ? (
                                    <FileUp className="w-6 h-6 text-cyan-400" />
                                ) : (
                                    <Upload className="w-6 h-6 text-white/50 group-hover:text-white/70 transition-colors" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-white/70">
                                    {isDragging ? (
                                        <span className="text-cyan-400">Release to upload</span>
                                    ) : (
                                        "Drop GPX file here"
                                    )}
                                </p>
                                <p className="text-xs text-white/30 mt-1">
                                    or click to browse
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30"
                        >
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <p className="text-xs text-red-400">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileUp, CheckCircle2, AlertCircle } from "lucide-react";

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
        onFileUpload(new File([], "loading_google_import.gpx")); // Show loading state

        try {
            let finalDataStr = googleUrl;

            // 1. Expand Short Links (using two proxies for redundancy)
            if (googleUrl.includes("goo.gl") || googleUrl.includes("maps.app")) {
                try {
                    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(googleUrl)}`);
                    const data = await res.json();
                    if (data.contents) finalDataStr = data.contents;
                } catch (e) {
                    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(googleUrl)}`);
                    finalDataStr = await res.text();
                }
            }

            let uniqueCoords: [string, string][] = [];

            // 2. Ultra-Aggressive Global Coordinate Search
            // This captures almost ANY pair of GPS coordinates found in URLs or JSON
            const patterns = [
                /(-?\d+\.\d{4,}),\s?(-?\d+\.\d{4,})/g, // Global Lat/Lon with 4+ decimal places
                /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g,     // Google specific
                /\["(-?\d+\.\d+)","(-?\d+\.\d+)"\]/g   // Google JSON specific
            ];

            for (const pattern of patterns) {
                const matches = [...finalDataStr.matchAll(pattern)];
                matches.forEach(m => {
                    const lat = m[1];
                    const lon = m[2];
                    if (Math.abs(parseFloat(lat)) <= 90 && Math.abs(parseFloat(lon)) <= 180) {
                        uniqueCoords.push([lat, lon]);
                    }
                });
            }

            // 3. Place Name Fallback
            if (uniqueCoords.length < 2) {
                const chunks = finalDataStr.split(/[\/\\?&=+]/).filter(c => c.length > 4 && !c.includes("google") && !c.includes("maps"));
                if (chunks.length >= 2) {
                    onFileUpload(new File([], "searching_places.gpx"));
                    const geocodedPoints = await Promise.all(chunks.slice(0, 3).map(async (chunk) => {
                        const name = chunk.split(/[!@#]/)[0].replace(/\+/g, " ");
                        if (name.length < 3) return null;
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`);
                        const data = await res.json();
                        return data.length > 0 ? [data[0].lat, data[0].lon] : null;
                    }));
                    uniqueCoords = geocodedPoints.filter(p => p !== null) as [string, string][];
                }
            }
            
            // Deduplicate and filter noise
            uniqueCoords = uniqueCoords.filter((c, index, self) =>
                index === self.findIndex((t) => t[0] === c[0] && t[1] === c[1])
            ).slice(0, 20);

            if (uniqueCoords.length < 2) {
                throw new Error("Route not found. Make sure the link shows 'Directions' between points.");
            }

            onFileUpload(new File([], "processing_route.gpx"));
            const coordsString = uniqueCoords.map(c => `${c[1]},${c[0]}`).join(";");
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
            const data = await res.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error("Could not generate a road route from these points.");
            }

            const routePoints = data.routes[0].geometry.coordinates;
      
            // 3. Transform into our track format
            const mockGpx: any = {
                name: "Google Maps Route",
                points: routePoints.map((p: any) => ({
                    lon: p[0],
                    lat: p[1],
                    ele: 0, // Profile will be built by map enrichment!
                    time: null
                })),
                totalDistance: data.routes[0].distance / 1000,
                elevationGain: 0,
                duration: data.routes[0].duration,
                estimatedPace: (data.routes[0].duration / 60) / (data.routes[0].distance / 1000),
                startPoint: { lat: routePoints[0][1], lon: routePoints[0][0], ele: 0, time: null },
                endPoint: { lat: routePoints[routePoints.length - 1][1], lon: routePoints[routePoints.length - 1][0], ele: 0, time: null }
            };

            // Notify dashboard with the virtual track
            const event = new CustomEvent("enrich-track", { detail: mockGpx });
            window.dispatchEvent(event);
            
            setGoogleUrl("");
        } catch (err: any) {
            setError(err.message || "Failed to convert link.");
            // Send a pseudo-file that the parent will ignore to clear its loading state
            onFileUpload(new File([], "")); 
        }
    }, [googleUrl, onFileUpload]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-full flex flex-col gap-3"
        >
            {/* Google Maps Input */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 group focus-within:border-cyan-500/50 transition-colors">
                <input 
                    type="text" 
                    placeholder="Paste Google Maps Direction Link..." 
                    className="flex-1 bg-transparent border-none outline-none text-[10px] text-white/70 px-2 placeholder:text-white/20"
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGoogleMapsConvert()}
                />
                <button 
                    onClick={handleGoogleMapsConvert}
                    disabled={!googleUrl || isLoading}
                    className="px-3 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-30"
                >
                    {isLoading ? "Wait" : "Convert"}
                </button>
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

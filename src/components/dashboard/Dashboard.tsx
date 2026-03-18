"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Mountain, Compass } from "lucide-react";
import { GpxTrackData, ElevationDataPoint } from "@/types/gpx";
import { parseGpxFile, generateElevationProfile } from "@/lib/gpx-parser";
import UploadZone from "@/components/upload/UploadZone";
import StatsPanel from "@/components/stats/StatsPanel";
import ElevationProfile from "@/components/elevation/ElevationProfile";

// Dynamic import of MapViewport to avoid SSR issues with MapLibre
const MapViewport = dynamic(() => import("@/components/map/MapViewport"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                <p className="text-sm text-white/40">Loading 3D Map...</p>
            </div>
        </div>
    ),
});

export default function Dashboard() {
    const [trackData, setTrackData] = useState<GpxTrackData | null>(null);
    const [elevationData, setElevationData] = useState<ElevationDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileUpload = useCallback(async (file: File) => {
        setIsLoading(true);
        setFileName(null);

        try {
            const data = await parseGpxFile(file);
            const profile = generateElevationProfile(data.points);

            setTrackData(data);
            setElevationData(profile);
            setFileName(file.name);
        } catch (err) {
            console.error("Failed to parse GPX file:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadSample = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/sample_hike.gpx");
            if (!response.ok) throw new Error("Sample file not found");
            const blob = await response.blob();
            const file = new File([blob], "sample_hike.gpx", { type: "application/gpx+xml" });
            await handleFileUpload(file);
        } catch (err) {
            console.error("Failed to load sample:", err);
        } finally {
            setIsLoading(false);
        }
    }, [handleFileUpload]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
            {/* Header */}
            <header className="relative z-10 px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between max-w-[1800px] mx-auto">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <div className="relative">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20">
                                <Mountain className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0a0f] animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                                Spatial Adventure
                            </h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
                                3D GPS Visualizer
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-4"
                    >
                        <button
                            onClick={loadSample}
                            disabled={isLoading}
                            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all text-xs font-semibold text-cyan-400 disabled:opacity-50"
                        >
                            <Compass className="w-3.5 h-3.5" />
                            Load Sample Data
                        </button>

                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-white/40">Ready</span>
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Bento Grid Layout */}
            <main className="p-4 md:p-6 max-w-[1800px] mx-auto">
                <div
                    className="grid gap-4 md:gap-5 h-[calc(100vh-88px)]"
                    style={{
                        gridTemplateColumns: "1fr 280px",
                        gridTemplateRows: "1fr 200px",
                    }}
                >
                    {/* Main Map Viewport - spans top-left */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
                    >
                        <MapViewport trackData={trackData} />
                    </motion.div>

                    {/* Right Sidebar - Stats + Upload stacked */}
                    <div className="flex flex-col gap-4 md:gap-5">
                        {/* Upload Zone */}
                        <div className="flex-shrink-0">
                            <UploadZone
                                onFileUpload={handleFileUpload}
                                isLoading={isLoading}
                                fileName={fileName}
                            />
                        </div>

                        {/* Stats Panel */}
                        <div className="flex-1 min-h-0 overflow-auto">
                            <StatsPanel trackData={trackData} />
                        </div>
                    </div>

                    {/* Elevation Profile - bottom spanning full width  */}
                    <div className="col-span-2">
                        <ElevationProfile data={elevationData} />
                    </div>
                </div>
            </main>

            {/* Background ambient effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute top-0 left-1/4 w-[600px] h-[600px] opacity-[0.03]"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(0, 212, 255, 1) 0%, transparent 70%)",
                    }}
                />
                <div
                    className="absolute bottom-0 right-1/4 w-[500px] h-[500px] opacity-[0.02]"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(192, 132, 252, 1) 0%, transparent 70%)",
                    }}
                />
            </div>
        </div>
    );
}

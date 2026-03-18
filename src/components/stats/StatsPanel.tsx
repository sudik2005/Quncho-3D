"use client";

import { motion } from "framer-motion";
import {
    MapPin,
    Mountain,
    Timer,
    TrendingUp,
    TrendingDown,
    Route,
    Activity,
} from "lucide-react";
import { GpxTrackData } from "@/types/gpx";
import { formatDuration, formatPace } from "@/lib/gpx-parser";

interface StatsPanelProps {
    trackData: GpxTrackData | null;
}

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit?: string;
    color: string;
    delay: number;
}

function StatItem({ icon, label, value, unit, color, delay }: StatItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="flex items-center gap-3 py-3 group"
        >
            <div
                className="p-2 rounded-lg transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
                <div style={{ color }}>{icon}</div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                    {label}
                </p>
                <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold text-white/90 tabular-nums">
                        {value}
                    </p>
                    {unit && (
                        <span className="text-xs text-white/40 font-medium">{unit}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function StatsPanel({ trackData }: StatsPanelProps) {
    const stats = trackData
        ? [
            {
                icon: <Route className="w-4 h-4" />,
                label: "Total Distance",
                value: trackData.totalDistance.toFixed(2),
                unit: "km",
                color: "#00d4ff",
            },
            {
                icon: <TrendingUp className="w-4 h-4" />,
                label: "Elevation Gain",
                value: Math.round(trackData.elevationGain).toLocaleString(),
                unit: "m",
                color: "#00ff87",
            },
            {
                icon: <TrendingDown className="w-4 h-4" />,
                label: "Elevation Loss",
                value: Math.round(trackData.elevationLoss).toLocaleString(),
                unit: "m",
                color: "#ff6b6b",
            },
            {
                icon: <Mountain className="w-4 h-4" />,
                label: "Max Elevation",
                value: Math.round(trackData.maxElevation).toLocaleString(),
                unit: "m",
                color: "#ffd93d",
            },
            {
                icon: <Timer className="w-4 h-4" />,
                label: "Duration",
                value: formatDuration(trackData.duration),
                color: "#c084fc",
            },
            {
                icon: <Activity className="w-4 h-4" />,
                label: "Avg Pace",
                value: formatPace(trackData.estimatedPace),
                color: "#fb923c",
            },
        ]
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="h-full rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-white/80 tracking-tight">
                        Route Statistics
                    </h2>
                </div>
                {trackData && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-white/40 mt-1 truncate"
                    >
                        {trackData.name}
                    </motion.p>
                )}
            </div>

            {/* Stats List */}
            <div className="px-5 py-2 space-y-0">
                {stats ? (
                    <div className="divide-y divide-white/[0.04]">
                        {stats.map((stat, i) => (
                            <StatItem key={stat.label} {...stat} delay={0.4 + i * 0.08} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="p-3 rounded-full bg-white/5 border border-white/10">
                            <MapPin className="w-5 h-5 text-white/20" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-white/30 font-medium">
                                No route loaded
                            </p>
                            <p className="text-xs text-white/15 mt-1">
                                Upload a GPX file to see stats
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

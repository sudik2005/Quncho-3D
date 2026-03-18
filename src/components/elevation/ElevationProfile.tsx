"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { ElevationDataPoint } from "@/types/gpx";

interface ElevationProfileProps {
    data: ElevationDataPoint[];
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        payload: ElevationDataPoint;
    }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="px-3 py-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 shadow-xl">
                <p className="text-xs text-cyan-400 font-semibold tabular-nums">
                    {payload[0].value.toFixed(0)} m
                </p>
                <p className="text-[10px] text-white/40 tabular-nums">
                    {payload[0].payload.distance.toFixed(1)} km
                </p>
            </div>
        );
    }
    return null;
}

export default function ElevationProfile({ data }: ElevationProfileProps) {
    const { minEle, maxEle } = useMemo(() => {
        if (data.length === 0) return { minEle: 0, maxEle: 100 };
        const elevations = data.map((d) => d.elevation);
        const min = Math.min(...elevations);
        const max = Math.max(...elevations);
        const padding = (max - min) * 0.1;
        return {
            minEle: Math.floor(min - padding),
            maxEle: Math.ceil(max + padding),
        };
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="h-full rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2 flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white/80 tracking-tight">
                    Elevation Profile
                </h2>
                {data.length > 0 && (
                    <span className="ml-auto text-[10px] text-white/30 font-mono">
                        {data[data.length - 1]?.distance.toFixed(1)} km total
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="flex-1 px-2 py-2 min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient
                                    id="elevationGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.35} />
                                    <stop offset="50%" stopColor="#00d4ff" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient
                                    id="lineGradient"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="0"
                                >
                                    <stop offset="0%" stopColor="#00ff87" />
                                    <stop offset="50%" stopColor="#00d4ff" />
                                    <stop offset="100%" stopColor="#c084fc" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.04)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="distance"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                                tickFormatter={(val) => `${val}`}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[minEle, maxEle]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                                tickFormatter={(val) => `${val}m`}
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="elevation"
                                stroke="url(#lineGradient)"
                                strokeWidth={2}
                                fill="url(#elevationGradient)"
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <BarChart3 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                            <p className="text-xs text-white/20">
                                Elevation data will appear here
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="h-full"
        >
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          relative h-full rounded-xl border-2 border-dashed 
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

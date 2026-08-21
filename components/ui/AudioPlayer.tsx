"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string | undefined;
  autoPlay?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
  label?: string;
}

export function AudioPlayer({ src, autoPlay = false, onPlayingChange, className, label }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Autoplay via audio element if src present
  useEffect(() => {
    if (!audioRef.current || !src) return;
    if (autoPlay) {
      setIsLoading(true);
      audioRef.current.load();
      audioRef.current.play().catch(() => setIsLoading(false));
    }
  }, [src, autoPlay]);

  function handleToggle() {
    if (!src || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.play().catch(() => setIsLoading(false));
    }
  }

  // No src — nothing to play (RunPod TTS is the only audio source)
  if (!src) {
    return (
      <button
        disabled
        className={cn(
          "flex items-center gap-1.5 text-xs text-gray-300 px-2.5 py-1.5 rounded-lg border border-gray-100 cursor-not-allowed",
          className
        )}
      >
        <span className="text-sm">🔇</span>
        <span>Audio indisponible</span>
      </button>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => { setIsPlaying(true); setIsLoading(false); onPlayingChange?.(true); }}
        onPause={() => { setIsPlaying(false); onPlayingChange?.(false); }}
        onEnded={() => { setIsPlaying(false); onPlayingChange?.(false); }}
        onCanPlayThrough={() => setIsLoading(false)}
      />
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all",
          isPlaying
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
          className
        )}
      >
        <span className="text-sm">{isLoading ? "⏳" : isPlaying ? "⏸" : "▶"}</span>
        <span>{label ?? (isPlaying ? "En cours…" : "Écouter")}</span>
      </button>
    </>
  );
}
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string | undefined;
  text?: string;           // fallback: spoken via Web Speech API
  autoPlay?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
  label?: string;
}

export function AudioPlayer({ src, text, autoPlay = false, onPlayingChange, className, label }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const speakText = useCallback(() => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.9;
    utteranceRef.current = utterance;
    utterance.onstart = () => { setIsPlaying(true); setIsLoading(false); onPlayingChange?.(true); };
    utterance.onend = () => { setIsPlaying(false); onPlayingChange?.(false); };
    utterance.onerror = () => { setIsPlaying(false); setIsLoading(false); onPlayingChange?.(false); };
    setIsLoading(true);
    window.speechSynthesis.speak(utterance);
  }, [text, onPlayingChange]);

  // Autoplay via Web Speech if no src
  useEffect(() => {
    if (autoPlay && !src && text) speakText();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay, src]);

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
    // Audio file playback
    if (src && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setIsLoading(true);
        audioRef.current.play().catch(() => setIsLoading(false));
      }
      return;
    }
    // Web Speech fallback
    if (text) {
      if (isPlaying) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
        onPlayingChange?.(false);
      } else {
        speakText();
      }
    }
  }

  // No src and no text — nothing to play
  if (!src && !text) {
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
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onPlay={() => { setIsPlaying(true); setIsLoading(false); onPlayingChange?.(true); }}
          onPause={() => { setIsPlaying(false); onPlayingChange?.(false); }}
          onEnded={() => { setIsPlaying(false); onPlayingChange?.(false); }}
          onCanPlayThrough={() => setIsLoading(false)}
        />
      )}
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

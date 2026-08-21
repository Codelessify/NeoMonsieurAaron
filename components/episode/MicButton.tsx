"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// Browser Speech Recognition type shim
interface ISpeechRecognitionEvent {
  results: { length: number; [i: number]: { length: number; [j: number]: { transcript: string } } };
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
}
interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

interface MicButtonProps {
  choices: Array<{ text: string; is_correct: boolean }>;
  onMatch: (index: number) => void;
  onStuck?: () => void;            // called after maxRetry mic attempts
  disabled?: boolean;
  maxRetries?: number;            // how many failed attempts before showing choices
  className?: string;
}

type MicStatus = "idle" | "listening" | "processing" | "matched" | "no_match" | "unsupported";

// Normalize French text: lowercase, strip accents and punctuation
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function findMatch(
  transcript: string,
  choices: Array<{ text: string; is_correct: boolean }>
): number | null {
  const heard = normalize(transcript);
  if (!heard) return null;

  let bestIndex: number | null = null;
  let bestScore = 0;

  choices.forEach((choice, i) => {
    const choiceNorm = normalize(choice.text);
    const heardWords = new Set(heard.split(/\s+/));
    const choiceWords = choiceNorm.split(/\s+/);
    const matches = choiceWords.filter((w) => heardWords.has(w)).length;
    const score = choiceWords.length > 0 ? matches / choiceWords.length : 0;
    const contains = heard.includes(choiceNorm) || choiceNorm.includes(heard);
    const finalScore = contains ? 1 : score;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestIndex = i;
    }
  });

  return bestScore >= 0.5 ? bestIndex : null;
}

export function MicButton({
  choices,
  onMatch,
  onStuck,
  disabled = false,
  maxRetries = 2,
  className,
}: MicButtonProps) {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const retryCountRef = useRef(0);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setStatus("unsupported");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Already stopped — safe to ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (disabled || isProcessingRef.current) return;

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("unsupported");
      return;
    }

    // Stop any existing instance before starting a new one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped — safe to ignore
      }
    }

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      isProcessingRef.current = true;
      setStatus("processing");

      const transcripts: string[] = [];
      for (let r = 0; r < event.results.length; r++) {
        for (let a = 0; a < event.results[r].length; a++) {
          transcripts.push(event.results[r][a].transcript);
        }
      }

      let matched: number | null = null;
      for (const t of transcripts) {
        matched = findMatch(t, choices);
        if (matched !== null) break;
      }

      setTranscript(transcripts[0] ?? "");

      if (matched !== null) {
        setStatus("matched");
        isProcessingRef.current = false;
        retryCountRef.current = 0;
        onMatch(matched);
      } else {
        retryCountRef.current += 1;
        setStatus("no_match");

        if (retryCountRef.current >= maxRetries && onStuck) {
          // Give the user a moment to see the error, then trigger showing choices
          setTimeout(() => {
            onStuck();
          }, 1500);
        } else {
          // Auto-retry listening after a short delay
          setTimeout(() => {
            if (!isProcessingRef.current) {
              startListening();
            }
          }, 800);
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("[mic] SpeechRecognition error:", event?.error ?? "unknown");
      isProcessingRef.current = false;
      setStatus("idle");
    };

    recognition.onend = () => {
      // Only reset if we're not in the middle of processing
      if (!isProcessingRef.current) {
        setStatus((prev) => (prev === "listening" ? "idle" : prev));
      }
    };

    // Start listening
    try {
      recognition.start();
    } catch (err) {
      console.error("[mic] Failed to start recognition:", err);
      setStatus("unsupported");
      isProcessingRef.current = false;
    }
  }, [choices, disabled, onMatch, onStuck, maxRetries]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped — safe to ignore
      }
    }
    setStatus("idle");
    isProcessingRef.current = false;
  }, []);

  const handleClick = () => {
    if (status === "listening") {
      stopListening();
    } else if (status === "idle" || status === "no_match") {
      retryCountRef.current = 0;
      startListening();
    }
  };

  if (status === "unsupported") return null;

  const isListening = status === "listening";
  const isProcessing = status === "processing";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        onClick={handleClick}
        disabled={disabled || isProcessing || status === "matched"}
        aria-label={isListening ? "Arrêter le micro" : "Répondre avec le micro"}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 shadow-sm",
          disabled || isProcessing
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : isListening
            ? "border-red-400 bg-red-50 animate-pulse cursor-pointer"
            : status === "matched"
            ? "border-emerald-400 bg-emerald-50 cursor-pointer"
            : status === "no_match"
            ? "border-amber-400 bg-amber-50 cursor-pointer"
            : "border-indigo-300 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
        )}
      >
        {isProcessing ? (
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-2xl">
            {isListening ? "🔴" : status === "matched" ? "✅" : status === "no_match" ? "🤔" : "🎤"}
          </span>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center min-h-[16px]">
        {isListening
          ? "À vous…"
          : isProcessing
          ? "Analyse…"
          : status === "no_match"
          ? `"${transcript}" — réessayez`
          : "Parler"}
      </p>
    </div>
  );
}

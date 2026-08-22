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

interface Choice {
  text: string;
  is_correct: boolean;
}

interface MicButtonProps {
  choices: Choice[];
  onMatch: (choice: Choice) => void;
  /**
   * Called whenever speech was heard but didn't confidently match a choice.
   * `transcript` = raw text the user said, `bestGuess` = closest known
   * phrase (may be null). The mic stays available for an immediate retry.
   */
  onNoMatch?: (transcript: string, bestGuess: Choice | null) => void;
  disabled?: boolean;
  className?: string;
}

type MicStatus = "idle" | "listening" | "processing" | "matched" | "unsupported";

// Normalize French text: lowercase, strip accents and punctuation,
// collapse whitespace.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein edit distance (iterative, two-row)
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Character-level similarity: 0..1 (1 = identical)
function charSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// Word-level F1 overlap between two normalized strings: 0..1
function wordF1(a: string, b: string): number {
  const aWords = a.split(" ").filter(Boolean);
  const bWords = b.split(" ").filter(Boolean);
  if (!aWords.length || !bWords.length) return 0;
  const bSet = new Set(bWords);
  let matches = 0;
  for (const w of aWords) {
    if (bSet.has(w)) matches++;
  }
  const precision = matches / aWords.length;
  const recall = matches / bWords.length;
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

/**
 * Find the choice that best matches what the user said.
 *
 * Scoring strategy (robust against ASR noise):
 *  1. Exact normalized match → score 1.
 *  2. Otherwise take the best of:
 *     - character similarity (edit-distance based)
 *     - word-level F1 overlap
 */
export function bestMatch(
  transcript: string,
  choices: Choice[]
): { index: number; score: number } | null {
  const heard = normalize(transcript);
  if (!heard) return null;

  let bestIndex: number | null = null;
  let bestScore = 0;

  choices.forEach((choice, i) => {
    const target = normalize(choice.text);
    if (!target) return;

    let score: number;
    if (heard === target) {
      score = 1;
    } else {
      score = Math.max(charSimilarity(heard, target), wordF1(heard, target));
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });

  return bestIndex !== null ? { index: bestIndex, score: bestScore } : null;
}

/** Confidence threshold for accepting a mic match. */
const MATCH_THRESHOLD = 0.6;

export function MicButton({
  choices,
  onMatch,
  onNoMatch,
  disabled = false,
  className,
}: MicButtonProps) {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const answeredRef = useRef(false); // guards against duplicate result events

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
    if (disabled || isProcessingRef.current || answeredRef.current) return;

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
    };

    recognition.onresult = (event) => {
      // Stop the recognizer immediately so no further results can fire —
      // this prevents double-calling onMatch for one utterance.
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.stop();
      } catch {
        // Already stopped — safe to ignore
      }
      isProcessingRef.current = true;
      setStatus("processing");

      const transcripts: string[] = [];
      for (let r = 0; r < event.results.length; r++) {
        for (let a = 0; a < event.results[r].length; a++) {
          transcripts.push(event.results[r][a].transcript);
        }
      }

      const primary = transcripts[0] ?? "";
      setLastHeard(primary);

      // Try each ASR alternative against the choices
      let matchedChoice: Choice | null = null;
      for (const t of transcripts) {
        const m = bestMatch(t, choices);
        if (m && m.score >= MATCH_THRESHOLD) {
          matchedChoice = choices[m.index];
          break;
        }
      }

      if (matchedChoice) {
        answeredRef.current = true;
        setStatus("matched");
        isProcessingRef.current = false;
        onMatch(matchedChoice);
      } else {
        // No confident match — report what we heard plus the closest phrase,
        // then make the mic immediately available again for a retry.
        isProcessingRef.current = false;
        setStatus("idle");

        let guess: Choice | null = null;
        for (const t of transcripts) {
          const m = bestMatch(t, choices);
          if (m && m.score >= 0.35) {
            guess = choices[m.index];
            break;
          }
        }
        onNoMatch?.(primary, guess);
      }
    };

    recognition.onerror = (event) => {
      console.warn("[mic] SpeechRecognition error:", event?.error ?? "unknown");
      isProcessingRef.current = false;
      setStatus((prev) => (prev === "processing" ? "idle" : prev));
    };

    recognition.onend = () => {
      // Only reset status if we're not actively processing a result
      if (!isProcessingRef.current) {
        setStatus((prev) => (prev === "listening" ? "idle" : prev));
      }
    };

    // Start listening
    try {
      recognition.start();
    } catch (err) {
      console.error("[mic] Failed to start recognition:", err);
      setStatus("idle");
      isProcessingRef.current = false;
    }
  }, [choices, disabled, onMatch, onNoMatch]);

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
    } else if (status === "idle") {
      answeredRef.current = false;
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
            : lastHeard
            ? "border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer"
            : "border-indigo-300 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
        )}
      >
        {isProcessing ? (
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-2xl">
            {isListening ? "🔴" : status === "matched" ? "✅" : "🎤"}
          </span>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center min-h-[16px]">
        {isListening
          ? "À vous…"
          : isProcessing
          ? "Analyse…"
          : lastHeard
          ? `Vous avez dit : « ${lastHeard} » — réessayez`
          : "Parler"}
      </p>
    </div>
  );
}
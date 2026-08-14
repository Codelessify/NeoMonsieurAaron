"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  /** The choices the learner can say. Matched by similarity. */
  choices: Array<{ text: string; is_correct: boolean }>;
  /** Called with the index of the matched choice */
  onMatch: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

type MicStatus = "idle" | "listening" | "matched" | "no_match" | "unsupported";

// Normalize French text for comparison: lowercase, strip accents, trim punctuation
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Find the best matching choice for what was heard
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
    // Score: count shared words
    const heardWords = new Set(heard.split(/\s+/));
    const choiceWords = choiceNorm.split(/\s+/);
    const matches = choiceWords.filter((w) => heardWords.has(w)).length;
    const score = choiceWords.length > 0 ? matches / choiceWords.length : 0;

    // Also check if transcript contains the whole choice or vice versa
    const contains = heard.includes(choiceNorm) || choiceNorm.includes(heard);
    const finalScore = contains ? 1 : score;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestIndex = i;
    }
  });

  // Require at least 50% word overlap to count as a match
  return bestScore >= 0.5 ? bestIndex : null;
}

export function MicButton({ choices, onMatch, disabled = false, className }: MicButtonProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");
  const [transcript, setTranscript] = useState("");

  // Check browser support once on mount
  useEffect(() => {
    const SpeechRecognition =
      (typeof window !== "undefined" &&
        (window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
      null;
    if (!SpeechRecognition) setStatus("unsupported");
  }, []);

  const startListening = useCallback(() => {
    if (disabled || status === "listening") return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("unsupported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      // Collect all alternatives across all results
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

      const bestTranscript = transcripts[0] ?? "";
      setTranscript(bestTranscript);

      if (matched !== null) {
        setStatus("matched");
        onMatch(matched);
      } else {
        setStatus("no_match");
        // Reset after a moment so they can try again
        setTimeout(() => setStatus("idle"), 1500);
      }
    };

    recognition.onerror = () => {
      setStatus("idle");
    };

    recognition.onend = () => {
      if (status === "listening") setStatus("idle");
    };

    recognition.start();
  }, [choices, disabled, onMatch, status]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  if (status === "unsupported") return null;

  const isListening = status === "listening";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        aria-label={isListening ? "Arrêter le micro" : "Répondre avec le micro"}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 shadow-sm",
          disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-40"
            : isListening
            ? "border-red-400 bg-red-50 animate-pulse cursor-pointer"
            : status === "matched"
            ? "border-emerald-400 bg-emerald-50 cursor-pointer"
            : status === "no_match"
            ? "border-amber-400 bg-amber-50 cursor-pointer"
            : "border-indigo-300 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
        )}
      >
        <span className="text-2xl">
          {isListening ? "🔴" : status === "matched" ? "✅" : status === "no_match" ? "🤔" : "🎤"}
        </span>
      </button>

      <p className="text-xs text-gray-400 text-center min-h-[16px]">
        {isListening
          ? "À vous…"
          : status === "no_match"
          ? `"${transcript}" — réessayez`
          : "Parler"}
      </p>
    </div>
  );
}

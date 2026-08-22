"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnswerChoice, SceneStatus } from "@/types";

const CHOICE_LABELS = ["A", "B", "C"];

interface AnswerChoicesProps {
  choices: AnswerChoice[];
  selectedIndex: number | null;
  status: SceneStatus;
  onSelect: (choice: AnswerChoice) => void;
}

/**
 * Coloring rules — driven by ONE source of truth (`status` + `selectedIndex`):
 *
 * - answered_correct: the SELECTED choice is green with "✓ Correct !".
 *   No other choice is highlighted, so the UI can never contradict itself.
 * - answered_wrong:   the SELECTED choice is amber ("Pas tout à fait" —
 *   never harsh red / never "wrong"), and the correct answer is softly
 *   outlined in green labelled "Réponse attendue" (expected answer).
 * - idle:             neutral; pre-selection highlight while browsing.
 */
export function AnswerChoices({ choices, selectedIndex, status, onSelect }: AnswerChoicesProps) {
  const isAnswered = status !== "idle";
  const isCorrectStatus = status === "answered_correct";

  return (
    <div className="flex flex-col gap-2.5">
      {choices.map((choice, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect = choice.is_correct;

        // ── Card styling ────────────────────────────────────────────────
        let stateClass = "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer";

        if (isAnswered) {
          if (isSelected) {
            // The user's pick — color follows the authoritative status
            stateClass = isCorrectStatus
              ? "border-emerald-400 bg-emerald-50 cursor-default"
              : "border-amber-400 bg-amber-50 cursor-default";
          } else if (isCorrect && !isCorrectStatus) {
            // Reveal expected answer only when the user missed it
            stateClass = "border-emerald-300 bg-emerald-50/60 cursor-default";
          } else {
            stateClass = "border-gray-200 bg-white opacity-60 cursor-default";
          }
        } else if (isSelected) {
          stateClass = "border-blue-400 bg-blue-50 cursor-pointer";
        }

        // ── Label pill ──────────────────────────────────────────────────
        let pillClass = "bg-gray-100 text-gray-600 border-gray-200";
        let pillContent: string = CHOICE_LABELS[i] ?? "?";

        if (isAnswered && isSelected) {
          if (isCorrectStatus) {
            pillClass = "bg-emerald-500 text-white border-emerald-500";
            pillContent = "✓";
          } else {
            pillClass = "bg-amber-500 text-white border-amber-500";
            pillContent = "→";
          }
        } else if (isAnswered && isCorrect && !isCorrectStatus) {
          pillClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
          pillContent = "✓";
        }

        // ── Right indicator ─────────────────────────────────────────────
        let indicator: string | null = null;
        let indicatorClass = "";
        if (isAnswered && isSelected) {
          if (isCorrectStatus) {
            indicator = "Correct !";
            indicatorClass = "text-emerald-600";
          } else {
            indicator = "Pas tout à fait";
            indicatorClass = "text-amber-600";
          }
        } else if (isAnswered && isCorrect && !isCorrectStatus) {
          indicator = "Réponse attendue";
          indicatorClass = "text-emerald-500";
        }

        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
            onClick={() => !isAnswered && onSelect(choice)}
            disabled={isAnswered}
            className={cn(
              "flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200",
              stateClass
            )}
          >
            {/* Label pill */}
            <span
              className={cn(
                "w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold border",
                pillClass
              )}
            >
              {pillContent}
            </span>

            <span className="text-sm font-medium text-gray-800">{choice.text}</span>

            {/* Right indicator */}
            {indicator && (
              <span className={cn("ml-auto text-sm font-semibold", indicatorClass)}>
                {indicator}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
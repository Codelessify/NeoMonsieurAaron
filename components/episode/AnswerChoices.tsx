"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnswerChoice } from "@/types";
import type { SceneStatus } from "@/types";

interface AnswerChoicesProps {
  choices: AnswerChoice[];
  selectedIndex: number | null;
  status: SceneStatus;
  onSelect: (index: number) => void;
}

const CHOICE_LABELS = ["A", "B", "C"];

export function AnswerChoices({ choices, selectedIndex, status, onSelect }: AnswerChoicesProps) {
  const isAnswered = status !== "idle";

  return (
    <div className="flex flex-col gap-2.5">
      {choices.map((choice, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect = choice.is_correct;

        let stateClass = "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer";

        if (isAnswered) {
          if (isCorrect) {
            stateClass = "border-emerald-400 bg-emerald-50 cursor-default";
          } else if (isSelected && !isCorrect) {
            stateClass = "border-red-400 bg-red-50 cursor-default";
          } else {
            stateClass = "border-gray-200 bg-white opacity-60 cursor-default";
          }
        } else if (isSelected) {
          stateClass = "border-blue-400 bg-blue-50 cursor-pointer";
        }

        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
            onClick={() => !isAnswered && onSelect(i)}
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
                isAnswered && isCorrect
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : isAnswered && isSelected && !isCorrect
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              )}
            >
              {isAnswered && isCorrect ? "✓" : isAnswered && isSelected ? "✗" : CHOICE_LABELS[i]}
            </span>

            <span className="text-sm font-medium text-gray-800">{choice.text}</span>

            {/* Right indicator */}
            {isAnswered && isCorrect && (
              <span className="ml-auto text-emerald-600 text-sm font-semibold">Correct !</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

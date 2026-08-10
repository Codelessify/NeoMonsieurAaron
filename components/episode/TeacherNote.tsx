"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Scene } from "@/types";
import type { SceneStatus } from "@/types";

interface TeacherNoteProps {
  scene: Scene;
  status: SceneStatus;
}

export function TeacherNote({ scene, status }: TeacherNoteProps) {
  const [open, setOpen] = useState(false);

  if (status === "idle") return null;

  const isCorrect = status === "answered_correct";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-3",
        isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      )}
    >
      {/* Status line */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-semibold",
            isCorrect ? "text-emerald-700" : "text-amber-700"
          )}
        >
          {isCorrect ? "✓ Bien joué !" : `✗ La bonne réponse : "${scene.expected_response}"`}
        </span>

        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <span>💡</span>
          <span>{open ? "Cacher" : "Explication"}</span>
        </button>
      </div>

      {/* Expandable teacher note */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-current/10 text-xs text-gray-600 space-y-1">
              <p>{scene.teacher_note}</p>
              {scene.grammar_focus && (
                <p className="text-gray-500">
                  <span className="font-semibold">Point de grammaire :</span>{" "}
                  {scene.grammar_focus}
                </p>
              )}
              {scene.new_vocabulary.length > 0 && (
                <p className="text-gray-500">
                  <span className="font-semibold">Nouveau vocabulaire :</span>{" "}
                  {scene.new_vocabulary.join(", ")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Scene as SceneType } from "@/types";

// Ken Burns pan/zoom animation applied over the illustration
const KEN_BURNS_VARIANTS = [
  { initial: { scale: 1.08, x: 8 },  animate: { scale: 1, x: 0 } },
  { initial: { scale: 1.08, x: -8 }, animate: { scale: 1, x: 0 } },
  { initial: { scale: 1,    x: 0 },  animate: { scale: 1.06, x: 6 } },
  { initial: { scale: 1.06, x: 0 },  animate: { scale: 1, x: -4 } },
];

interface SceneIllustrationProps {
  scene: SceneType;
  sceneIndex: number;
}

export function SceneIllustration({ scene, sceneIndex }: SceneIllustrationProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const variant = KEN_BURNS_VARIANTS[sceneIndex % KEN_BURNS_VARIANTS.length];

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100">
      <AnimatePresence mode="wait">
        {scene.illustration_url ? (
          <motion.div
            key={scene.illustration_url}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.img
              src={scene.illustration_url}
              alt={scene.english_context}
              className="w-full h-full object-cover"
              onLoad={() => setImageLoaded(true)}
              initial={variant.initial}
              animate={variant.animate}
              transition={{ duration: 8, ease: "linear" }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-5xl mb-2">🇫🇷</div>
            <div className="text-sm text-gray-500 text-center px-4">
              {scene.english_context}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene counter overlay */}
      <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
        Scène {scene.scene_number}
      </div>
    </div>
  );
}

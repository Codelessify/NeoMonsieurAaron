"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;   // 0-based scene index
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className }: ProgressBarProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-300",
            i < current
              ? "bg-emerald-500"
              : i === current
              ? "bg-blue-500"
              : "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

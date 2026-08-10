"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  variant?: "level" | "theme" | "xp" | "streak";
  className?: string;
}

const variantClasses = {
  level:   "bg-violet-100 text-violet-700 border border-violet-200",
  theme:   "bg-blue-50 text-blue-700 border border-blue-200",
  xp:      "bg-amber-50 text-amber-700 border border-amber-200",
  streak:  "bg-orange-50 text-orange-600 border border-orange-200",
};

export function Badge({ label, variant = "theme", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

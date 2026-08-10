import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function scoreToGrade(correct: number, total: number): string {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  if (pct >= 90) return "Excellent";
  if (pct >= 70) return "Bien";
  if (pct >= 50) return "Pas mal";
  return "Continuez !";
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

export function xpForLevel(level: string): number {
  const map: Record<string, number> = { A0: 0, A1: 500, A2: 1500, B1: 3500, B2: 7000 };
  return map[level] ?? 0;
}

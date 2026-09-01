"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/learn",    label: "Cours",    emoji: "📚" },
  { href: "/chambre",  label: "Chambre",  emoji: "🚪" },
  { href: "/map",      label: "Ville",    emoji: "🗺️" },
  { href: "/vocab",    label: "Vocab",    emoji: "💬" },
  { href: "/progress", label: "Progrès",  emoji: "📈" },
  { href: "/settings", label: "Réglages", emoji: "⚙️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="max-w-xl mx-auto flex">
        {NAV_ITEMS.map(({ href, label, emoji }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span className="text-xl leading-none">{emoji}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

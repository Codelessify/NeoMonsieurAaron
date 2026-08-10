import type { Metadata } from "next";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "MonsieurAaron",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20 max-w-xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

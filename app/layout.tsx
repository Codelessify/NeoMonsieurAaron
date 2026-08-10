import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonsieurAaron — Learn French",
  description: "AI-powered French learning through conversational episodes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Casino Royale - Play Money Casino",
  description: "Play-money only casino games. No real gambling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-casino-gradient">
          {children}
        </div>
        <Toaster />
        <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-yellow-500/20 py-2 px-4 z-50">
          <p className="text-center text-xs text-yellow-500/80">
            🎰 Play-money only. No real gambling. This is a simulation for entertainment purposes only. 🎰
          </p>
        </footer>
      </body>
    </html>
  );
}

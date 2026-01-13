import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/lib/LanguageContext";

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
        <LanguageProvider>
          <div className="min-h-screen bg-black">
            {children}
          </div>
          <Toaster />
          <footer className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-gray-800 py-2 px-4 z-30">
            <p className="text-center text-xs text-gray-500">
              🎰 Play-money only. No real gambling. For entertainment purposes only. 🎰
            </p>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}

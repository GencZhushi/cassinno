"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, User, Sparkles, Globe } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "fr" ? "en" : "fr");
  };

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Hamburger Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-white hover:text-red-500 transition-colors"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <span className="text-2xl font-bold">
                <span className="text-red-600">P</span>
                <span className="text-white">asino</span>
                <span className="text-red-600 text-sm align-super">.ch</span>
              </span>
              <div className="text-[8px] text-gray-400 text-center -mt-1">Casino du Lac Meyrin</div>
            </div>
          </Link>

          {/* Right Side: Language + Auth */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white px-2 py-1.5 rounded-full text-xs font-medium transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {language.toUpperCase()}
            </button>

            {/* Auth Buttons */}
            <Link href="/auth/register">
              <button className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-full text-sm font-medium transition-colors">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">{t("signUp")}</span>
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="flex items-center gap-1.5 border border-gray-600 hover:border-gray-400 text-white px-3 py-2 rounded-full text-sm font-medium transition-colors">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{t("login")}</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-black/98 border-b border-gray-800 py-4 px-4">
          <nav className="flex flex-col gap-3">
            <Link href="/lobby" className="text-white hover:text-red-500 py-2">{t("home")}</Link>
            <Link href="/games/slots" className="text-white hover:text-red-500 py-2">{t("slots")}</Link>
            <Link href="/games" className="text-white hover:text-red-500 py-2">{t("allGames")}</Link>
            <Link href="/profile" className="text-white hover:text-red-500 py-2">{t("myProfile")}</Link>
            <Link href="/wallet" className="text-white hover:text-red-500 py-2">{t("wallet")}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

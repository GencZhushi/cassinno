"use client";

import { useState } from "react";
import { Search, Grid3X3, LayoutGrid } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { t } = useLanguage();

  const tabs = [
    { id: "slots", label: t("slots") },
    { id: "new", label: t("newGames") },
    { id: "live", label: t("liveCasino") },
  ];

  return (
    <div className="bg-black border-b border-gray-800">
      {/* Tabs */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white border-b-2 border-red-600"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="pb-3">
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
        )}
      </div>

      {/* Section Header */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h2 className="text-white font-semibold">{t("top")}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-gray-700" : "hover:bg-gray-800"}`}
          >
            <Grid3X3 className={`w-4 h-4 ${viewMode === "grid" ? "text-white" : "text-gray-500"}`} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-gray-700" : "hover:bg-gray-800"}`}
          >
            <LayoutGrid className={`w-4 h-4 ${viewMode === "list" ? "text-white" : "text-gray-500"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

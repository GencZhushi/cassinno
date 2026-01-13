"use client";

import { useState, useEffect } from "react";
import { MessageCircle, ChevronUp } from "lucide-react";

export function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-20 right-4 flex flex-col gap-3 z-40">
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ChevronUp className="w-6 h-6 text-gray-700" />
        </button>
      )}

      {/* Chat Button */}
      <button className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg flex items-center justify-center transition-colors">
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

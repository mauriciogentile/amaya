"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare } from "lucide-react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari, not already installed (standalone), not dismissed
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    const dismissed = localStorage.getItem("install-prompt-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
      // Small delay so it doesn't flash on load
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("install-prompt-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] inset-x-0 z-50 px-4 pb-2 pointer-events-none">
      <div className="pointer-events-auto max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
        {/* App icon */}
        <img src="/icon-192.png" alt="Amaya" className="w-12 h-12 rounded-xl flex-shrink-0" />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-semibold text-sm">Install Amaya</p>
          <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
            Add to your home screen for a full-screen experience — no address bar.
          </p>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-medium">
            <span>Tap</span>
            <Share size={13} className="inline" />
            <span>then</span>
            <PlusSquare size={13} className="inline" />
            <span><strong>Add to Home Screen</strong></span>
          </div>
        </div>

        {/* Dismiss */}
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0 p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

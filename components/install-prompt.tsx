"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    const dismissed = localStorage.getItem("install-prompt-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
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
      <div className="pointer-events-auto max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3 mb-3">
          <img src="/icon-192.png" alt="Amaya" className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1">
            <p className="text-foreground font-semibold text-sm">Install Amaya</p>
            <p className="text-muted-foreground text-xs mt-0.5">Get the full-screen experience with no address bar.</p>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Step by step instructions */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <span className="text-xs text-foreground">Tap the <span className="font-bold">Share</span> button at the bottom of Safari</span>
            {/* Safari share icon */}
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <span className="text-xs text-foreground">Scroll down and tap <span className="font-bold">"Add to Home Screen"</span></span>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <span className="text-xs text-foreground">Tap <span className="font-bold">Add</span> — done! 🎉</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Exercise {
  _id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl: string;
  imageUrl: string;
}

const BODY_PARTS = ["chest", "back", "upper legs", "shoulders", "waist", "upper arms", "lower arms", "neck", "cardio"];
const BODY_PART_LABELS: Record<string, string> = {
  back: "Back", cardio: "Cardio", chest: "Chest",
  "lower arms": "Forearms",
  neck: "Neck", shoulders: "Shoulders",
  "upper arms": "Arms", "upper legs": "Legs", waist: "Core",
};

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState<string | null>("chest");
  const [equipment, setEquipment] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchExercises = useCallback(async (query: string, bp: string | null, eq: string | null, pg: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ q: query, bodyPart: bp ?? "", equipment: eq ?? "", page: String(pg) });
    const res = await fetch(`/api/exercises?${params}`);
    const data = await res.json();
    setExercises(prev => append ? [...prev, ...data.exercises] : data.exercises);
    setHasMore(pg < data.pages);
    setPage(pg);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExercises(q, bodyPart, equipment, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, bodyPart, equipment]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchExercises(q, bodyPart, equipment, page + 1, true);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, q, bodyPart, equipment, page, fetchExercises]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-0 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold text-foreground mb-4">Exercise Library</h1>

        {/* Search */}
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5 mb-3">
          <Search size={16} className="text-foreground/50 shrink-0" />
          <input
            type="text"
            placeholder="Search 1,300+ exercises..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="bg-transparent text-foreground placeholder:text-muted-foreground text-sm flex-1 outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-foreground/40">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Body Part Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {BODY_PARTS.map(bp => (
            <button
              key={bp}
              onClick={() => setBodyPart(bp)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                bodyPart === bp
                  ? "bg-emerald-500 text-black"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {BODY_PART_LABELS[bp]}
            </button>
          ))}
        </div>

        {/* Equipment Filter */}
        <div className="flex gap-2 pb-3">
          <button
            onClick={() => setEquipment(eq => eq === "barbell" ? null : "barbell")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              equipment === "barbell" ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground"
            }`}
          >Barbell</button>
          <button
            onClick={() => setEquipment(eq => eq === "dumbbell" ? null : "dumbbell")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              equipment === "dumbbell" ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground"
            }`}
          >Dumbbell</button>
          <button
            onClick={() => setEquipment(eq => eq === "cable" ? null : "cable")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              equipment === "cable" ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground"
            }`}
          >Cable</button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-28 max-w-lg mx-auto w-full space-y-2 pt-1">
        {exercises.map(ex => (
          <button
            key={ex._id}
            onClick={() => router.push(`/library/${ex._id}`)}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left active:bg-muted transition-colors"
          >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
              {ex.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">💪</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold truncate">{ex.name}</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {ex.bodyPart && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium uppercase">
                    {ex.bodyPart}
                  </span>
                )}
                {ex.equipment && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-foreground/50 font-medium uppercase">
                    {ex.equipment}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        ))}

        <div ref={loaderRef} className="h-10 flex items-center justify-center">
          {loading && <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />}
        </div>
      </div>
    </div>
  );
}

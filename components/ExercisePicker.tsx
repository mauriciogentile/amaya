"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, X, ChevronDown, Plus, CheckCircle2 } from "lucide-react";

interface Exercise {
  _id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl: string;
  imageUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

const BODY_PARTS = ["", "back", "cardio", "chest", "lower arms", "lower legs", "neck", "shoulders", "upper arms", "upper legs", "waist"];
const EQUIPMENT_TYPES = ["", "barbell", "dumbbell", "machine", "bodyweight", "cable"];
const BODY_PART_LABELS: Record<string, string> = {
  "": "All",
  back: "Back", cardio: "Cardio", chest: "Chest",
  "lower arms": "Forearms", "lower legs": "Calves",
  neck: "Neck", shoulders: "Shoulders",
  "upper arms": "Arms", "upper legs": "Legs", waist: "Core",
};

export function ExercisePicker({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchExercises = useCallback(async (query: string, bp: string, eq: string, pg: number, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ q: query, bodyPart: bp, equipment: eq, page: String(pg) });
    const res = await fetch(`/api/exercises?${params}`);
    const data = await res.json();
    setExercises(prev => append ? [...prev, ...data.exercises] : data.exercises);
    setHasMore(pg < data.pages);
    setPage(pg);
    setLoading(false);
  }, []);

  // Reset + fetch when filters change
  useEffect(() => {
    if (!open) return;
    setPage(1);
    setAdded(null);
    fetchExercises(q, bodyPart, equipment, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, bodyPart, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Infinite scroll
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
  }, [hasMore, loading, q, bodyPart, page, fetchExercises]);

  const handleSelect = (ex: Exercise) => {
    setAdded(ex._id);
    onSelect(ex);
    setTimeout(() => setAdded(null), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-auto bg-card rounded-t-2xl h-[92vh] flex flex-col overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-lg font-bold text-foreground">Add Exercise</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
            <Search size={16} className="text-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search exercises..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="bg-transparent text-foreground placeholder-white/40 text-sm flex-1 outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-foreground/40">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Body Part Filter */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {BODY_PARTS.map(bp => (
            <button
              key={bp}
              onClick={() => setBodyPart(bp)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                bodyPart === bp
                  ? "bg-emerald-500 text-black"
                  : "bg-white/10 text-foreground/60"
              }`}
            >
              {BODY_PART_LABELS[bp]}
            </button>
          ))}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {exercises.map(ex => (
            <div
              key={ex._id}
              className="flex items-center gap-3 bg-white/5 rounded-xl p-3 active:bg-white/10 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-white/10 overflow-hidden shrink-0">
                {ex.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/20 text-2xl">💪</div>
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

              {/* Add button */}
              <button
                onClick={() => handleSelect(ex)}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  added === ex._id
                    ? "bg-emerald-500"
                    : "bg-emerald-500 active:scale-90"
                }`}
              >
                {added === ex._id ? <CheckCircle2 size={18} className="text-foreground" /> : <Plus size={18} className="text-foreground" />}
              </button>
            </div>
          ))}

          {/* Loader sentinel */}
          <div ref={loaderRef} className="h-8 flex items-center justify-center">
            {loading && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Check, ChevronDown, ChevronUp, Clock, X, Plus, Trash2 } from "lucide-react";

interface WorkoutSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  type: string;
  done?: boolean;
}

interface WorkoutExercise {
  exerciseName: string;
  exerciseId?: string;
  sets: WorkoutSet[];
  restSeconds: number;
  order: number;
}

interface Workout {
  _id: string;
  name: string;
  exercises: WorkoutExercise[];
  startedAt: string;
  isComplete: boolean;
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  const pct = (left / seconds) * 100;
  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50" onClick={onDone}>
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#27272a" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#34d399" strokeWidth="2.5"
              strokeDasharray={`${pct} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{left}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Rest · tap to skip</p>
      </div>
    </div>
  );
}

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [resting, setResting] = useState<{ seconds: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(w => {
      setWorkout(w);
      setExercises(w.exercises || []);
    });
  }, [id]);

  // Elapsed timer
  useEffect(() => {
    if (!workout) return;
    const start = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout]);

  // Auto-save exercises every 10s
  const save = useCallback((exs: WorkoutExercise[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises: exs }),
      });
    }, 10000);
  }, [id]);

  function updateSet(exIdx: number, setIdx: number, field: "reps" | "weightKg", value: string) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value === "" ? null : Number(value) }),
      });
      save(next);
      return next;
    });
  }

  function completeSet(exIdx: number, setIdx: number) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, done: !s.done }),
      });
      save(next);
      return next;
    });
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    if (!set.done) setResting({ seconds: ex.restSeconds || 90 });
  }

  function addSet(exIdx: number) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: null, weightKg: null, type: "normal" }],
      });
      save(next);
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, setNumber: si + 1 })),
      });
      save(next);
      return next;
    });
  }

  async function finish() {
    setFinishing(true);
    // Final save
    await fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises, finish: true }),
    });
    router.push(`/workout/${id}/summary`);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const doneSets = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);

  if (!workout) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-48">
      {resting && <RestTimer seconds={resting.seconds} onDone={() => setResting(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-foreground font-bold truncate max-w-[200px]">{workout.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock size={11} />{fmt(elapsed)}</span>
              <span>{doneSets}/{totalSets} sets</span>
            </div>
          </div>
          <button
            onClick={finish}
            disabled={finishing}
            className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors min-h-[44px]"
          >
            {finishing ? "Saving…" : "Finish"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-1 bg-emerald-500 transition-all" style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      {/* Exercises */}
      <div className="px-4 pt-4 max-w-lg mx-auto w-full space-y-4">
        {exercises.length === 0 && (
          <p className="text-center text-muted-foreground py-20">No exercises. Finish to save.</p>
        )}

        {exercises.map((ex, ei) => {
          const isCollapsed = collapsed[ei];
          const exDone = ex.sets.every(s => s.done);
          return (
            <div key={ei} className={`rounded-2xl border overflow-hidden transition-all ${exDone ? "border-emerald-800/50 bg-emerald-950/20" : "border-border bg-card"}`}>
              {/* Exercise header */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => setCollapsed(c => ({ ...c, [ei]: !c[ei] }))}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${exDone ? "bg-emerald-500" : "bg-muted"}`}>
                  {exDone ? <Check size={14} className="text-black" /> : <span className="text-xs text-foreground font-bold">{ei + 1}</span>}
                </div>
                <p className={`flex-1 font-semibold text-sm ${exDone ? "text-emerald-400" : "text-foreground"}`}>{ex.exerciseName}</p>
                {isCollapsed ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronUp size={16} className="text-muted-foreground" />}
              </button>

              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[28px_80px_80px_32px] gap-2 text-xs text-muted-foreground mb-1">
                    <span className="text-center">Set</span>
                    <span className="text-center">kg</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  {ex.sets.map((set, si) => (
                    <div key={si} className={`grid grid-cols-[28px_80px_80px_32px] gap-2 items-center transition-opacity ${set.done ? "opacity-60" : ""}`}>
                      <span className="text-xs text-muted-foreground text-center font-medium">{set.setNumber}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={set.weightKg ?? ""}
                        onChange={e => updateSet(ei, si, "weightKg", e.target.value)}
                        className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={set.reps ?? ""}
                        onChange={e => updateSet(ei, si, "reps", e.target.value)}
                        className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => completeSet(ei, si)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${set.done ? "bg-emerald-500" : "bg-muted hover:bg-muted"}`}
                      >
                        <Check size={14} className={set.done ? "text-black" : "text-muted-foreground"} />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addSet(ei)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus size={12} /> Add set
                    </button>
                    {ex.sets.length > 1 && (
                      <button
                        onClick={() => removeSet(ei, ex.sets.length - 1)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors ml-3"
                      >
                        <Trash2 size={12} /> Remove last
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating finish bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={finish}
            disabled={finishing}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-colors text-lg"
          >
            {finishing ? "Saving…" : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

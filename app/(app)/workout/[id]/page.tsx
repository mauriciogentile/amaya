"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { Check, ChevronDown, ChevronUp, Clock, X, Plus, Trash2, Ban, ArrowLeft, Save } from "lucide-react";

const KG_TO_LBS = 2.20462;
function toDisplay(kg: number | null, imperial: boolean): string {
  if (kg === null) return "";
  return imperial ? String(Math.round(kg * KG_TO_LBS * 10) / 10) : String(kg);
}
function toKg(val: string, imperial: boolean): number | null {
  if (val === "" || val === null) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return imperial ? Math.round((n / KG_TO_LBS) * 100) / 100 : n;
}

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
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (left <= 0) { onDoneRef.current(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = (left / seconds) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
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
            <span className="text-3xl font-bold text-foreground tabular-nums">{mm}:{ss}</span>
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
  const searchParams = useSearchParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [resting, setResting] = useState<{ seconds: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const [imperial, setImperial] = useState(false);

  // Edit mode: either ?mode=edit or workout is already complete
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(w => {
      setWorkout(w);
      setExercises(w.exercises || []);
      if (w.isComplete || searchParams.get("mode") === "edit") {
        setEditMode(true);
      }
    });
  }, [id, searchParams]);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(u => {
      if (u.unitSystem === "imperial") setImperial(true);
    }).catch(() => {});
  }, []);

  // Elapsed timer — only for active workouts
  useEffect(() => {
    if (!workout || editMode) return;
    const start = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout, editMode]);

  // Save helper — debounced for live mode, immediate for edit mode
  const save = useCallback((exs: WorkoutExercise[], immediate = false) => {
    clearTimeout(saveTimer.current);
    // Always persist only completed sets — undone sets are transient UI state
    const persisted = exs
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) }))
      .filter(ex => ex.sets.length > 0);
    const doSave = () => fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises: persisted }),
    });
    if (immediate) {
      doSave();
    } else {
      saveTimer.current = setTimeout(doSave, 10000);
    }
  }, [id]);

  function updateSet(exIdx: number, setIdx: number, field: "reps" | "weightKg", value: string) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : {
          ...s,
          [field]: field === "weightKg" ? toKg(value, imperial) : (value === "" ? null : Number(value)),
        }),
      });
      save(next, editMode);
      return next;
    });
  }

  function completeSet(exIdx: number, setIdx: number) {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    if (!set.done && (set.reps === null || set.reps <= 0)) return;
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, done: !s.done }),
      });
      save(next, editMode);
      return next;
    });
    // No rest timer in edit mode
    if (!set.done && !editMode) setResting({ seconds: ex.restSeconds || 90 });
  }

  function addSet(exIdx: number) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: [...ex.sets, { setNumber: ex.sets.length + 1, reps: null, weightKg: null, type: "normal" }],
      });
      save(next, editMode);
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.filter((_, si) => si !== setIdx).map((s, si) => ({ ...s, setNumber: si + 1 })),
      });
      save(next, editMode);
      return next;
    });
  }

  async function abort() {
    if (!confirm("Cancel this workout? It will be deleted.")) return;
    setAborting(true);
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function finish() {
    setFinishing(true);
    const doneExercises = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) }))
      .filter(ex => ex.sets.length > 0);
    await fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises: doneExercises, finish: true }),
    });
    router.push(`/workout/${id}/summary`);
  }

  async function saveAndBack() {
    setSaving(true);
    clearTimeout(saveTimer.current);
    const doneExercises = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) }))
      .filter(ex => ex.sets.length > 0);
    await fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises: doneExercises }),
    });
    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 600);
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
      {resting && !editMode && <RestTimer seconds={resting.seconds} onDone={() => setResting(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {editMode && (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ArrowLeft size={18} className="text-muted-foreground" />
              </button>
            )}
            <div>
              <p className="text-foreground font-bold truncate max-w-[200px]">{workout.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {editMode ? (
                  <span className="text-emerald-400 font-medium">Editing</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><Clock size={11} />{fmt(elapsed)}</span>
                    <span>{doneSets}/{totalSets} sets</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!editMode && doneSets === 0 && (
            <button
              onClick={abort}
              disabled={aborting}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-sm font-semibold px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <Ban size={15} />
              {aborting ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — only in active mode */}
      {!editMode && (
        <div className="h-1 bg-muted">
          <div className="h-1 bg-emerald-500 transition-all" style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }} />
        </div>
      )}

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
                    <span className="text-center">{imperial ? "lbs" : "kg"}</span>
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
                        value={toDisplay(set.weightKg, imperial)}
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
                        disabled={!set.done && (set.reps === null || set.reps <= 0)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${set.done ? "bg-emerald-500" : "bg-muted hover:bg-muted"} disabled:opacity-30`}
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

      {/* Floating action bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-lg mx-auto">
          {editMode ? (
            <button
              onClick={saveAndBack}
              disabled={saving}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={finishing}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-colors text-lg"
            >
              {finishing ? "Saving…" : "Finish Workout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

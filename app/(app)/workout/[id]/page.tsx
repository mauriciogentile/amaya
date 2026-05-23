"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { Check, ChevronDown, ChevronUp, Clock, X, Plus, Trash2, Ban, ArrowLeft, Save } from "lucide-react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { epley } from "@/lib/strength-score";

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
  restTimerEndsAt?: string | null;
}

function RestTimer({ endsAt, totalSeconds, onDone }: { endsAt: number; totalSeconds: number; onDone: () => void }) {
  const calcLeft = () => Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  const [left, setLeft] = useState(calcLeft);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (left <= 0) { onDoneRef.current(); return; }
    const t = setTimeout(() => setLeft(calcLeft()), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = (left / totalSeconds) * 100;
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
  const [resting, setResting] = useState<{ endsAt: number; totalSeconds: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const [imperial, setImperial] = useState(false);
  const [lastSets, setLastSets] = useState<Record<string, { setNumber: number; reps: number | null; weightKg: number | null }[]>>({});
  const [allTimePRs, setAllTimePRs] = useState<Record<string, number>>({});
  const [newPR, setNewPR] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Edit mode: either ?mode=edit or workout is already complete
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(w => {
      setWorkout(w);
      setExercises(w.exercises || []);
      if (w.isComplete || searchParams.get("mode") === "edit") {
        setEditMode(true);
      }
      // Restore rest timer if it was active when the session closed
      if (!w.isComplete && w.restTimerEndsAt) {
        const endsAt = new Date(w.restTimerEndsAt).getTime();
        if (endsAt > Date.now()) {
          // Infer totalSeconds from the endsAt — cap at 600 to be safe
          const secondsLeft = Math.round((endsAt - Date.now()) / 1000);
          setResting({ endsAt, totalSeconds: secondsLeft }); // total unknown; use remaining
        }
      }
      // Fetch last sets for all exercises in this workout
      const names = (w.exercises || []).map((e: WorkoutExercise) => e.exerciseName);
      if (names.length) {
        const qs = new URLSearchParams({ names: names.join(","), excludeId: w._id });
        fetch(`/api/workouts/last-sets?${qs}`).then(r => r.json()).then(ls => {
          setLastSets(ls);
          // Pre-fill set values with last session's data (only for new/incomplete workouts)
          if (!w.isComplete && searchParams.get("mode") !== "edit") {
            setExercises(prev => prev.map(ex => {
              const prevSets = ls[ex.exerciseName];
              if (!prevSets?.length) return ex;
              return {
                ...ex,
                sets: ex.sets.map((s, si) => {
                  const p = prevSets[si] ?? prevSets[prevSets.length - 1];
                  return {
                    ...s,
                    weightKg: s.weightKg ?? p?.weightKg ?? null,
                    reps: s.reps ?? p?.reps ?? null,
                  };
                }),
              };
            }));
          }
        }).catch(() => {});
        // Fetch all-time PRs
        const prQs = new URLSearchParams({ names: names.join(","), excludeId: w._id });
        fetch(`/api/workouts/prs?${prQs}`).then(r => r.json()).then(prs => {
          setAllTimePRs(prs);
        }).catch(() => {});
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

  // Persist rest timer endsAt to DB so it survives page reload
  const persistRestTimer = useCallback((endsAt: string | null) => {
    fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restTimerEndsAt: endsAt }),
    }).catch(() => {});
  }, [id]);

  function startResting(seconds: number) {
    const endsAt = Date.now() + seconds * 1000;
    setResting({ endsAt, totalSeconds: seconds });
    persistRestTimer(new Date(endsAt).toISOString());
  }

  function stopResting() {
    setResting(null);
    persistRestTimer(null);
  }

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

    // PR detection — only when completing (not un-completing) a set
    if (!set.done && set.weightKg && set.reps) {
      const newRM = epley(set.weightKg, set.reps);
      const currentPR = allTimePRs[ex.exerciseName] ?? 0;
      if (newRM > currentPR) {
        setAllTimePRs(prev => ({ ...prev, [ex.exerciseName]: newRM }));
        setNewPR(ex.exerciseName);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 50, 200]);
        }
        setTimeout(() => setNewPR(null), 3000);
      }
    }

    setExercises(prev => {
      const next = prev.map((ex, ei) => ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, done: !s.done }),
      });
      save(next, editMode);
      return next;
    });
    // No rest timer in edit mode
    if (!set.done && !editMode) startResting(ex.restSeconds || 90);
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

  function addExerciseAdHoc(ex: { _id: string; name: string; bodyPart: string; equipment: string; target: string; gifUrl: string; imageUrl: string }) {
    setExercises(prev => {
      const next = [...prev, {
        exerciseName: ex.name,
        exerciseId: ex._id,
        sets: [{ setNumber: 1, reps: null, weightKg: null, type: "normal" }],
        restSeconds: 90,
        order: prev.length,
      }];
      save(next, false);
      return next;
    });
    setPickerOpen(false);
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
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-48">
      {resting && !editMode && <RestTimer endsAt={resting.endsAt} totalSeconds={resting.totalSeconds} onDone={stopResting} />}

      {/* PR Flash Overlay */}
      {newPR && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none animate-pr-flash">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-3xl font-bold text-primary">New PR!</div>
          <div className="text-sm text-muted-foreground mt-2">{newPR}</div>
        </div>
      )}

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
                  <span className="text-primary font-medium">Editing</span>
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
          <div className="h-1 bg-primary transition-all" style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }} />
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
            <div key={ei} className={`rounded-2xl border overflow-hidden transition-all ${exDone ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
              {/* Exercise header */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => setCollapsed(c => ({ ...c, [ei]: !c[ei] }))}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${exDone ? "bg-primary" : "bg-muted"}`}>
                  {exDone ? <Check size={14} className="text-primary-foreground" /> : <span className="text-xs text-foreground font-bold">{ei + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${exDone ? "text-primary" : "text-foreground"}`}>{ex.exerciseName}</p>
                  {allTimePRs[ex.exerciseName] != null && (
                    <p className="text-[10px] text-muted-foreground">🏆 PR: {Math.round(allTimePRs[ex.exerciseName])} kg est. 1RM</p>
                  )}
                </div>
                {isCollapsed ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronUp size={16} className="text-muted-foreground" />}
              </button>

              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 text-xs text-muted-foreground mb-1">
                    <span className="text-center">Set</span>
                    <span className="text-center">{imperial ? "lbs" : "kg"}</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  {ex.sets.map((set, si) => {
                    const prev = lastSets[ex.exerciseName]?.[si];
                    const prevWeight = prev?.weightKg != null ? toDisplay(prev.weightKg, imperial) : null;
                    const prevReps = prev?.reps != null ? String(prev.reps) : null;
                    return (
                      <div key={si} className={`transition-opacity ${set.done ? "opacity-60" : ""}`}>
                        <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center">
                          <span className="text-xs text-muted-foreground text-center font-medium">{set.setNumber}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={prevWeight ?? "0"}
                            value={toDisplay(set.weightKg, imperial)}
                            onChange={e => updateSet(ei, si, "weightKg", e.target.value)}
                            onFocus={e => e.target.select()}
                            className="bg-muted border border-border rounded-lg px-3 py-2.5 text-base text-foreground font-semibold text-center focus:outline-none focus:border-primary w-full"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder={prevReps ?? "0"}
                            value={set.reps ?? ""}
                            onChange={e => updateSet(ei, si, "reps", e.target.value)}
                            onFocus={e => e.target.select()}
                            className="bg-muted border border-border rounded-lg px-3 py-2.5 text-base text-foreground font-semibold text-center focus:outline-none focus:border-primary w-full"
                          />
                          <button
                            onClick={() => completeSet(ei, si)}
                            disabled={!set.done && (set.reps === null || set.reps <= 0)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${set.done ? "bg-primary" : "bg-muted hover:bg-muted"} disabled:opacity-30`}
                          >
                            <Check size={14} className={set.done ? "text-primary-foreground" : "text-muted-foreground"} />
                          </button>
                        </div>
                        {prev && (
                          <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 mt-0.5">
                            <span />
                            <p className="text-[10px] text-muted-foreground text-center truncate">
                              {prevWeight != null ? `Last: ${prevWeight} ${imperial ? "lbs" : "kg"}` : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground text-center truncate">
                              {prevReps != null ? `Last: ${prevReps} reps` : ""}
                            </p>
                            <span />
                          </div>
                        )}
                      </div>
                    );
                  })}

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

      {/* Add Exercise button */}
      <div className="px-4 pt-2 pb-4 max-w-lg mx-auto w-full">
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExerciseAdHoc} />

      {/* Floating action bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-lg mx-auto">
          {editMode ? (
            <button
              onClick={saveAndBack}
              disabled={saving}
              className="w-full py-4 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={finishing}
              className="w-full py-4 bg-primary hover:bg-primary/80 text-primary-foreground font-bold rounded-2xl transition-colors text-lg"
            >
              {finishing ? "Saving…" : "Finish Workout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { Check, Plus, Trash2, Ban, ArrowLeft, Save, ChevronDown, ChevronUp, Clock } from "lucide-react";
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
  imageUrl?: string;
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

function smartRest(
  weightKg: number | null,
  reps: number | null,
  prRM: number | undefined,
  defaultSeconds: number
): { seconds: number; reason: string } {
  if (weightKg && reps && prRM && prRM > 0) {
    const intensity = epley(weightKg, reps) / prRM;
    if (intensity >= 0.90) return { seconds: 180, reason: "Heavy set — rest longer 💪" };
    if (intensity >= 0.75) return { seconds: 120, reason: "Solid set — take your time 👊" };
    if (intensity >= 0.50) return { seconds: 90,  reason: "Good work — standard rest 👍" };
    return { seconds: 60, reason: "Light set — keep moving ⚡" };
  }
  return { seconds: defaultSeconds || 90, reason: "Rest" };
}

function RestTimer({ endsAt, totalSeconds, onDone, reason }: { endsAt: number; totalSeconds: number; onDone: () => void; reason?: string }) {
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
        <p className="text-muted-foreground text-sm">{reason && reason !== "Rest" ? reason : "Rest"} · tap to skip</p>
      </div>
    </div>
  );
}

type TabId = "exercises" | "overview" | "notes";

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [resting, setResting] = useState<{ endsAt: number; totalSeconds: number; reason: string } | null>(null);
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
  const [activeTab, setActiveTab] = useState<TabId>("exercises");
  const [expandedEx, setExpandedEx] = useState<number | null>(null);

  // Edit mode: either ?mode=edit or workout is already complete
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(w => {
      setWorkout(w);
      setExercises(w.exercises || []);
      if (w.isComplete || searchParams.get("mode") === "edit") {
        setEditMode(true);
      }
      if (!w.isComplete && w.restTimerEndsAt) {
        const endsAt = new Date(w.restTimerEndsAt).getTime();
        if (endsAt > Date.now()) {
          const secondsLeft = Math.round((endsAt - Date.now()) / 1000);
          setResting({ endsAt, totalSeconds: secondsLeft, reason: "Rest" });
        }
      }
      const names = (w.exercises || []).map((e: WorkoutExercise) => e.exerciseName);
      if (names.length) {
        const qs = new URLSearchParams({ names: names.join(","), excludeId: w._id });
        fetch(`/api/workouts/last-sets?${qs}`).then(r => r.json()).then(ls => {
          setLastSets(ls);
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

  useEffect(() => {
    if (!workout || editMode) return;
    const start = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout, editMode]);

  const save = useCallback((exs: WorkoutExercise[], immediate = false) => {
    clearTimeout(saveTimer.current);
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

  const persistRestTimer = useCallback((endsAt: string | null) => {
    fetch(`/api/workouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restTimerEndsAt: endsAt }),
    }).catch(() => {});
  }, [id]);

  function startResting(seconds: number, reason = "Rest") {
    const endsAt = Date.now() + seconds * 1000;
    setResting({ endsAt, totalSeconds: seconds, reason });
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
    if (!set.done && !editMode) {
      const { seconds, reason } = smartRest(set.weightKg, set.reps, allTimePRs[ex.exerciseName], ex.restSeconds);
      startResting(seconds, reason);
    }
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
        imageUrl: ex.imageUrl || ex.gifUrl || "",
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

  // Determine active exercise index (first with at least one undone set)
  const activeExIdx = exercises.findIndex(ex => ex.sets.some(s => !s.done));

  if (!workout) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1724] pb-48">
      {resting && !editMode && <RestTimer endsAt={resting.endsAt} totalSeconds={resting.totalSeconds} reason={resting.reason} onDone={stopResting} />}

      {/* PR Flash Overlay */}
      {newPR && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none animate-pr-flash">
          <div className="text-6xl mb-4">🏆</div>
          <div className="text-3xl font-bold text-primary">New PR!</div>
          <div className="text-sm text-muted-foreground mt-2">{newPR}</div>
        </div>
      )}

      {/* Blue Header */}
      <div className="sticky top-0 z-40 bg-[#3b82f6] px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft size={22} />
          </button>
          {!editMode ? (
            <span className="text-white text-2xl font-bold tabular-nums tracking-tight">{fmt(elapsed)}</span>
          ) : (
            <span className="text-white text-lg font-bold">Editing</span>
          )}
          {!editMode && doneSets === 0 ? (
            <button
              onClick={abort}
              disabled={aborting}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <Ban size={20} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-[#151e2d] border-b border-[#1e2a3a] sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30">
        <div className="max-w-lg mx-auto flex">
          {(["exercises", "overview", "notes"] as TabId[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${
                activeTab === tab ? "text-[#3b82f6]" : "text-[#6b7fa3]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "exercises" && (
        <div className="px-4 pt-4 max-w-lg mx-auto w-full space-y-3">
          {exercises.length === 0 && (
            <p className="text-center text-[#6b7fa3] py-20">No exercises. Add one below.</p>
          )}

          {exercises.map((ex, ei) => {
            const exDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
            const isActive = !exDone && ei === activeExIdx;
            const isExpanded = expandedEx === ei;

            return (
              <div
                key={ei}
                className={`rounded-2xl overflow-hidden transition-all ${
                  exDone
                    ? "opacity-50"
                    : isActive
                    ? "ring-1 ring-[#3b82f6]/40"
                    : ""
                }`}
                style={{ background: "#151e2d" }}
              >
                {/* Exercise header row */}
                <button
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  onClick={() => setExpandedEx(isExpanded ? null : ei)}
                >
                  {/* Thumbnail with checkmark overlay */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#1e2a3a]">
                    {ex.imageUrl ? (
                      <img src={ex.imageUrl} alt={ex.exerciseName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6b7fa3] text-xs font-bold">
                        {ex.exerciseName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {exDone && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name + set summary */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${exDone ? "text-[#6b7fa3]" : "text-white"}`}>
                      {ex.exerciseName}
                    </p>
                    <p className="text-xs text-[#6b7fa3] mt-0.5">
                      {ex.sets.length} sets{ex.sets[0]?.reps ? ` × ${ex.sets[0].reps}${ex.sets.length > 1 && ex.sets[ex.sets.length - 1]?.reps !== ex.sets[0]?.reps ? `-${ex.sets[ex.sets.length - 1].reps}` : ""} reps` : ""}
                    </p>
                  </div>

                  {/* Expand chevron */}
                  {isExpanded
                    ? <ChevronUp size={16} className="text-[#6b7fa3] flex-shrink-0" />
                    : <ChevronDown size={16} className="text-[#6b7fa3] flex-shrink-0" />
                  }
                </button>

                {/* Expanded set editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-[#1e2a3a] pt-3">
                    {/* Column headers */}
                    <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 text-xs text-[#6b7fa3] mb-1">
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
                        <div key={si} className={`transition-opacity ${set.done ? "opacity-50" : ""}`}>
                          <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center">
                            <span className="text-xs text-[#6b7fa3] text-center font-medium">{set.setNumber}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder={prevWeight ?? "0"}
                              value={toDisplay(set.weightKg, imperial)}
                              onChange={e => updateSet(ei, si, "weightKg", e.target.value)}
                              onFocus={e => e.target.select()}
                              className="bg-[#1e2a3a] border border-[#2a3a50] rounded-lg px-3 py-2.5 text-base text-white font-semibold text-center focus:outline-none focus:border-[#3b82f6] w-full"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder={prevReps ?? "0"}
                              value={set.reps ?? ""}
                              onChange={e => updateSet(ei, si, "reps", e.target.value)}
                              onFocus={e => e.target.select()}
                              className="bg-[#1e2a3a] border border-[#2a3a50] rounded-lg px-3 py-2.5 text-base text-white font-semibold text-center focus:outline-none focus:border-[#3b82f6] w-full"
                            />
                            <button
                              onClick={() => completeSet(ei, si)}
                              disabled={!set.done && (set.reps === null || set.reps <= 0)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${set.done ? "bg-emerald-500" : "bg-[#1e2a3a] hover:bg-[#2a3a50]"} disabled:opacity-30`}
                            >
                              <Check size={14} className={set.done ? "text-white" : "text-[#6b7fa3]"} />
                            </button>
                          </div>
                          {prev && (
                            <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 mt-0.5">
                              <span />
                              <p className="text-[10px] text-[#6b7fa3] text-center truncate">
                                {prevWeight != null ? `Last: ${prevWeight} ${imperial ? "lbs" : "kg"}` : ""}
                              </p>
                              <p className="text-[10px] text-[#6b7fa3] text-center truncate">
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
                        className="flex items-center gap-1 text-xs text-[#6b7fa3] hover:text-white transition-colors"
                      >
                        <Plus size={12} /> Add set
                      </button>
                      {ex.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(ei, ex.sets.length - 1)}
                          className="flex items-center gap-1 text-xs text-[#6b7fa3] hover:text-red-400 transition-colors ml-3"
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

          {/* Add Exercise button */}
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[#3b82f6] text-sm font-semibold transition-colors hover:bg-[#1e2a3a]"
            style={{ background: "#151e2d" }}
          >
            <Plus size={16} /> Add Exercise
          </button>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="px-4 pt-6 max-w-lg mx-auto w-full">
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "#151e2d" }}>
            <p className="text-white font-bold text-base">{workout.name}</p>
            <div className="flex items-center gap-2 text-[#6b7fa3] text-sm">
              <Clock size={14} />
              <span>{fmt(elapsed)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6b7fa3]">Sets completed</span>
              <span className="text-white font-semibold">{doneSets} / {totalSets}</span>
            </div>
            <div className="h-2 bg-[#1e2a3a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3b82f6] rounded-full transition-all"
                style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6b7fa3]">Exercises</span>
              <span className="text-white font-semibold">{exercises.length}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="px-4 pt-6 max-w-lg mx-auto w-full">
          <textarea
            placeholder="Add workout notes..."
            className="w-full h-48 rounded-2xl p-4 text-white placeholder-[#6b7fa3] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            style={{ background: "#151e2d" }}
          />
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExerciseAdHoc} />

      {/* Bottom action bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 p-4 z-50">
        <div className="max-w-lg mx-auto">
          {editMode ? (
            <button
              onClick={saveAndBack}
              disabled={saving}
              className="w-full py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={finishing}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-colors text-lg"
            >
              {finishing ? "Saving…" : "Finish Workout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

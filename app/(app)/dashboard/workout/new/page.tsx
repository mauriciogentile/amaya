'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Check, X, Search, Clock, Dumbbell, ChevronLeft } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SetRow { id: string; reps: string; weight: string; rpe: string; done: boolean; type: "normal"|"warmup"|"dropset" }
interface WorkoutExercise { id: string; exerciseId: string; name: string; sets: SetRow[]; restSeconds: number; note: string }
interface Exercise { _id: string; name: string; muscleGroups: string[]; equipment: string }

const MUSCLE_GROUPS = ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core","traps","forearms"];
const EQUIPMENT = ["barbell","dumbbell","cable","machine","bodyweight"];

function newSet(prev?: SetRow): SetRow {
  return { id: crypto.randomUUID(), reps: prev?.reps || "", weight: prev?.weight || "", rpe: "", done: false, type: "normal" };
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function useRestTimer() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [total, setTotal] = useState(90);
  const ref = useRef<ReturnType<typeof setInterval>>(undefined);

  const start = useCallback((secs: number) => {
    clearInterval(ref.current);
    setTotal(secs); setSeconds(secs); setActive(true);
    ref.current = setInterval(() => {
      setSeconds(s => { if (s <= 1) { clearInterval(ref.current); setActive(false); return 0; } return s - 1; });
    }, 1000);
  }, []);

  const stop = useCallback(() => { clearInterval(ref.current); setActive(false); }, []);
  useEffect(() => () => clearInterval(ref.current), []);
  return { active, seconds, total, start, stop };
}

// ─── Exercise Picker Sheet ────────────────────────────────────────────────────
function ExercisePicker({ onAdd, onClose }: { onAdd: (e: Exercise) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (muscle) params.set("muscle", muscle);
    if (equipment) params.set("equipment", equipment);
    fetch(`/api/exercises?${params}`).then(r => r.json()).then(d => { setExercises(d); setLoading(false); });
  }, [q, muscle, equipment]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-800">
        <button onClick={onClose}><X className="w-5 h-5 text-zinc-400" /></button>
        <h2 className="font-bold text-lg flex-1">Add Exercise</h2>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises…"
            className="bg-transparent flex-1 text-sm outline-none placeholder-zinc-600" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setMuscle("")} className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${!muscle ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-zinc-700 text-zinc-400"}`}>
            All muscles
          </button>
          {MUSCLE_GROUPS.map(m => (
            <button key={m} onClick={() => setMuscle(muscle === m ? "" : m)}
              className={`flex-shrink-0 capitalize text-xs px-3 py-1.5 rounded-full border transition-colors ${muscle === m ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-zinc-700 text-zinc-400"}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setEquipment("")} className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${!equipment ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-zinc-700 text-zinc-400"}`}>
            All equipment
          </button>
          {EQUIPMENT.map(e => (
            <button key={e} onClick={() => setEquipment(equipment === e ? "" : e)}
              className={`flex-shrink-0 capitalize text-xs px-3 py-1.5 rounded-full border transition-colors ${equipment === e ? "border-emerald-400 text-emerald-400 bg-emerald-400/10" : "border-zinc-700 text-zinc-400"}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-10 text-zinc-600">Loading…</div>
        ) : exercises.length === 0 ? (
          <div className="flex justify-center pt-10 text-zinc-600 text-sm">No exercises found</div>
        ) : exercises.map(ex => (
          <button key={ex._id} onClick={() => { onAdd(ex); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-900 hover:bg-zinc-900 text-left active:bg-zinc-800">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ex.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{ex.muscleGroups.slice(0,2).join(", ")} · {ex.equipment}</p>
            </div>
            <Plus className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Set Row Component ────────────────────────────────────────────────────────
function SetRowItem({ set, index, prev, onChange, onRemove, onComplete }:
  { set: SetRow; index: number; prev?: { reps: string; weight: string }; onChange: (s: SetRow) => void; onRemove: () => void; onComplete: () => void }) {
  return (
    <div className={`flex items-center gap-2 py-2 px-1 rounded-xl transition-colors ${set.done ? "bg-emerald-400/5" : ""}`}>
      {/* Set number / type badge */}
      <div className="w-7 text-center">
        {set.type === "warmup" ? (
          <span className="text-xs text-yellow-400 font-bold">W</span>
        ) : (
          <span className="text-xs text-zinc-500 font-medium">{index + 1}</span>
        )}
      </div>

      {/* Previous */}
      <div className="w-16 text-center">
        {prev ? <span className="text-xs text-zinc-600">{prev.weight}×{prev.reps}</span> : <span className="text-xs text-zinc-700">—</span>}
      </div>

      {/* Weight */}
      <input
        type="number" inputMode="decimal" value={set.weight}
        onChange={e => onChange({ ...set, weight: e.target.value })}
        placeholder="kg" disabled={set.done}
        className="flex-1 bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
      />

      {/* Reps */}
      <input
        type="number" inputMode="numeric" value={set.reps}
        onChange={e => onChange({ ...set, reps: e.target.value })}
        placeholder="reps" disabled={set.done}
        className="flex-1 bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
      />

      {/* RPE */}
      <input
        type="number" inputMode="decimal" value={set.rpe}
        onChange={e => onChange({ ...set, rpe: e.target.value })}
        placeholder="RPE" disabled={set.done}
        className="w-14 bg-zinc-800 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
      />

      {/* Done / Remove */}
      {set.done ? (
        <button onClick={() => onChange({ ...set, done: false })} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <Check className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={onComplete} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 active:bg-emerald-500/20 active:text-emerald-400">
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Main Workout Page ────────────────────────────────────────────────────────
export default function NewWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [workoutName, setWorkoutName] = useState("Morning Workout");
  const [showPicker, setShowPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const timer = useRestTimer();
  const [restCountdown, setRestCountdown] = useState<null | { seconds: number; total: number }>(null);

  // Elapsed timer
  useEffect(() => {
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(i);
  }, [startTime]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  function addExercise(ex: Exercise) {
    setExercises(prev => [...prev, {
      id: crypto.randomUUID(),
      exerciseId: ex._id,
      name: ex.name,
      sets: [newSet()],
      restSeconds: 90,
      note: "",
    }]);
  }

  function removeExercise(id: string) {
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function addSet(exId: string) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      const last = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, newSet(last)] };
    }));
  }

  function updateSet(exId: string, setId: string, updated: SetRow) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.map(s => s.id === setId ? updated : s) };
    }));
  }

  function removeSet(exId: string, setId: string) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      if (e.sets.length === 1) return e;
      return { ...e, sets: e.sets.filter(s => s.id !== setId) };
    }));
  }

  function completeSet(exId: string, setId: string, restSecs: number) {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, done: true } : s) };
    }));
    timer.start(restSecs);
  }

  const totalSets = exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalVolume = exercises.reduce((a, e) =>
    a + e.sets.filter(s => s.done).reduce((b, s) => b + (parseFloat(s.weight)||0)*(parseInt(s.reps)||0), 0), 0);

  async function finishWorkout() {
    setSaving(true);
    const payload = {
      name: workoutName,
      startedAt: new Date(startTime),
      finishedAt: new Date(),
      durationMin: Math.round(elapsed / 60),
      isComplete: true,
      exercises: exercises.map((e, i) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        restSeconds: e.restSeconds,
        note: e.note,
        order: i,
        sets: e.sets.filter(s => s.done).map((s, j) => ({
          setNumber: j + 1,
          reps: parseInt(s.reps) || 0,
          weightKg: parseFloat(s.weight) || 0,
          rpe: parseFloat(s.rpe) || undefined,
          type: s.type,
          completedAt: new Date(),
        })),
      })).filter(e => e.sets.length > 0),
    };
    await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="text-zinc-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input value={workoutName} onChange={e => setWorkoutName(e.target.value)}
            className="flex-1 bg-transparent font-bold text-lg outline-none" />
          <button onClick={finishWorkout} disabled={saving || exercises.length === 0}
            className="bg-emerald-500 disabled:opacity-40 text-black font-bold px-4 py-1.5 rounded-xl text-sm transition-colors">
            {saving ? "Saving…" : "Finish"}
          </button>
        </div>
        {/* Stats bar */}
        <div className="flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(elapsed)}</span>
          <span>{totalSets} sets done</span>
          <span>{totalVolume.toLocaleString()} kg volume</span>
        </div>
      </div>

      {/* Rest Timer Banner */}
      {timer.active && (
        <div className="mx-4 mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Rest Timer</p>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">{fmt(timer.seconds)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-20 bg-zinc-800 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${(timer.seconds / timer.total) * 100}%` }} />
            </div>
            <button onClick={timer.stop} className="text-xs text-zinc-500 underline">Skip</button>
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="flex-1 px-4 pt-4 space-y-4">
        {exercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-700 gap-3">
            <Dumbbell className="w-10 h-10" />
            <p className="text-sm">No exercises yet</p>
            <p className="text-xs">Tap below to add your first exercise</p>
          </div>
        )}

        {exercises.map(ex => (
          <div key={ex.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            {/* Exercise header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => setCollapsed(c => ({ ...c, [ex.id]: !c[ex.id] }))} className="flex-1 text-left">
                <p className="font-semibold text-emerald-400">{ex.name}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{ex.sets.filter(s=>s.done).length}/{ex.sets.length} sets · Rest {ex.restSeconds}s</p>
              </button>
              <button onClick={() => setCollapsed(c => ({ ...c, [ex.id]: !c[ex.id] }))} className="text-zinc-600 p-1">
                {collapsed[ex.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={() => removeExercise(ex.id)} className="text-zinc-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {!collapsed[ex.id] && (
              <div className="px-3 pb-3 space-y-1">
                {/* Column headers */}
                <div className="flex gap-2 px-1 text-xs text-zinc-600 mb-1">
                  <div className="w-7 text-center">#</div>
                  <div className="w-16 text-center">Prev</div>
                  <div className="flex-1 text-center">kg</div>
                  <div className="flex-1 text-center">reps</div>
                  <div className="w-14 text-center">RPE</div>
                  <div className="w-8" />
                </div>

                {ex.sets.map((set, i) => (
                  <SetRowItem key={set.id} set={set} index={i}
                    onChange={s => updateSet(ex.id, set.id, s)}
                    onRemove={() => removeSet(ex.id, set.id)}
                    onComplete={() => completeSet(ex.id, set.id, ex.restSeconds)}
                  />
                ))}

                {/* Rest time control */}
                <div className="flex items-center gap-2 pt-2 px-1">
                  <span className="text-xs text-zinc-600">Rest:</span>
                  {[60, 90, 120, 180, 240].map(s => (
                    <button key={s} onClick={() => setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, restSeconds: s } : e))}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${ex.restSeconds === s ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {s}s
                    </button>
                  ))}
                </div>

                <button onClick={() => addSet(ex.id)}
                  className="w-full mt-2 py-2 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl hover:border-emerald-400/40 hover:text-emerald-400/60 transition-colors flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Set
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Exercise Button */}
      <div className="px-4 pt-4">
        <button onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-emerald-400 font-semibold h-12 rounded-2xl hover:bg-zinc-800 transition-colors">
          <Plus className="w-5 h-5" /> Add Exercise
        </button>
      </div>

      {/* Discard */}
      <div className="px-4 pt-2">
        <button onClick={() => router.back()} className="w-full text-sm text-zinc-700 py-2">
          Discard Workout
        </button>
      </div>

      {showPicker && <ExercisePicker onAdd={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

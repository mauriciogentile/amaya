"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Plus, Dumbbell, X, Minus, Check } from "lucide-react";
import { ExercisePicker } from "@/components/ExercisePicker";

interface DayExercise {
  _id: string;
  name: string;
  muscleGroup?: string;
  sets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  note?: string;
  order: number;
}

interface ProgramDay {
  _id: string;
  name: string;
  description?: string;
  order: number;
  exercises: DayExercise[];
  notes?: string;
}

interface Program {
  _id: string;
  name: string;
  days: ProgramDay[];
}

const muscleGroupColor: Record<string, string> = {
  Chest:        "bg-red-900/50 text-red-300",
  Back:         "bg-blue-900/50 text-blue-300",
  Shoulders:    "bg-purple-900/50 text-purple-300",
  Quads:        "bg-orange-900/50 text-orange-300",
  Hamstrings:   "bg-yellow-900/50 text-yellow-300",
  Calves:       "bg-green-900/50 text-green-300",
  Biceps:       "bg-pink-900/50 text-pink-300",
  Triceps:      "bg-indigo-900/50 text-indigo-300",
  Core:         "bg-teal-900/50 text-teal-300",
  Glutes:       "bg-rose-900/50 text-rose-300",
  "Rear Delts": "bg-violet-900/50 text-violet-300",
};

function getMuscleColor(mg?: string) {
  if (!mg) return "bg-muted text-muted-foreground";
  return muscleGroupColor[mg] || "bg-muted text-muted-foreground";
}

function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

function Stepper({
  label, value, onChange, min = 1, max = 99,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
        >
          <Minus size={14} />
        </button>
        <span className="text-xl font-bold text-foreground w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

type Tab = "exercises" | "overview" | "notes";

export default function DayDetailPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const [program, setProgram] = useState<Program | null>(null);
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("exercises");
  const [programId, setProgramId] = useState("");
  const [dayId, setDayId] = useState("");

  // Edit sheet state
  const [editingEx, setEditingEx] = useState<DayExercise | null>(null);
  const [draft, setDraft] = useState<Partial<DayExercise>>({});
  const [saving, setSaving] = useState(false);

  // Exercise picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingEx, setAddingEx] = useState(false);

  const router = useRouter();

  useEffect(() => {
    Promise.resolve(params).then(async ({ id, dayId: did }) => {
      setProgramId(id);
      setDayId(did);
      try {
        const res = await fetch(`/api/programs/${id}`);
        const data: Program = await res.json();
        setProgram(data);
        const found = data.days.find((d) => d._id === did) ?? null;
        setDay(found);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  const openEdit = useCallback((ex: DayExercise) => {
    setEditingEx(ex);
    setDraft({ sets: ex.sets, minReps: ex.minReps, maxReps: ex.maxReps, restSeconds: ex.restSeconds });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingEx(null);
    setDraft({});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingEx || !programId || !dayId) return;
    setSaving(true);
    try {
      await fetch(`/api/programs/${programId}/day/${dayId}/exercise/${editingEx._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setDay((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex._id === editingEx._id ? { ...ex, ...draft } : ex
          ),
        };
      });
      closeEdit();
    } finally {
      setSaving(false);
    }
  }, [editingEx, programId, dayId, draft, closeEdit]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleExerciseSelect = useCallback(async (ex: any) => {
    if (!programId || !dayId || addingEx) return;
    setAddingEx(true);
    try {
      const res = await fetch(`/api/programs/${programId}/day/${dayId}/exercise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ex.name }),
      });
      const updatedDay = await res.json();
      setDay(updatedDay);
    } finally {
      setAddingEx(false);
    }
  }, [programId, dayId, addingEx]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="px-4 pt-6 max-w-lg mx-auto w-full space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center text-muted-foreground">
        Workout day not found.
      </div>
    );
  }

  const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-0 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{program?.name}</p>
            <h1 className="text-lg font-bold text-foreground leading-tight truncate">{day.name}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["exercises", "overview", "notes"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-foreground border-b-2 border-orange-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 pt-4 pb-24 max-w-lg mx-auto w-full">
        {activeTab === "exercises" && (
          <div className="space-y-3">
            {sortedExercises.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                <Dumbbell size={32} />
                <p className="text-sm">No exercises yet.</p>
                <p className="text-xs text-muted-foreground">Tap + Add Exercise to get started.</p>
              </div>
            ) : (
              sortedExercises.map((ex) => (
                <div
                  key={ex._id}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getMuscleColor(ex.muscleGroup)}`}>
                    {ex.muscleGroup?.slice(0, 2).toUpperCase() ?? "💪"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{ex.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {ex.sets} sets · {ex.minReps}–{ex.maxReps} reps · {formatRest(ex.restSeconds)} rest
                    </p>
                  </div>

                  <button
                    onClick={() => openEdit(ex)}
                    className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors shrink-0"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => setPickerOpen(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors"
            >
              <Plus size={16} />
              Add Exercise
            </button>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-4">
            {day.description && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Description</p>
                <p className="text-sm text-foreground">{day.description}</p>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Summary</p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{sortedExercises.length}</p>
                  <p className="text-xs text-muted-foreground">Exercises</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {sortedExercises.reduce((sum, ex) => sum + ex.sets, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Sets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    ~{Math.round(sortedExercises.reduce((sum, ex) => sum + ex.sets * (ex.restSeconds + 45), 0) / 60)}
                  </p>
                  <p className="text-xs text-muted-foreground">Est. Min</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-3">
            <textarea
              placeholder="Add notes for this workout day..."
              defaultValue={day.notes ?? ""}
              className="w-full h-48 bg-card border border-border rounded-xl p-4 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-border"
            />
            <p className="text-xs text-muted-foreground text-center">Notes are saved locally for now.</p>
          </div>
        )}
      </div>

      {/* Edit Exercise Sheet */}
      {editingEx && (
        <>
          <div className="fixed inset-0 bg-background/60 z-40" onClick={closeEdit} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border rounded-t-2xl px-4 pt-4 pb-8 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Editing</p>
                <h2 className="text-base font-bold text-foreground truncate">{editingEx.name}</h2>
              </div>
              <button
                onClick={closeEdit}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground ml-3 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex justify-around mb-6">
              <Stepper
                label="Sets"
                value={draft.sets ?? editingEx.sets}
                onChange={(v) => setDraft((d) => ({ ...d, sets: v }))}
                min={1} max={20}
              />
              <Stepper
                label="Min Reps"
                value={draft.minReps ?? editingEx.minReps}
                onChange={(v) => setDraft((d) => ({ ...d, minReps: Math.min(v, draft.maxReps ?? editingEx.maxReps) }))}
                min={1} max={99}
              />
              <Stepper
                label="Max Reps"
                value={draft.maxReps ?? editingEx.maxReps}
                onChange={(v) => setDraft((d) => ({ ...d, maxReps: Math.max(v, draft.minReps ?? editingEx.minReps) }))}
                min={1} max={99}
              />
            </div>

            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Rest Time</p>
              <div className="flex gap-2 flex-wrap">
                {REST_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setDraft((d) => ({ ...d, restSeconds: s }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (draft.restSeconds ?? editingEx.restSeconds) === s
                        ? "bg-orange-500 text-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {formatRest(s)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors min-h-[44px]"
            >
              {saving ? (
                <span className="text-sm">Saving...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span className="text-sm">Save Changes</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Exercise Picker */}
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleExerciseSelect}
      />
    </div>
  );
}

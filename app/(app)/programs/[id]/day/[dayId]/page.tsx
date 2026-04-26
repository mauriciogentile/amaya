"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Plus, Dumbbell } from "lucide-react";

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
  Chest:      "bg-red-900/50 text-red-300",
  Back:       "bg-blue-900/50 text-blue-300",
  Shoulders:  "bg-purple-900/50 text-purple-300",
  Quads:      "bg-orange-900/50 text-orange-300",
  Hamstrings: "bg-yellow-900/50 text-yellow-300",
  Calves:     "bg-green-900/50 text-green-300",
  Biceps:     "bg-pink-900/50 text-pink-300",
  Triceps:    "bg-indigo-900/50 text-indigo-300",
  Core:       "bg-teal-900/50 text-teal-300",
  Glutes:     "bg-rose-900/50 text-rose-300",
  "Rear Delts": "bg-violet-900/50 text-violet-300",
};

function getMuscleColor(mg?: string) {
  if (!mg) return "bg-zinc-800 text-zinc-400";
  return muscleGroupColor[mg] || "bg-zinc-800 text-zinc-400";
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
  const router = useRouter();

  useEffect(() => {
    Promise.resolve(params).then(async ({ id, dayId }) => {
      try {
        const res = await fetch(`/api/programs/${id}`);
        const data: Program = await res.json();
        setProgram(data);
        const found = data.days.find((d) => d._id === dayId) ?? null;
        setDay(found);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950">
        <div className="px-4 pt-6 max-w-lg mx-auto w-full space-y-4 animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-1/2" />
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center text-zinc-400">
        Workout day not found.
      </div>
    );
  }

  const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="px-4 pt-6 pb-0 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">{program?.name}</p>
            <h1 className="text-lg font-bold text-white leading-tight truncate">{day.name}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(["exercises", "overview", "notes"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-white border-b-2 border-orange-500"
                  : "text-zinc-500 hover:text-zinc-300"
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
              <div className="flex flex-col items-center py-16 gap-3 text-zinc-500">
                <Dumbbell size={32} />
                <p className="text-sm">No exercises yet.</p>
                <p className="text-xs text-zinc-600">Tap + Add Exercise to get started.</p>
              </div>
            ) : (
              sortedExercises.map((ex) => (
                <div
                  key={ex._id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3"
                >
                  {/* Muscle group pill */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getMuscleColor(ex.muscleGroup)}`}>
                    {ex.muscleGroup?.slice(0, 2).toUpperCase() ?? "—"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{ex.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {ex.sets} sets × {ex.minReps}–{ex.maxReps} reps
                    </p>
                  </div>

                  <button className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              ))
            )}

            {/* Add Exercise */}
            <button
              onClick={() => alert("Exercise picker coming soon!")}
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Description</p>
                <p className="text-sm text-zinc-300">{day.description}</p>
              </div>
            )}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Summary</p>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{sortedExercises.length}</p>
                  <p className="text-xs text-zinc-500">Exercises</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {sortedExercises.reduce((sum, ex) => sum + ex.sets, 0)}
                  </p>
                  <p className="text-xs text-zinc-500">Total Sets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    ~{Math.round(sortedExercises.reduce((sum, ex) => sum + ex.sets * (ex.restSeconds + 45), 0) / 60)}
                  </p>
                  <p className="text-xs text-zinc-500">Est. Min</p>
                </div>
              </div>
            </div>

            {/* Muscle breakdown */}
            {sortedExercises.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">Muscles Worked</p>
                {Array.from(new Set(sortedExercises.map((e) => e.muscleGroup).filter(Boolean))).map((mg) => (
                  <div key={mg} className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${getMuscleColor(mg)}`}>
                      {mg}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {sortedExercises.filter((e) => e.muscleGroup === mg).length} exercise
                      {sortedExercises.filter((e) => e.muscleGroup === mg).length > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-3">
            <textarea
              placeholder="Add notes for this workout day..."
              defaultValue={day.notes ?? ""}
              className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-600 text-center">Notes are saved locally for now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

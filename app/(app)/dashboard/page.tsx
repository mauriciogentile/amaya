"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, ChevronRight, Clock, MapPin, Zap, Plus } from "lucide-react";
import WorkoutCalendar from "@/components/WorkoutCalendar";

interface ProgramDay {
  _id: string;
  name: string;
  description?: string;
  exercises: any[];
}

interface Program {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  days: ProgramDay[];
  suggestedDayIndex: number;
  lastWorkoutAt?: string;
}

function timeAgo(date?: string) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

const locationIcon: Record<string, string> = { gym: "🏛️", home: "🏠", outdoor: "🌳" };

export default function LogPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [selected, setSelected] = useState<{ programId: string; dayIdx: number } | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/programs/for-workout").then(r => r.json()),
      fetch("/api/workouts/active").then(r => r.json()),
    ]).then(([progs, active]) => {
      setPrograms(Array.isArray(progs) ? progs : []);
      setActiveWorkout(active);
      // Pre-select first program's suggested day
      if (progs?.length > 0) {
        setSelected({ programId: progs[0]._id, dayIdx: progs[0].suggestedDayIndex });
      }
      setLoading(false);
    });
  }, []);

  async function startWorkout() {
    if (!selected) return;
    setStarting(true);
    const prog = programs.find(p => p._id === selected.programId)!;
    const day = prog.days[selected.dayIdx];
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${prog.name} — ${day.name}`,
        programId: prog._id,
        dayId: day._id,
        exercises: day.exercises,
      }),
    });
    const workout = await res.json();
    router.push(`/workout/${workout._id}`);
  }

  async function startEmpty() {
    setStarting(true);
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Empty Workout", exercises: [] }),
    });
    const workout = await res.json();
    router.push(`/workout/${workout._id}`);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold text-foreground mb-1">Let's train</h1>
        <p className="text-muted-foreground text-sm mb-6">Pick a plan or start fresh</p>

        {/* Active workout banner */}
        {activeWorkout && (
          <button
            onClick={() => router.push(`/workout/${activeWorkout._id}`)}
            className="w-full mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center gap-3 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 font-semibold text-sm">Workout in progress</p>
              <p className="text-muted-foreground text-xs truncate">{activeWorkout.name}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        )}

        {/* Plan cards */}
        {programs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Dumbbell size={40} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No plans yet. Create one in Plans.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {programs.map(prog => {
              const isSel = selected?.programId === prog._id;
              const selDayIdx = isSel ? selected.dayIdx : prog.suggestedDayIndex;
              const selDay = prog.days[selDayIdx];

              return (
                <div
                  key={prog._id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isSel ? "border-emerald-500/50 bg-emerald-500/5" : "border-border bg-card"
                  }`}
                >
                  {/* Program header */}
                  <button
                    className="w-full p-4 text-left"
                    onClick={() => setSelected({ programId: prog._id, dayIdx: prog.suggestedDayIndex })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{prog.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {prog.location || "gym"}
                          </span>
                          {prog.lastWorkoutAt && (
                            <span className="text-xs text-muted-foreground">· {timeAgo(prog.lastWorkoutAt)}</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                        isSel ? "border-emerald-400 bg-emerald-400" : "border-border"
                      }`} />
                    </div>
                  </button>

                  {/* Day selector — only shown when selected */}
                  {isSel && prog.days.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Select day</p>
                      <div className="flex flex-col gap-2">
                        {prog.days.map((day, idx) => {
                          const issugg = idx === prog.suggestedDayIndex && !prog.lastWorkoutAt === false;
                          return (
                            <button
                              key={day._id}
                              onClick={() => setSelected({ programId: prog._id, dayIdx: idx })}
                              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                selDayIdx === idx
                                  ? "bg-emerald-500/20 border border-emerald-500/40"
                                  : "bg-muted/50 border border-transparent"
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                selDayIdx === idx ? "bg-emerald-500 text-black" : "bg-muted text-muted-foreground"
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${selDayIdx === idx ? "text-foreground" : "text-muted-foreground"}`}>
                                  {day.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {day.exercises?.length || 0} exercises
                                </p>
                                {day.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {day.description}
                                  </p>
                                )}
                              </div>
                              {idx === prog.suggestedDayIndex && (
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex-shrink-0">
                                  Next up
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Start button */}
        {selected && (
          <button
            onClick={startWorkout}
            disabled={starting}
            className="w-full py-4 rounded-2xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-lg transition-colors flex items-center justify-center gap-2 mb-3"
            aria-label="Start Workout"
          >
            <Dumbbell size={20} />
            {starting ? "Starting…" : "Start Workout"}
          </button>
        )}

        {/* Empty / freestyle option */}
        <button
          onClick={startEmpty}
          disabled={starting}
          className="w-full py-3.5 rounded-2xl border border-border text-muted-foreground font-semibold flex items-center justify-center gap-2 hover:border-border transition-colors"
        >
          <Plus size={16} />
          Start empty workout
        </button>

        <WorkoutCalendar />
      </div>
    </div>
  );
}

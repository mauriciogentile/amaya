"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, Dumbbell, TrendingUp, Home, Flame } from "lucide-react";

export default function WorkoutSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<any>(null);
  const [summaryStats, setSummaryStats] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/workouts/${id}`).then(r => r.json()).then(setWorkout);
    fetch(`/api/workouts/${id}/summary-stats`).then(r => r.json()).then(setSummaryStats);
  }, [id]);

  if (!workout) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalSets = workout.exercises?.reduce((a: number, e: any) => a + (e.sets?.length || 0), 0) || 0;
  const totalVolume = workout.exercises?.reduce((a: number, e: any) =>
    a + (e.sets?.reduce((sa: number, s: any) => sa + ((s.weightKg || 0) * (s.reps || 0)), 0) || 0), 0) || 0;
  const exercisesDone = workout.exercises?.filter((e: any) => e.sets?.length > 0)?.length || 0;
  const duration = workout.durationMin || 0;

  const prs = summaryStats?.prs || {};
  const bestSets = summaryStats?.bestSets || {};
  const streak = summaryStats?.streak || 0;

  const stats = [
    { label: "Duration", value: `${duration}m`, icon: Clock },
    { label: "Exercises", value: String(exercisesDone), icon: Dumbbell },
    { label: "Sets", value: String(totalSets), icon: TrendingUp },
    { label: "Volume", value: `${Math.round(totalVolume).toLocaleString()} kg`, icon: Trophy },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <div className="max-w-lg w-full space-y-6">
        {/* Trophy */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Trophy size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Workout complete!</h1>
          <p className="text-muted-foreground text-sm truncate">{workout.name}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
              <Icon size={18} className="text-emerald-400" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
          {streak >= 2 && (
            <div className="col-span-2 bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
              <Flame size={18} className="text-orange-400" />
              <p className="text-2xl font-bold text-foreground">{streak}d</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          )}
        </div>

        {/* Exercise breakdown */}
        {workout.exercises?.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Exercises</p>
            {workout.exercises.map((ex: any, i: number) => {
              const doneSets = ex.sets || [];
              const vol = doneSets.reduce((a: number, s: any) => a + ((s.weightKg || 0) * (s.reps || 0)), 0);
              const isPR = prs[ex.exerciseName];
              const best = bestSets[ex.exerciseName];
              return (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground font-medium">{ex.exerciseName}</p>
                      {isPR && (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">🏆 PR</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doneSets.length} sets
                      {best && best.weightKg > 0 && (
                        <span className="ml-2">{best.reps} × {best.weightKg} kg</span>
                      )}
                    </p>
                  </div>
                  {vol > 0 && <p className="text-sm text-emerald-400 font-semibold">{Math.round(vol).toLocaleString()} kg</p>}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Home size={18} />
          Back to Home
        </button>
      </div>
    </div>
  );
}

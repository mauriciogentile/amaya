export const MUSCLE_EXERCISES: Record<string, string[]> = {
  chest:     ["barbell bench press", "dumbbell bench press", "push-up", "incline barbell bench press", "incline dumbbell press"],
  back:      ["deadlift", "barbell row", "pull-up", "lat pulldown", "dumbbell row", "cable row", "pendlay row"],
  legs:      ["barbell squat", "squat", "leg press", "romanian deadlift", "hack squat", "front squat"],
  shoulders: ["overhead press", "barbell overhead press", "dumbbell shoulder press", "arnold press", "seated dumbbell press", "military press"],
};

export const BASELINES: Record<string, number> = {
  chest: 60, back: 80, legs: 80, shoulders: 40,
};

export const TIER_LABELS = [
  { min: 160, label: "Elite" },
  { min: 120, label: "Advanced" },
  { min:  80, label: "Intermediate" },
  { min:   0, label: "Beginner" },
];

export function getTier(score: number): string {
  return TIER_LABELS.find(t => score >= t.min)?.label ?? "Beginner";
}

export function epley(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

interface WorkoutSet { reps?: number | null; weightKg?: number | null; done?: boolean; }
interface WorkoutExercise { exerciseName: string; sets: WorkoutSet[]; }
interface WorkoutInput { exercises: WorkoutExercise[]; }

export interface MuscleScore {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
}

export interface StrengthScoreResult {
  overallScore: number;
  muscles: MuscleScore[];
}

export function computeStrengthScore(workouts: WorkoutInput[]): StrengthScoreResult {
  const best1RM: Record<string, { name: string; value: number }> = {};

  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      const name = ex.exerciseName.toLowerCase().trim();
      for (const [muscle, exercises] of Object.entries(MUSCLE_EXERCISES)) {
        if (!exercises.includes(name)) continue;
        for (const set of ex.sets) {
          if (!set.weightKg || !set.reps) continue;
          const rm = epley(set.weightKg, set.reps);
          if (!best1RM[muscle] || rm > best1RM[muscle].value) {
            best1RM[muscle] = { name: ex.exerciseName, value: rm };
          }
        }
      }
    }
  }

  const muscles: MuscleScore[] = Object.keys(BASELINES).map(muscle => {
    const b = best1RM[muscle];
    const estimated1RM = b?.value ?? 0;
    const score = b ? Math.min(Math.round((estimated1RM / BASELINES[muscle]) * 100), 200) : 0;
    return { muscle, score, bestExercise: b?.name ?? "—", estimated1RM: Math.round(estimated1RM) };
  });

  const scored = muscles.filter(m => m.score > 0);
  const overallScore = scored.length
    ? Math.round(scored.reduce((a, m) => a + m.score, 0) / scored.length)
    : 0;

  return { overallScore, muscles };
}

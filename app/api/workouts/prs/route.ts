import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import { epley } from "@/lib/strength-score";

export const dynamic = "force-dynamic";

// GET /api/workouts/prs?names=ExerciseA,ExerciseB&excludeId=<workoutId>
// Returns: { "ExerciseA": 120.5, "ExerciseB": 85.0 }  (estimated 1RM in kg)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const names = (searchParams.get("names") ?? "").split(",").map(n => n.trim()).filter(Boolean);
  const excludeId = searchParams.get("excludeId");

  if (!names.length) return NextResponse.json({});

  await connectDB();

  const query: Record<string, unknown> = {
    userId: session.user!.id,
    isComplete: true,
    "exercises.exerciseName": { $in: names },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const workouts = await Workout.find(query).lean() as {
    exercises: { exerciseName: string; sets: { reps: number | null; weightKg: number | null }[] }[]
  }[];

  const best: Record<string, number> = {};

  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      if (!names.includes(ex.exerciseName)) continue;
      for (const set of ex.sets) {
        if (!set.weightKg || !set.reps) continue;
        const rm = epley(set.weightKg, set.reps);
        if (!best[ex.exerciseName] || rm > best[ex.exerciseName]) {
          best[ex.exerciseName] = rm;
        }
      }
    }
  }

  return NextResponse.json(best);
}

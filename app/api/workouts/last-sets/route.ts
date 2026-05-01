import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

// GET /api/workouts/last-sets?names=ExerciseA,ExerciseB&excludeId=<workoutId>
// Returns: { "ExerciseA": [{setNumber, reps, weightKg}, ...], ... }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const names = (searchParams.get("names") ?? "").split(",").map(n => n.trim()).filter(Boolean);
  const excludeId = searchParams.get("excludeId");

  if (!names.length) return NextResponse.json({});

  await connectDB();

  const result: Record<string, { setNumber: number; reps: number | null; weightKg: number | null }[]> = {};

  await Promise.all(names.map(async (name) => {
    const query: Record<string, unknown> = {
      userId: session.user!.id,
      isComplete: true,
      "exercises.exerciseName": name,
    };
    if (excludeId) query._id = { $ne: excludeId };

    const workout = await Workout.findOne(query)
      .sort({ finishedAt: -1 })
      .lean() as { exercises: { exerciseName: string; sets: { setNumber: number; reps: number | null; weightKg: number | null }[] }[] } | null;

    if (!workout) return;

    const ex = workout.exercises.find(e => e.exerciseName === name);
    if (ex?.sets?.length) {
      result[name] = ex.sets.map(s => ({ setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg }));
    }
  }));

  return NextResponse.json(result);
}

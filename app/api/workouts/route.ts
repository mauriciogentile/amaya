import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

// GET /api/workouts — list recent workouts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const workouts = await Workout.find({ userId: session.user.id })
    .sort({ startedAt: -1 })
    .limit(20)
    .lean();
  return NextResponse.json(workouts);
}

// POST /api/workouts — start a new workout (optionally from a program day)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { name, programId, dayId, exercises } = body;

  // Build exercise list from program day exercises
  const workoutExercises = (exercises || []).map((e: any, i: number) => ({
    exerciseId: e.exerciseId,
    exerciseName: e.name,
    restSeconds: e.restSeconds || 90,
    order: i,
    sets: Array.from({ length: e.sets || 3 }, (_, si) => ({
      setNumber: si + 1,
      reps: null,
      weightKg: null,
      type: "normal",
    })),
  }));

  const workout = await Workout.create({
    userId: session.user.id,
    name: name || "Workout",
    templateId: programId || undefined,
    dayId: dayId || undefined,
    exercises: workoutExercises,
    startedAt: new Date(),
    isComplete: false,
  });

  return NextResponse.json(workout);
}

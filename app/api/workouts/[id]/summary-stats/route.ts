import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const workout = await Workout.findOne({ _id: id, userId: session.user.id }).lean() as any;
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;

  // All other completed workouts
  const otherWorkouts = await Workout.find({
    userId,
    isComplete: true,
    _id: { $ne: id },
  }).lean() as any[];

  const prs: Record<string, boolean> = {};
  const bestSets: Record<string, { reps: number; weightKg: number }> = {};

  for (const ex of workout.exercises || []) {
    const doneSets = ex.sets || [];
    if (!doneSets.length) continue;

    // Current max weight
    const currentMax = doneSets.reduce((m: number, s: any) => Math.max(m, s.weightKg || 0), 0);

    // Best set by volume
    let bestSet = { reps: 0, weightKg: 0 };
    for (const s of doneSets) {
      if ((s.weightKg || 0) * (s.reps || 0) > bestSet.weightKg * bestSet.reps) {
        bestSet = { reps: s.reps || 0, weightKg: s.weightKg || 0 };
      }
    }
    bestSets[ex.exerciseName] = bestSet;

    // Historical max
    let historicalMax = 0;
    for (const w of otherWorkouts) {
      for (const e of w.exercises || []) {
        const match = ex.exerciseId
          ? String(e.exerciseId) === String(ex.exerciseId)
          : e.exerciseName === ex.exerciseName;
        if (!match) continue;
        for (const s of e.sets || []) {
          if ((s.weightKg || 0) > historicalMax) {
            historicalMax = s.weightKg;
          }
        }
      }
    }

    if (currentMax > 0 && currentMax > historicalMax) {
      prs[ex.exerciseName] = true;
    }
  }

  // Streak calculation
  const allCompleted = await Workout.find({ userId, isComplete: true })
    .sort({ finishedAt: -1 })
    .lean() as any[];

  const toDay = (d: Date) => {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  };

  const today = toDay(new Date());
  const daySet = new Set<number>();
  daySet.add(today); // current workout counts as today

  for (const w of allCompleted) {
    if (w.finishedAt) daySet.add(toDay(new Date(w.finishedAt)));
  }

  let streak = 0;
  let cursor = today;
  while (daySet.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  return NextResponse.json({ prs, bestSets, streak });
}

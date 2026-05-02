import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import User from "@/lib/models/User";
import Exercise from "@/lib/models/Exercise";
import { EXERCISES } from "@/lib/exercises-seed";

export const dynamic = "force-dynamic";

// Build name → muscleGroups map from seed
const seedMap: Record<string, string[]> = {};
for (const ex of EXERCISES) {
  seedMap[ex.name.toLowerCase()] = ex.muscleGroups;
}

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

    const currentMax = doneSets.reduce((m: number, s: any) => Math.max(m, s.weightKg || 0), 0);

    let bestSet = { reps: 0, weightKg: 0 };
    for (const s of doneSets) {
      if ((s.weightKg || 0) * (s.reps || 0) > bestSet.weightKg * bestSet.reps) {
        bestSet = { reps: s.reps || 0, weightKg: s.weightKg || 0 };
      }
    }
    bestSets[ex.exerciseName] = bestSet;

    let historicalMax = 0;
    for (const w of otherWorkouts) {
      for (const e of w.exercises || []) {
        const match = ex.exerciseId
          ? String(e.exerciseId) === String(ex.exerciseId)
          : e.exerciseName === ex.exerciseName;
        if (!match) continue;
        for (const s of e.sets || []) {
          if ((s.weightKg || 0) > historicalMax) historicalMax = s.weightKg;
        }
      }
    }

    if (currentMax > 0 && currentMax > historicalMax) {
      prs[ex.exerciseName] = true;
    }
  }

  // Streak
  const allCompleted = await Workout.find({ userId, isComplete: true })
    .sort({ finishedAt: -1 })
    .lean() as any[];

  const toDay = (d: Date) => {
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  };

  const today = toDay(new Date());
  const daySet = new Set<number>();
  daySet.add(today);

  for (const w of allCompleted) {
    if (w.finishedAt) daySet.add(toDay(new Date(w.finishedAt)));
  }

  let streak = 0;
  let cursor = today;
  while (daySet.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  // Calories burned
  const user = await User.findById(userId).lean() as any;
  const bodyWeightKg = user?.weightKg || 70;
  const durationHours = (workout.durationMin || 0) / 60;
  const MET = 5;
  const caloriesBurned = Math.round(MET * bodyWeightKg * durationHours);

  // Muscle groups
  const muscleSet = new Set<string>();
  for (const ex of workout.exercises || []) {
    if (ex.exerciseId) {
      const dbEx = await Exercise.findById(ex.exerciseId).lean() as any;
      if (dbEx) {
        if (dbEx.bodyPart) muscleSet.add(dbEx.bodyPart.toLowerCase());
        if (dbEx.target) muscleSet.add(dbEx.target.toLowerCase());
        continue;
      }
    }
    // Fallback to seed
    const seedEntry = seedMap[ex.exerciseName?.toLowerCase()];
    if (seedEntry?.[0]) muscleSet.add(seedEntry[0].toLowerCase());
  }
  const muscleGroups = Array.from(muscleSet).sort();

  // vs Last Session
  let vsLast: { volumeDiffKg: number; setsDiff: number } | null = null;
  const currentVolume = (workout.exercises || []).reduce((a: number, e: any) =>
    a + (e.sets || []).reduce((sa: number, s: any) => sa + ((s.weightKg || 0) * (s.reps || 0)), 0), 0);
  const currentSets = (workout.exercises || []).reduce((a: number, e: any) => a + (e.sets?.length || 0), 0);

  // Find most recent other completed workout with same templateId or name
  const prevWorkouts = otherWorkouts
    .filter((w: any) => {
      if (workout.templateId && w.templateId && String(w.templateId) === String(workout.templateId)) return true;
      if (w.name === workout.name) return true;
      return false;
    })
    .sort((a: any, b: any) => new Date(b.finishedAt || b.createdAt).getTime() - new Date(a.finishedAt || a.createdAt).getTime());

  if (prevWorkouts.length > 0) {
    const prev = prevWorkouts[0];
    const prevVolume = (prev.exercises || []).reduce((a: number, e: any) =>
      a + (e.sets || []).reduce((sa: number, s: any) => sa + ((s.weightKg || 0) * (s.reps || 0)), 0), 0);
    const prevSets = (prev.exercises || []).reduce((a: number, e: any) => a + (e.sets?.length || 0), 0);
    vsLast = {
      volumeDiffKg: Math.round((currentVolume - prevVolume) * 10) / 10,
      setsDiff: currentSets - prevSets,
    };
  }

  return NextResponse.json({ prs, bestSets, streak, caloriesBurned, muscleGroups, vsLast });
}

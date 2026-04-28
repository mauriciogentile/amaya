import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import StrengthSnapshot from "@/lib/models/StrengthSnapshot";
import { computeStrengthScore } from "@/lib/strength-score";

export const dynamic = "force-dynamic";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(_: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const snapshots = await StrengthSnapshot
    .find({ userId: session.user.id })
    .sort({ weekStart: -1 })
    .limit(12)
    .lean();

  return NextResponse.json(snapshots.reverse());
}

export async function POST(_: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  let workouts = await Workout.find({
    userId: session.user.id,
    isComplete: true,
    startedAt: { $gte: weekStart, $lt: weekEnd },
  }).lean();

  if (workouts.length === 0) {
    workouts = await Workout.find({
      userId: session.user.id,
      isComplete: true,
    }).sort({ startedAt: -1 }).limit(20).lean();
  }

  const result = computeStrengthScore(workouts as any);

  const snapshot = await StrengthSnapshot.findOneAndUpdate(
    { userId: session.user.id, weekStart },
    { $set: { ...result, userId: session.user.id, weekStart } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(snapshot);
}

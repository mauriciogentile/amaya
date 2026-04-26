import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

// GET /api/workouts/active — find an in-progress workout
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);
  await connectDB();
  const workout = await Workout.findOne({ userId: session.user.id, isComplete: false })
    .sort({ startedAt: -1 })
    .lean();
  return NextResponse.json(workout);
}

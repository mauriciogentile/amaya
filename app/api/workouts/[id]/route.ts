import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

// GET /api/workouts/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const workout = await Workout.findOne({ _id: id, userId: session.user.id }).lean();
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workout);
}

// PATCH /api/workouts/[id] — update sets or finish
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const { exercises, finish, note } = body;

  const update: any = {};
  if (exercises) update.exercises = exercises;
  if (note !== undefined) update.note = note;
  if (finish) {
    update.isComplete = true;
    update.finishedAt = new Date();
    const workout = await Workout.findOne({ _id: id, userId: session.user.id });
    if (workout) {
      const ms = Date.now() - new Date(workout.startedAt).getTime();
      update.durationMin = Math.round(ms / 60000);
    }
  }

  const workout = await Workout.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { $set: update },
    { new: true }
  ).lean();

  return NextResponse.json(workout);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import "@/lib/models/Exercise"; // ensure Exercise schema is registered for populate

export const dynamic = "force-dynamic";

// GET /api/workouts/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const raw = await Workout.findOne({ _id: id, userId: session.user.id })
    .populate("exercises.exerciseId", "imageUrl gifUrl")
    .lean() as any;
  // Merge imageUrl from populated exerciseId into each exercise
  const workout = raw ? {
    ...raw,
    exercises: (raw.exercises || []).map((ex: any) => ({
      ...ex,
      imageUrl: ex.exerciseId?.imageUrl || ex.exerciseId?.gifUrl || "",
      exerciseId: ex.exerciseId?._id ?? ex.exerciseId,
    })),
  } : null;
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
  const { exercises, finish, note, restTimerEndsAt } = body;

  const update: any = {};
  if (exercises) update.exercises = exercises;
  if (note !== undefined) update.note = note;
  if (restTimerEndsAt !== undefined) update.restTimerEndsAt = restTimerEndsAt ? new Date(restTimerEndsAt) : null;
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

  // Recompute strength snapshot when workout is finished
  if (finish) {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    fetch(`${origin}/api/strength`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    }).catch(() => {});
  }

  return NextResponse.json(workout);
}

// DELETE /api/workouts/[id] — abort/cancel a workout
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const result = await Workout.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const workouts = await Workout.find({ userId, isComplete: true })
    .sort({ finishedAt: -1 }).limit(20);
  return NextResponse.json(workouts);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await connectDB();
  const workout = await Workout.create({ ...body, userId });
  return NextResponse.json(workout);
}

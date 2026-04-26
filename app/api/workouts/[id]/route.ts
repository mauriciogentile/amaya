import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  const workout = await Workout.findOneAndUpdate(
    { _id: id, userId },
    body,
    { new: true }
  );
  return NextResponse.json(workout);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  await Workout.findOneAndDelete({ _id: id, userId });
  return NextResponse.json({ ok: true });
}

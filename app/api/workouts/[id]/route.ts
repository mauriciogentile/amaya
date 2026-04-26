import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const workout = await Workout.findOne({ _id: id, userId: session.user.id });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(workout);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await Workout.findOneAndDelete({ _id: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}

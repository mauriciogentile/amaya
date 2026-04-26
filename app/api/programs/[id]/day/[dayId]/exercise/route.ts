import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/programs/[id]/day/[dayId]/exercise — add exercise to day
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, dayId } = await params;
  const body = await req.json();
  const { name, sets = 3, minReps = 8, maxReps = 12, restTime = 90 } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  await connectDB();
  const program = await Program.findOne({ _id: id, userId: session.user.id });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const day = program.days.id(dayId);
  if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });

  day.exercises.push({ name, sets, minReps, maxReps, restTime });
  await program.save();

  return NextResponse.json(day);
}

// DELETE /api/programs/[id]/day/[dayId]/exercise — remove exercise by index
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, dayId } = await params;
  const { exerciseIndex } = await req.json();

  await connectDB();
  const program = await Program.findOne({ _id: id, userId: session.user.id });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const day = program.days.id(dayId);
  if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });

  day.exercises.splice(exerciseIndex, 1);
  await program.save();

  return NextResponse.json({ ok: true });
}

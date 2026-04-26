import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const program = await Program.findOne({ _id: id, userId: session.user.id })
    .populate("days.exerciseIds", "name muscleGroup");
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(program);
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await Program.deleteOne({ _id: id, userId: session.user.id });
  return NextResponse.json({ success: true });
}

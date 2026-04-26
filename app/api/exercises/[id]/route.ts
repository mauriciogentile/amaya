import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const exercise = await Exercise.findById(id).lean();
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(exercise);
}

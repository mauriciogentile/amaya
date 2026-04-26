import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/lib/models/Exercise";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const muscle = searchParams.get("muscle");
  const equipment = searchParams.get("equipment");

  const filter: any = {};
  if (q) filter.name = { $regex: q, $options: "i" };
  if (muscle && muscle !== "all") filter.muscleGroup = muscle;
  if (equipment && equipment !== "all") filter.equipment = equipment;

  const exercises = await Exercise.find(filter).limit(100).lean();
  return NextResponse.json(exercises);
}

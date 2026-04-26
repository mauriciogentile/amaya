import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/lib/models/Exercise";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const muscle = searchParams.get("muscle") || "";
  const equipment = searchParams.get("equipment") || "";

  await connectDB();
  const filter: any = {
    $or: [{ isCustom: false }, { createdBy: userId }],
  };
  if (q) filter.name = { $regex: q, $options: "i" };
  if (muscle) filter.muscleGroups = muscle;
  if (equipment) filter.equipment = equipment;

  const exercises = await Exercise.find(filter).sort({ name: 1 }).limit(100);
  return NextResponse.json(exercises);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  await connectDB();
  const ex = await Exercise.create({ ...body, isCustom: true, createdBy: userId });
  return NextResponse.json(ex);
}

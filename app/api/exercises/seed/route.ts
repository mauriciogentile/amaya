import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import { EXERCISES } from "@/lib/exercises-seed";

export async function POST() {
  await connectDB();
  const count = await Exercise.countDocuments({ isCustom: false });
  if (count > 0) return NextResponse.json({ message: "Already seeded", count });
  await Exercise.insertMany(EXERCISES.map(e => ({ ...e, isCustom: false })));
  return NextResponse.json({ message: "Seeded", count: EXERCISES.length });
}

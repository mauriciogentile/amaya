import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const programs = await Program.find({ userId: session.user.id }).lean();

  // For each program, find the last completed workout to suggest next day
  const result = await Promise.all(programs.map(async (p: any) => {
    const lastWorkout = await Workout.findOne({
      userId: session.user.id,
      templateId: p._id,
      isComplete: true,
    }).sort({ finishedAt: -1 }).lean() as any;

    // Figure out which day was last done, suggest next
    let suggestedDayIndex = 0;
    if (lastWorkout && p.days?.length > 0) {
      const lastDayId = lastWorkout.dayId?.toString();
      const lastIdx = p.days.findIndex((d: any) => d._id.toString() === lastDayId);
      if (lastIdx >= 0) {
        suggestedDayIndex = (lastIdx + 1) % p.days.length;
      }
    }

    return {
      _id: p._id.toString(),
      name: p.name,
      description: p.description,
      location: p.location,
      days: p.days.map((d: any) => ({
        _id: d._id.toString(),
        name: d.name,
        exercises: d.exercises,
      })),
      suggestedDayIndex,
      lastWorkoutAt: lastWorkout?.finishedAt || null,
    };
  }));

  return NextResponse.json(result);
}

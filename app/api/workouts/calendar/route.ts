import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";

export const dynamic = "force-dynamic";

// GET /api/workouts/calendar?year=2025&month=4
// Returns workouts for the given month, grouped by day (YYYY-MM-DD)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  await connectDB();
  const workouts = await Workout.find({
    userId: session.user.id,
    startedAt: { $gte: start, $lt: end },
    isComplete: true,
  })
    .sort({ startedAt: 1 })
    .select("name startedAt finishedAt durationMin exercises")
    .lean();

  // Group by local date key YYYY-MM-DD
  const byDay: Record<string, any[]> = {};
  for (const w of workouts) {
    const d = new Date(w.startedAt as Date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push({
      _id: w._id,
      name: w.name,
      startedAt: w.startedAt,
      durationMin: w.durationMin,
      exerciseCount: (w.exercises as any[]).length,
    });
  }

  return NextResponse.json(byDay);
}

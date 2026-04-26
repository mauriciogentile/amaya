import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";

export const dynamic = "force-dynamic";

async function seedProgram(userId: string) {
  try {
    const count = await Program.countDocuments({ userId });
    if (count > 0) return;
    await Program.create({
      userId,
      name: "Push Pull Legs (PPL)",
      description: "6-day strength program for intermediate lifters",
      location: "gym",
      category: "strength",
      days: [
        {
          name: "Push A", order: 1, description: "Chest, shoulders, triceps",
          exercises: [
            { name: "Barbell Bench Press", muscleGroup: "Chest", sets: 4, minReps: 4, maxReps: 6, restSeconds: 180, order: 0 },
            { name: "Incline Dumbbell Press", muscleGroup: "Chest", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Overhead Press", muscleGroup: "Shoulders", sets: 3, minReps: 6, maxReps: 10, restSeconds: 120, order: 2 },
            { name: "Lateral Raise", muscleGroup: "Shoulders", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Tricep Pushdown", muscleGroup: "Triceps", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 4 },
          ],
        },
        {
          name: "Pull A", order: 2, description: "Back, biceps, rear delts",
          exercises: [
            { name: "Barbell Row", muscleGroup: "Back", sets: 4, minReps: 4, maxReps: 6, restSeconds: 180, order: 0 },
            { name: "Lat Pulldown", muscleGroup: "Back", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Cable Row", muscleGroup: "Back", sets: 3, minReps: 10, maxReps: 12, restSeconds: 90, order: 2 },
            { name: "Dumbbell Curl", muscleGroup: "Biceps", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Face Pull", muscleGroup: "Rear Delts", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 4 },
          ],
        },
        {
          name: "Legs A", order: 3, description: "Quads, hamstrings, calves",
          exercises: [
            { name: "Barbell Squat", muscleGroup: "Quads", sets: 4, minReps: 4, maxReps: 6, restSeconds: 180, order: 0 },
            { name: "Romanian Deadlift", muscleGroup: "Hamstrings", sets: 3, minReps: 8, maxReps: 12, restSeconds: 120, order: 1 },
            { name: "Leg Press", muscleGroup: "Quads", sets: 3, minReps: 10, maxReps: 15, restSeconds: 90, order: 2 },
            { name: "Leg Curl", muscleGroup: "Hamstrings", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Calf Raise", muscleGroup: "Calves", sets: 4, minReps: 12, maxReps: 20, restSeconds: 60, order: 4 },
          ],
        },
        {
          name: "Push B", order: 4, description: "Chest, shoulders, triceps",
          exercises: [
            { name: "Incline Barbell Press", muscleGroup: "Chest", sets: 4, minReps: 6, maxReps: 10, restSeconds: 120, order: 0 },
            { name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Cable Fly", muscleGroup: "Chest", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 2 },
            { name: "Lateral Raise", muscleGroup: "Shoulders", sets: 4, minReps: 12, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Skull Crusher", muscleGroup: "Triceps", sets: 3, minReps: 10, maxReps: 12, restSeconds: 60, order: 4 },
          ],
        },
        {
          name: "Pull B", order: 5, description: "Back, biceps, rear delts",
          exercises: [
            { name: "Weighted Pull-Up", muscleGroup: "Back", sets: 4, minReps: 4, maxReps: 8, restSeconds: 180, order: 0 },
            { name: "Single Arm Dumbbell Row", muscleGroup: "Back", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Cable Pullover", muscleGroup: "Back", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 2 },
            { name: "Hammer Curl", muscleGroup: "Biceps", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Reverse Fly", muscleGroup: "Rear Delts", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 4 },
          ],
        },
        {
          name: "Legs B", order: 6, description: "Quads, hamstrings, calves",
          exercises: [
            { name: "Barbell Deadlift", muscleGroup: "Hamstrings", sets: 4, minReps: 4, maxReps: 6, restSeconds: 180, order: 0 },
            { name: "Hack Squat", muscleGroup: "Quads", sets: 3, minReps: 8, maxReps: 12, restSeconds: 120, order: 1 },
            { name: "Walking Lunge", muscleGroup: "Quads", sets: 3, minReps: 10, maxReps: 12, restSeconds: 90, order: 2 },
            { name: "Seated Leg Curl", muscleGroup: "Hamstrings", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Standing Calf Raise", muscleGroup: "Calves", sets: 4, minReps: 15, maxReps: 20, restSeconds: 60, order: 4 },
          ],
        },
      ],
    });
  } catch (e) {
    console.error("seedProgram error:", e);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    await seedProgram(session.user.id);
    const programs = await Program.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(programs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await req.json();
    const program = await Program.create({ ...body, userId: session.user.id });
    return NextResponse.json(program, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

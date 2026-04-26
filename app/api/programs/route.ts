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
      { name: "Push A", order: 1, description: "Chest, shoulders, triceps" },
      { name: "Pull A", order: 2, description: "Back, biceps, rear delts" },
      { name: "Legs A", order: 3, description: "Quads, hamstrings, calves" },
      { name: "Push B", order: 4, description: "Chest, shoulders, triceps" },
      { name: "Pull B", order: 5, description: "Back, biceps, rear delts" },
      { name: "Legs B", order: 6, description: "Quads, hamstrings, calves" },
    ],
    });
  } catch (e) {
    console.error("seedProgram error:", e);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await seedProgram(session.user.id);
  const programs = await Program.find({ userId: session.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(programs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const program = await Program.create({ ...body, userId: session.user.id });
  return NextResponse.json(program, { status: 201 });
}

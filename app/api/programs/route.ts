import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized", session }, { status: 401 });

    await connectDB();

    const count = await Program.countDocuments({ userId: session.user.id });
    if (count === 0) {
      await Program.create({
        userId: session.user.id,
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
    }

    const programs = await Program.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(programs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    return NextResponse.json({ error: msg, stack }, { status: 500 });
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

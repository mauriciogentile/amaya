import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Workout from "@/lib/models/Workout";
import Program from "@/lib/models/Program";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  await connectDB();
  await Workout.deleteMany({ userId });
  await Program.deleteMany({ userId });
  await User.findByIdAndDelete(userId);

  return NextResponse.json({ ok: true });
}

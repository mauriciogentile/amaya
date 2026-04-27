import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id).select("firstName lastName email image weightKg heightCm unitSystem theme").lean();
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, weightKg, heightCm, unitSystem, theme } = body;

  await connectDB();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { firstName, lastName, weightKg, heightCm, unitSystem, theme },
    { new: true }
  ).select("firstName lastName email image weightKg heightCm unitSystem theme");

  return NextResponse.json(user);
}

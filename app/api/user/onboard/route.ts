import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerkUser = await currentUser();
  const body = await req.json();

  await connectDB();

  const weightKg = body.units === "imperial" && body.weightKg
    ? parseFloat(body.weightKg) * 0.453592
    : parseFloat(body.weightKg) || undefined;
  const heightCm = body.units === "imperial" && body.heightCm
    ? parseFloat(body.heightCm) * 2.54
    : parseFloat(body.heightCm) || undefined;

  await User.findOneAndUpdate(
    { clerkId: userId },
    {
      clerkId: userId,
      name: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() || "Athlete",
      email: clerkUser?.emailAddresses?.[0]?.emailAddress || "",
      avatar: clerkUser?.imageUrl,
      goal: body.goal || "general",
      units: body.units || "metric",
      age: parseInt(body.age) || undefined,
      weightKg,
      heightCm,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

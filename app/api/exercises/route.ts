import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const bodyPart = searchParams.get("bodyPart") || "";
  const equipment = searchParams.get("equipment") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 30;

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.name = { $regex: q, $options: "i" };
  }
  if (bodyPart) filter.bodyPart = bodyPart;
  if (equipment) filter.equipment = equipment;

  const [exercises, total] = await Promise.all([
    Exercise.find(filter).select("exId name bodyPart equipment target gifUrl imageUrl").skip((page - 1) * limit).limit(limit).lean(),
    Exercise.countDocuments(filter),
  ]);

  return NextResponse.json({ exercises, total, page, pages: Math.ceil(total / limit) });
}

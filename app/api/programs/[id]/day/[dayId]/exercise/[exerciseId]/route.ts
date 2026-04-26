import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/lib/models/Program";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string; dayId: string; exerciseId: string }> }
) {
  try {
    const { id, dayId, exerciseId } = await props.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    await connectDB();

    const update: Record<string, unknown> = {};
    const allowed = ["sets", "minReps", "maxReps", "restSeconds", "note"];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[`days.$[day].exercises.$[ex].${key}`] = body[key];
      }
    }

    const program = await Program.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: update },
      {
        arrayFilters: [{ "day._id": dayId }, { "ex._id": exerciseId }],
        new: true,
      }
    );

    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; dayId: string; exerciseId: string }> }
) {
  try {
    const { id, dayId, exerciseId } = await props.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const program = await Program.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $pull: { "days.$[day].exercises": { _id: exerciseId } } },
      { arrayFilters: [{ "day._id": dayId }], new: true }
    );

    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

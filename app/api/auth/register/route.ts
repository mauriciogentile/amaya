import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  await connectDB();
  const exists = await User.findOne({ email });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const hashed = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashed });
  return NextResponse.json({ ok: true });
}

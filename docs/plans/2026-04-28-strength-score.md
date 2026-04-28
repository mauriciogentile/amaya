# Strength Score Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Strength Score feature on the Progress page — an overall composite score plus per-muscle-group scores (Chest, Back, Legs, Shoulders), each with a historical line chart.

**Architecture:**
- Score is derived from estimated 1RM (Epley formula) of the best set per muscle group's key exercises in a given week.
- A `StrengthSnapshot` MongoDB model stores weekly snapshots per user.
- A PATCH/POST API endpoint computes and upserts snapshots after each workout finishes.
- The Progress page fetches snapshots and renders scores + Recharts line charts.

**Tech Stack:** Next.js 16 App Router, MongoDB/Mongoose, Recharts (already installed), Tailwind CSS, TypeScript.

**Muscle group → key exercises mapping** (from `lib/exercises-seed.ts`):
- **chest**: Barbell Bench Press, Dumbbell Bench Press, Push-Up
- **back**: Deadlift, Barbell Row, Pull-Up, Lat Pulldown
- **legs**: Squat, Leg Press, Romanian Deadlift
- **shoulders**: Overhead Press, Dumbbell Shoulder Press, Arnold Press

**Epley 1RM formula:** `weight × (1 + reps / 30)`

**Score normalization per muscle group:**
Use fixed beginner baselines (in kg) for a 75kg male. Score = `(estimated1RM / baseline) × 100`, capped at 200.
- chest baseline: 60kg
- back baseline: 80kg
- legs baseline: 80kg
- shoulders baseline: 40kg

**Overall score** = average of the 4 muscle group scores.

**Tier labels:**
- < 80: Beginner
- 80–120: Intermediate
- 120–160: Advanced
- > 160: Elite

---

## Task 1: Create StrengthSnapshot Mongoose model

**Objective:** Define the DB schema that stores weekly strength snapshots per user.

**Files:**
- Create: `lib/models/StrengthSnapshot.ts`

**Implementation:**

```ts
import mongoose, { Schema } from "mongoose";

const MuscleScoreSchema = new Schema({
  muscle: String,       // "chest" | "back" | "legs" | "shoulders"
  score: Number,        // normalized 0–200
  bestExercise: String, // exercise name that produced highest 1RM
  estimated1RM: Number, // in kg
}, { _id: false });

const StrengthSnapshotSchema = new Schema({
  userId:      { type: String, required: true, index: true },
  weekStart:   { type: Date, required: true },   // Monday 00:00 UTC of that week
  overallScore: Number,
  muscles:     [MuscleScoreSchema],
}, { timestamps: true });

StrengthSnapshotSchema.index({ userId: 1, weekStart: -1 });

export default mongoose.models.StrengthSnapshot
  || mongoose.model("StrengthSnapshot", StrengthSnapshotSchema);
```

**Commit:** `feat: add StrengthSnapshot model`

---

## Task 2: Create strength score computation utility

**Objective:** Pure function that takes an array of completed workouts and returns the score breakdown.

**Files:**
- Create: `lib/strength-score.ts`

**Implementation:**

```ts
// Key exercises per muscle group (lowercase, trimmed names for matching)
export const MUSCLE_EXERCISES: Record<string, string[]> = {
  chest:     ["barbell bench press", "dumbbell bench press", "push-up", "incline barbell bench press", "incline dumbbell press"],
  back:      ["deadlift", "barbell row", "pull-up", "lat pulldown", "dumbbell row", "cable row", "pendlay row"],
  legs:      ["barbell squat", "squat", "leg press", "romanian deadlift", "hack squat", "front squat"],
  shoulders: ["overhead press", "barbell overhead press", "dumbbell shoulder press", "arnold press", "seated dumbbell press", "military press"],
};

// Baselines in kg (normalized to 100 = solid beginner)
export const BASELINES: Record<string, number> = {
  chest: 60, back: 80, legs: 80, shoulders: 40,
};

export const TIER_LABELS = [
  { min: 160, label: "Elite" },
  { min: 120, label: "Advanced" },
  { min:  80, label: "Intermediate" },
  { min:   0, label: "Beginner" },
];

export function getTier(score: number) {
  return TIER_LABELS.find(t => score >= t.min)?.label ?? "Beginner";
}

/** Epley 1RM estimate */
export function epley(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

interface WorkoutSet { reps: number | null; weightKg: number | null; done?: boolean; }
interface WorkoutExercise { exerciseName: string; sets: WorkoutSet[]; }
interface Workout { exercises: WorkoutExercise[]; }

export interface MuscleScore {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
}

export interface StrengthScoreResult {
  overallScore: number;
  muscles: MuscleScore[];
}

export function computeStrengthScore(workouts: Workout[]): StrengthScoreResult {
  const best1RM: Record<string, { name: string; value: number }> = {};

  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      const name = ex.exerciseName.toLowerCase().trim();
      for (const [muscle, exercises] of Object.entries(MUSCLE_EXERCISES)) {
        if (!exercises.includes(name)) continue;
        for (const set of ex.sets) {
          if (!set.done || !set.weightKg || !set.reps) continue;
          const rm = epley(set.weightKg, set.reps);
          if (!best1RM[muscle] || rm > best1RM[muscle].value) {
            best1RM[muscle] = { name: ex.exerciseName, value: rm };
          }
        }
      }
    }
  }

  const muscles: MuscleScore[] = Object.keys(BASELINES).map(muscle => {
    const b = best1RM[muscle];
    const estimated1RM = b?.value ?? 0;
    const score = b ? Math.min(Math.round((estimated1RM / BASELINES[muscle]) * 100), 200) : 0;
    return { muscle, score, bestExercise: b?.name ?? "—", estimated1RM: Math.round(estimated1RM) };
  });

  const scored = muscles.filter(m => m.score > 0);
  const overallScore = scored.length
    ? Math.round(scored.reduce((a, m) => a + m.score, 0) / scored.length)
    : 0;

  return { overallScore, muscles };
}
```

**Commit:** `feat: add strength score computation utility`

---

## Task 3: Create API endpoint to compute and store strength snapshots

**Objective:** POST endpoint that takes the user's completed workouts for the current week, computes the score, and upserts a snapshot.

**Files:**
- Create: `app/api/strength/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import StrengthSnapshot from "@/lib/models/StrengthSnapshot";
import { computeStrengthScore } from "@/lib/strength-score";

export const dynamic = "force-dynamic";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// GET /api/strength — return last 12 weekly snapshots for charts
export async function GET(_: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const snapshots = await StrengthSnapshot
    .find({ userId: session.user.id })
    .sort({ weekStart: -1 })
    .limit(12)
    .lean();

  return NextResponse.json(snapshots.reverse()); // oldest first for charts
}

// POST /api/strength — compute + upsert snapshot for current week
export async function POST(_: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const workouts = await Workout.find({
    userId: session.user.id,
    isComplete: true,
    startedAt: { $gte: weekStart, $lt: weekEnd },
  }).lean();

  // Also include all-time best if this week has no data (cold start)
  const allWorkouts = workouts.length > 0 ? workouts : await Workout.find({
    userId: session.user.id,
    isComplete: true,
  }).sort({ startedAt: -1 }).limit(20).lean();

  const result = computeStrengthScore(allWorkouts as any);

  const snapshot = await StrengthSnapshot.findOneAndUpdate(
    { userId: session.user.id, weekStart },
    { $set: { ...result, userId: session.user.id, weekStart } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(snapshot);
}
```

**Commit:** `feat: add strength score API endpoint`

---

## Task 4: Trigger snapshot computation when a workout finishes

**Objective:** After `finish: true` is sent in the PATCH workout endpoint, fire a POST to `/api/strength` to update the snapshot.

**Files:**
- Modify: `app/api/workouts/[id]/route.ts`

In the PATCH handler, after saving the workout with `finish: true`, add:

```ts
if (finish) {
  // Trigger strength snapshot recompute (fire and forget)
  const origin = req.headers.get("origin") || "http://localhost:3000";
  fetch(`${origin}/api/strength`, {
    method: "POST",
    headers: { cookie: req.headers.get("cookie") || "" },
  }).catch(() => {});
}
```

Add this block right before the final `return NextResponse.json(workout)` in the PATCH handler.

**Commit:** `feat: recompute strength snapshot on workout finish`

---

## Task 5: Build the Progress page UI

**Objective:** Replace the "coming soon" stub with a full Progress page showing overall score, per-muscle scores, and a historical line chart.

**Files:**
- Rewrite: `app/(app)/progress/page.tsx`

**Full implementation:**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getTier, MUSCLE_EXERCISES } from "@/lib/strength-score";

interface MuscleScore {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
}

interface Snapshot {
  weekStart: string;
  overallScore: number;
  muscles: MuscleScore[];
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#34d399",
  back: "#60a5fa",
  legs: "#f472b6",
  shoulders: "#fbbf24",
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
};

const MUSCLE_ICONS: Record<string, string> = {
  chest: "🫁",
  back: "🔙",
  legs: "🦵",
  shoulders: "💪",
};

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const pct = Math.min(score / 200, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#34d399" strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/ 200</span>
        </div>
      </div>
      <span className="mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
        {tier}
      </span>
    </div>
  );
}

function MuscleCard({ muscle, score, bestExercise, estimated1RM, history }: {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
  history: { week: string; score: number }[];
}) {
  const color = MUSCLE_COLORS[muscle] ?? "#34d399";
  const tier = getTier(score);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{MUSCLE_ICONS[muscle]}</span>
          <div>
            <p className="font-semibold text-foreground text-sm">{MUSCLE_LABELS[muscle]}</p>
            <p className="text-xs text-muted-foreground">{bestExercise} · {estimated1RM}kg 1RM</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{score}</p>
          <p className="text-xs font-semibold" style={{ color }}>{tier}</p>
        </div>
      </div>

      {/* Mini bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(score / 200) * 100}%`, backgroundColor: color }} />
      </div>

      {/* Sparkline */}
      {history.length > 1 && (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={history} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#71717a" }} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
              labelFormatter={(l) => formatWeek(l)}
              formatter={(v: any) => [v, "Score"]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trigger a fresh compute, then fetch
    fetch("/api/strength", { method: "POST" })
      .then(() => fetch("/api/strength"))
      .then(r => r.json())
      .then(data => { setSnapshots(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const overallScore = latest?.overallScore ?? 0;
  const tier = getTier(overallScore);
  const delta = latest && prev ? overallScore - prev.overallScore : null;

  // Build chart data for overall score
  const overallHistory = snapshots.map(s => ({
    week: s.weekStart,
    score: s.overallScore,
  }));

  // Per-muscle history
  const muscleHistory = (muscle: string) => snapshots.map(s => ({
    week: s.weekStart,
    score: s.muscles.find(m => m.muscle === muscle)?.score ?? 0,
  }));

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Strength Score</h1>
        {delta !== null && (
          <span className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts
          </span>
        )}
      </div>

      {/* Overall score ring */}
      {latest ? (
        <div className="bg-card border border-border rounded-2xl">
          <ScoreRing score={overallScore} tier={tier} />

          {/* Overall chart */}
          {overallHistory.length > 1 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Last {overallHistory.length} weeks</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={overallHistory} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fontSize: 9, fill: "#71717a" }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#71717a" }} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(l) => formatWeek(l)}
                    formatter={(v: any) => [v, "Score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-4xl">🏋️</p>
          <p className="text-foreground font-semibold">No score yet</p>
          <p className="text-muted-foreground text-sm">Complete a workout with Bench Press, Squat, Deadlift or OHP to get your first score.</p>
        </div>
      )}

      {/* Per-muscle cards */}
      {latest && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">By Muscle Group</h2>
          {latest.muscles.map(m => (
            <MuscleCard
              key={m.muscle}
              {...m}
              history={muscleHistory(m.muscle)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Commit:** `feat: build Progress page with strength score and charts`

---

## Task 6: Deploy

```bash
cd ~/amaya
git add -A
git commit -m "feat: strength score — model, API, progress page with charts"
git push
~/.local/bin/vercel --token <TOKEN> --prod --yes
```

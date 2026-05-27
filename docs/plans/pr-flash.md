# PR Flash — Real-Time Personal Record Detection

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** When a user logs a set that beats their all-time best estimated 1RM for that exercise, trigger a "🏆 New PR!" celebration overlay with animation and haptic feedback.

**Architecture:**
1. New API endpoint `/api/workouts/prs` — returns all-time best estimated 1RM per exercise for the user (using epley formula, same as strength-score.ts).
2. Workout page fetches PRs on load alongside last-sets.
3. On set completion (`completeSet`), compare new set's epley() against fetched PR. If new PR → show overlay + haptics + update local PR state.

**Tech Stack:** Next.js App Router, TypeScript, MongoDB/Mongoose, Tailwind CSS, existing `epley()` from `lib/strength-score.ts`

---

### Task 1: Create `/api/workouts/prs` endpoint

**Objective:** Return all-time best estimated 1RM per exercise name for the authenticated user.

**Files:**
- Create: `app/api/workouts/prs/route.ts`

**Implementation:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import { epley } from "@/lib/strength-score";

export const dynamic = "force-dynamic";

// GET /api/workouts/prs?names=ExerciseA,ExerciseB&excludeId=<workoutId>
// Returns: { "ExerciseA": 120.5, "ExerciseB": 85.0 }  (estimated 1RM in kg)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const names = (searchParams.get("names") ?? "").split(",").map(n => n.trim()).filter(Boolean);
  const excludeId = searchParams.get("excludeId");

  if (!names.length) return NextResponse.json({});

  await connectDB();

  const query: Record<string, unknown> = {
    userId: session.user!.id,
    isComplete: true,
    "exercises.exerciseName": { $in: names },
  };
  if (excludeId) query._id = { $ne: excludeId };

  const workouts = await Workout.find(query).lean() as {
    exercises: { exerciseName: string; sets: { reps: number | null; weightKg: number | null }[] }[]
  }[];

  const best: Record<string, number> = {};

  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      if (!names.includes(ex.exerciseName)) continue;
      for (const set of ex.sets) {
        if (!set.weightKg || !set.reps) continue;
        const rm = epley(set.weightKg, set.reps);
        if (!best[ex.exerciseName] || rm > best[ex.exerciseName]) {
          best[ex.exerciseName] = rm;
        }
      }
    }
  }

  return NextResponse.json(best);
}
```

**Verify:** `curl http://localhost:3000/api/workouts/prs?names=Barbell+Bench+Press` should return `{}` or a number.

**Commit:** `feat: add /api/workouts/prs endpoint for all-time best 1RM per exercise`

---

### Task 2: Fetch PRs on workout page load

**Objective:** Alongside `lastSets`, fetch all-time PRs when the workout page loads.

**Files:**
- Modify: `app/(app)/workout/[id]/page.tsx`

**Changes:**

1. Add state near the top (after `lastSets` state):
```ts
const [allTimePRs, setAllTimePRs] = useState<Record<string, number>>({});
const [newPR, setNewPR] = useState<string | null>(null); // exercise name that just got a PR
```

2. In the `useEffect` that fetches `lastSets`, also fetch PRs (after names are computed):
```ts
// fetch PRs
const prRes = await fetch(`/api/workouts/prs?names=${encodeURIComponent(names.join(","))}&excludeId=${workoutId}`);
if (prRes.ok) {
  const prData = await prRes.json();
  setAllTimePRs(prData);
}
```

**Commit:** `feat: fetch all-time PRs on workout page load`

---

### Task 3: Detect PR on set completion

**Objective:** In `completeSet`, after marking a set done, check if the new 1RM beats `allTimePRs`. If so, trigger the celebration and update local PR state.

**Files:**
- Modify: `app/(app)/workout/[id]/page.tsx`

**Add import at top:**
```ts
import { epley } from "@/lib/strength-score";
```

**In `completeSet` function**, right after the `setExercises(...)` call that marks the set done (and before `startResting`), add:

```ts
// PR detection — only when completing (not un-completing) a set
if (!set.done && set.weightKg && set.reps) {
  const newRM = epley(set.weightKg, set.reps);
  const currentPR = allTimePRs[ex.exerciseName] ?? 0;
  if (newRM > currentPR) {
    setAllTimePRs(prev => ({ ...prev, [ex.exerciseName]: newRM }));
    setNewPR(ex.exerciseName);
    // Haptics
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 50, 200]);
    }
    setTimeout(() => setNewPR(null), 3000);
  }
}
```

**Commit:** `feat: detect PR on set completion and trigger celebration state`

---

### Task 4: PR celebration overlay UI

**Objective:** Show a full-screen flash overlay with "🏆 New PR!" when `newPR` is set.

**Files:**
- Modify: `app/(app)/workout/[id]/page.tsx`

**Add this JSX** at the very top of the returned JSX (before the `<div className="flex flex-col..."`):

```tsx
{/* PR Flash Overlay */}
{newPR && (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none animate-pr-flash">
    <div className="text-6xl mb-4">🏆</div>
    <div className="text-3xl font-bold text-primary">New PR!</div>
    <div className="text-sm text-muted-foreground mt-2">{newPR}</div>
  </div>
)}
```

**Add the animation** to `app/globals.css`:

```css
@keyframes pr-flash {
  0%   { opacity: 0; background: oklch(0.628 0.258 29.23 / 0.15); }
  15%  { opacity: 1; background: oklch(0.628 0.258 29.23 / 0.25); }
  70%  { opacity: 1; background: oklch(0.628 0.258 29.23 / 0.15); }
  100% { opacity: 0; background: transparent; }
}

.animate-pr-flash {
  animation: pr-flash 3s ease-out forwards;
}
```

**Commit:** `feat: PR flash overlay animation`

---

### Task 5: Show inline current PR next to exercise name

**Objective:** Below each exercise name, show "🏆 PR: X kg" so users know what they're chasing.

**Files:**
- Modify: `app/(app)/workout/[id]/page.tsx`

**Find** the exercise header section (near `ex.exerciseName` render) and add below the name:

```tsx
{allTimePRs[ex.exerciseName] != null && (
  <span className="text-xs text-muted-foreground">
    🏆 PR: {Math.round(allTimePRs[ex.exerciseName])} kg est. 1RM
  </span>
)}
```

**Commit:** `feat: show all-time PR inline next to exercise name during workout`

---

### Task 6: Deploy

```bash
cd /home/maclaurin/amaya
git push origin main
```

Verify on Vercel that the deployment succeeds and test on `amaya-fitness.vercel.app`.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Dumbbell, Flame, Trophy, TrendingUp, Clock, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import Exercise from "@/lib/models/Exercise";
import { EXERCISES } from "@/lib/exercises-seed";

export const dynamic = "force-dynamic";

async function getStats(userId: string) {
  try {
    await connectDB();
    const count = await Exercise.countDocuments();
    if (count === 0) await Exercise.insertMany(EXERCISES);

    const workouts = await Workout.find({ userId }).sort({ startedAt: -1 }).limit(5).lean();
    const totalWorkouts = await Workout.countDocuments({ userId });

    const recentWorkouts = workouts.map((w: any) => ({
      id: w._id.toString(),
      name: w.name || "Workout",
      date: w.startedAt,
      duration: w.duration || 0,
      totalSets: w.exercises?.reduce((acc: number, e: any) => acc + (e.sets?.length || 0), 0) || 0,
      totalVolume: w.exercises?.reduce((acc: number, e: any) =>
        acc + (e.sets?.reduce((s: number, set: any) => s + ((set.weight || 0) * (set.reps || 0)), 0) || 0), 0) || 0,
    }));

    return { totalWorkouts, recentWorkouts };
  } catch (e) {
    console.error("Dashboard getStats error:", e);
    return { totalWorkouts: 0, recentWorkouts: [] };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { totalWorkouts, recentWorkouts } = await getStats(session.user.id);
  const name = session.user.name?.split(" ")[0] || "Athlete";

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-4 pt-14 pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">Good work,</p>
            <h1 className="text-2xl font-bold">{name} 💪</h1>
          </div>
          <Link href="/dashboard/workout/new"
            className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <Plus className="w-5 h-5 text-black" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-zinc-900 border-zinc-800 rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              <p className="text-2xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-zinc-500">Total Workouts</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <Flame className="w-5 h-5 text-orange-400" />
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-zinc-500">Day Streak</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-zinc-500">PRs This Month</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 rounded-2xl">
            <CardContent className="p-4 space-y-1">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-zinc-500">Avg Volume</p>
            </CardContent>
          </Card>
        </div>

        {/* Start workout CTA */}
        <Link href="/dashboard/workout/new"
          className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-14 rounded-2xl transition-colors text-base">
          <Plus className="w-5 h-5" />
          Start Workout
        </Link>

        {/* Recent workouts */}
        {recentWorkouts.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-300">Recent Workouts</h2>
            {recentWorkouts.map(w => (
              <Card key={w.id} className="bg-zinc-900 border-zinc-800 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(w.date).toLocaleDateString()} · {w.totalSets} sets
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{w.totalVolume.toLocaleString()} kg</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />{Math.round(w.duration / 60)}m
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

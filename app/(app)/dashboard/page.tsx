import { currentUser } from "@clerk/nextjs/server";
import { Dumbbell, Flame, Trophy, TrendingUp, Clock, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = 'force-dynamic';
import { connectDB } from "@/lib/db";
import Workout from "@/lib/models/Workout";
import Exercise from "@/lib/models/Exercise";
import { EXERCISES } from "@/lib/exercises-seed";
import { auth } from "@clerk/nextjs/server";

async function getStats(userId: string) {
  await connectDB();

  // Auto-seed exercises if empty
  const count = await Exercise.countDocuments({ isCustom: false });
  if (count === 0) {
    await Exercise.insertMany(EXERCISES.map(e => ({ ...e, isCustom: false })));
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyWorkouts, recentWorkouts, allWorkouts] = await Promise.all([
    Workout.countDocuments({ userId, isComplete: true, finishedAt: { $gte: weekAgo } }),
    Workout.find({ userId, isComplete: true }).sort({ finishedAt: -1 }).limit(5),
    Workout.find({ userId, isComplete: true }).sort({ finishedAt: -1 }),
  ]);

  const totalVolume = allWorkouts.reduce((a, w) =>
    a + w.exercises.reduce((b: number, e: any) =>
      b + e.sets.reduce((c: number, s: any) => c + (s.weightKg||0)*(s.reps||0), 0), 0), 0);

  return { weeklyWorkouts, recentWorkouts, totalVolume: Math.round(totalVolume) };
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function DashboardPage() {
  const user = await currentUser();
  const { userId } = await auth();
  const firstName = user?.firstName || "Athlete";

  const { weeklyWorkouts, recentWorkouts, totalVolume } = await getStats(userId!);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "This Week",  value: String(weeklyWorkouts), unit: "workouts",  icon: Dumbbell,   color: "text-emerald-400" },
    { label: "Streak",     value: "0",                    unit: "days",       icon: Flame,      color: "text-orange-400"  },
    { label: "Total PRs",  value: "0",                    unit: "all time",   icon: Trophy,     color: "text-yellow-400"  },
    { label: "Volume",     value: totalVolume > 1000 ? `${(totalVolume/1000).toFixed(1)}t` : `${totalVolume}`, unit: "kg total", icon: TrendingUp, color: "text-blue-400" },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
      <div>
        <p className="text-zinc-500 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold">{firstName} 💪</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, unit, icon: Icon, color }) => (
          <Card key={label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 space-y-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-zinc-500">{unit}</p>
              <p className="text-xs text-zinc-600">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link href="/dashboard/workout/new"
        className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-14 rounded-2xl text-base transition-colors">
        <Plus className="w-5 h-5" />
        Start Workout
      </Link>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Workouts</h2>
        {recentWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-700 gap-2">
            <Dumbbell className="w-8 h-8" />
            <p className="text-sm">No workouts yet — start your first one!</p>
          </div>
        ) : recentWorkouts.map((w: any) => {
          const vol = w.exercises.reduce((a: number, e: any) =>
            a + e.sets.reduce((b: number, s: any) => b + (s.weightKg||0)*(s.reps||0), 0), 0);
          const sets = w.exercises.reduce((a: number, e: any) => a + e.sets.length, 0);
          return (
            <div key={w._id.toString()} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <p className="font-semibold">{w.name}</p>
                <span className="text-xs text-zinc-600">{timeAgo(w.finishedAt)}</span>
              </div>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.durationMin}min</span>
                <span>{sets} sets</span>
                <span>{Math.round(vol).toLocaleString()} kg</span>
              </div>
              <div className="text-xs text-zinc-600">
                {w.exercises.slice(0, 3).map((e: any) => e.exerciseName).join(", ")}
                {w.exercises.length > 3 && ` +${w.exercises.length - 3} more`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

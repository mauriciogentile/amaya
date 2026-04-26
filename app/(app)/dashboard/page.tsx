import { currentUser } from "@clerk/nextjs/server";
import { Dumbbell, Flame, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName || "Athlete";

  const stats = [
    { label: "This Week",  value: "0", unit: "workouts", icon: Dumbbell,  color: "text-emerald-400" },
    { label: "Streak",     value: "0", unit: "days",     icon: Flame,     color: "text-orange-400"  },
    { label: "Total PRs",  value: "0", unit: "all time", icon: Trophy,    color: "text-yellow-400"  },
    { label: "Volume",     value: "0", unit: "kg total", icon: TrendingUp, color: "text-blue-400"   },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">
      <div>
        <p className="text-zinc-500 text-sm">Good morning,</p>
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

      <Link
        href="/dashboard/workout/new"
        className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-14 rounded-2xl text-base transition-colors"
      >
        <Dumbbell className="w-5 h-5" />
        Start Workout
      </Link>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Workouts</h2>
        <div className="flex flex-col items-center justify-center py-10 text-zinc-600 gap-2">
          <Dumbbell className="w-8 h-8" />
          <p className="text-sm">No workouts yet — start your first one!</p>
        </div>
      </div>
    </div>
  );
}

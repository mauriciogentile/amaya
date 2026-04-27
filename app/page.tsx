import Link from "next/link";
import { Dumbbell, BarChart3, Calendar, BookOpen } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Dumbbell className="w-10 h-10 text-emerald-400" />
          <h1 className="text-4xl font-bold tracking-tight">Amaya</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-sm">
          Train smarter. Track everything.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {[
          { icon: Dumbbell,  label: "Workout Logging",    desc: "Sets, reps, weight, RPE" },
          { icon: BarChart3, label: "Progress Analytics", desc: "Charts, PRs, volume" },
          { icon: Calendar,  label: "Programs",           desc: "Templates & schedules" },
          { icon: BookOpen,  label: "Exercise Library",   desc: "500+ exercises" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <Icon className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Link href="/sign-up" className="flex items-center justify-center w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-12 rounded-2xl text-base transition-colors">
          Get Started — Free
        </Link>
        <Link href="/sign-in" className="flex items-center justify-center w-full border border-border text-foreground hover:bg-card h-12 rounded-2xl text-base transition-colors">
          Sign In
        </Link>
      </div>
    </main>
  );
}

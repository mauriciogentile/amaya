"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProgramDay {
  _id: string;
  name: string;
  description?: string;
  order: number;
}

interface Program {
  _id: string;
  name: string;
  description?: string;
  location: "gym" | "home" | "outdoor";
  days: ProgramDay[];
}

function ProgramCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="h-5 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-full" />
      <div className="flex gap-2">
        <div className="h-5 bg-muted rounded w-20" />
        <div className="h-5 bg-muted rounded w-16" />
      </div>
    </div>
  );
}

const locationLabel: Record<string, string> = { gym: "GYM 🏛️", home: "HOME 🏠", outdoor: "OUTDOOR 🌿" };
const locationColor: Record<string, string> = {
  gym: "bg-teal-900 text-teal-300 border-teal-800",
  home: "bg-purple-900 text-purple-300 border-purple-800",
  outdoor: "bg-green-900 text-green-300 border-green-800",
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((data) => { setPrograms(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4 space-y-4 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <button
          onClick={() => alert("Coming soon — program builder is in the works!")}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          <ProgramCardSkeleton />
          <ProgramCardSkeleton />
          <ProgramCardSkeleton />
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
            <Dumbbell size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No programs yet.<br />Tap <strong className="text-foreground">+</strong> to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <button
              key={program._id}
              onClick={() => router.push(`/programs/${program._id}`)}
              className="w-full text-left rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors min-h-[52px]"
            >
              <div className="flex-1 space-y-2 min-w-0">
                <p className="font-semibold text-foreground truncate">{program.name}</p>
                {program.description && (
                  <p className="text-muted-foreground text-xs line-clamp-2">{program.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-900 text-orange-300 border-orange-800 text-xs font-bold uppercase tracking-wide">
                    {program.days.length} {program.days.length === 1 ? "DAY" : "DAYS"}
                  </Badge>
                  <Badge className={`text-xs font-bold uppercase tracking-wide border ${locationColor[program.location]}`}>
                    {locationLabel[program.location]}
                  </Badge>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground mt-1 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

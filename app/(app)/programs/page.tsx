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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3 animate-pulse">
      <div className="h-5 bg-zinc-800 rounded w-2/3" />
      <div className="h-3 bg-zinc-800 rounded w-full" />
      <div className="flex gap-2">
        <div className="h-5 bg-zinc-800 rounded w-20" />
        <div className="h-5 bg-zinc-800 rounded w-16" />
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
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Plans</h1>
        <button
          onClick={() => alert("Coming soon — program builder is in the works!")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
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
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
            <Dumbbell size={28} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-sm">No programs yet.<br />Tap <strong className="text-white">+</strong> to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <button
              key={program._id}
              onClick={() => router.push(`/programs/${program._id}`)}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-start gap-3 hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex-1 space-y-2 min-w-0">
                <p className="font-semibold text-white truncate">{program.name}</p>
                {program.description && (
                  <p className="text-zinc-400 text-xs line-clamp-2">{program.description}</p>
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
              <ChevronRight size={18} className="text-zinc-600 mt-1 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

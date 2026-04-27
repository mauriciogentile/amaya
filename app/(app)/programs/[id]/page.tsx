"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProgramDay {
  _id: string;
  name: string;
  description?: string;
  order: number;
  exercises: { _id: string }[];
}

interface Program {
  _id: string;
  name: string;
  description?: string;
  location: "gym" | "home" | "outdoor";
  days: ProgramDay[];
}

const locationLabel: Record<string, string> = { gym: "GYM 🏛️", home: "HOME 🏠", outdoor: "OUTDOOR 🌿" };
const locationColor: Record<string, string> = {
  gym: "bg-teal-900 text-teal-300 border-teal-800",
  home: "bg-purple-900 text-purple-300 border-purple-800",
  outdoor: "bg-green-900 text-green-300 border-green-800",
};

export default function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [programId, setProgramId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    Promise.resolve(params).then(({ id }) => setProgramId(id));
  }, [params]);

  useEffect(() => {
    if (!programId) return;
    fetch(`/api/programs/${programId}`)
      .then((r) => r.json())
      .then((data) => { setProgram(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [programId]);

  if (loading) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-3/4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-card border border-border rounded-xl" />
        ))}
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center text-muted-foreground">
        Program not found.
      </div>
    );
  }

  const sortedDays = [...program.days].sort((a, b) => a.order - b.order);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-foreground leading-tight">{program.name}</h1>
      </div>

      {program.description && (
        <p className="text-muted-foreground text-sm">{program.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge className="bg-orange-900 text-orange-300 border-orange-800 text-xs font-bold uppercase tracking-wide">
          {program.days.length} {program.days.length === 1 ? "DAY" : "DAYS"}
        </Badge>
        <Badge className={`text-xs font-bold uppercase tracking-wide border ${locationColor[program.location]}`}>
          {locationLabel[program.location]}
        </Badge>
      </div>

      {/* Days list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Workout Days</h2>
        {sortedDays.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Dumbbell size={28} />
            <p className="text-sm">No days added yet.</p>
          </div>
        ) : (
          sortedDays.map((day, idx) => (
            <button
              key={day._id}
              onClick={() => router.push(`/programs/${programId}/day/${day._id}`)}
              className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{day.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {day.description && <span className="truncate">{day.description}</span>}
                  {day.exercises?.length > 0 && (
                    <span className="text-muted-foreground/70"> · {day.exercises.length} exercises</span>
                  )}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

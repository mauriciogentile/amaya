"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Exercise {
  _id: string;
  name: string;
  muscleGroup?: string;
}

interface ProgramDay {
  _id: string;
  name: string;
  description?: string;
  order: number;
  exerciseIds: Exercise[];
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
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);
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
        <div className="h-6 bg-zinc-800 rounded w-1/2" />
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!program) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center text-zinc-400">
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
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white leading-tight">{program.name}</h1>
      </div>

      {/* Description + badges */}
      {program.description && (
        <p className="text-zinc-400 text-sm">{program.description}</p>
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
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Workout Days</h2>
        {sortedDays.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No days added yet.</p>
        ) : (
          sortedDays.map((day, idx) => (
            <button
              key={day._id}
              onClick={() => setSelectedDay(day)}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{day.name}</p>
                {day.description && (
                  <p className="text-zinc-500 text-xs truncate">{day.description}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-zinc-600 shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedDay?.name}</DialogTitle>
          </DialogHeader>
          {selectedDay?.description && (
            <p className="text-zinc-400 text-sm -mt-2">{selectedDay.description}</p>
          )}
          <div className="space-y-2 mt-2">
            {!selectedDay?.exerciseIds?.length ? (
              <div className="flex flex-col items-center py-6 gap-2 text-zinc-500">
                <Dumbbell size={24} />
                <p className="text-sm">No exercises added yet.</p>
              </div>
            ) : (
              selectedDay.exerciseIds.map((ex) => (
                <div key={ex._id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-sm text-white">{ex.name}</span>
                  {ex.muscleGroup && (
                    <span className="text-xs text-zinc-500 ml-auto">{ex.muscleGroup}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

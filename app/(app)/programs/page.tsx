"use client";

import { useEffect, useRef, useState } from "react";
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

function NewPlanSheet({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("My gym plan");
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("My gym plan");
      setDays(3);
      setError("");
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [open]);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const defaultDays3 = [
        {
          name: "Day 1", order: 1,
          description: "Chest & Biceps",
          exercises: [
            { name: "Flat Barbell Bench Press", muscleGroup: "Chest", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 0 },
            { name: "Incline Dumbbell Press", muscleGroup: "Chest", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Cable Chest Flyes", muscleGroup: "Chest", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 2 },
            { name: "Standing Barbell Curls", muscleGroup: "Biceps", sets: 3, minReps: 8, maxReps: 12, restSeconds: 60, order: 3 },
            { name: "Dumbbell Hammer Curls", muscleGroup: "Biceps", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 4 },
            { name: "Concentration Curls", muscleGroup: "Biceps", sets: 2, minReps: 12, maxReps: 15, restSeconds: 60, order: 5 },
          ],
        },
        {
          name: "Day 2", order: 2,
          description: "Back & Triceps",
          exercises: [
            { name: "Lat Pulldowns", muscleGroup: "Back", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 0 },
            { name: "Seated Cable Rows", muscleGroup: "Back", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 1 },
            { name: "Single-Arm Dumbbell Rows", muscleGroup: "Back", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 2 },
            { name: "Tricep Rope Pushdowns", muscleGroup: "Triceps", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 3 },
            { name: "Overhead Dumbbell Extensions", muscleGroup: "Triceps", sets: 3, minReps: 10, maxReps: 12, restSeconds: 60, order: 4 },
            { name: "Bench Dips", muscleGroup: "Triceps", sets: 2, minReps: 12, maxReps: 15, restSeconds: 60, order: 5 },
          ],
        },
        {
          name: "Day 3", order: 3,
          description: "Legs & Shoulders",
          exercises: [
            { name: "Barbell Squats", muscleGroup: "Legs", sets: 3, minReps: 6, maxReps: 10, restSeconds: 120, order: 0 },
            { name: "Leg Extensions", muscleGroup: "Legs", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 1 },
            { name: "Lying Leg Curls", muscleGroup: "Legs", sets: 3, minReps: 10, maxReps: 15, restSeconds: 60, order: 2 },
            { name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, order: 3 },
            { name: "Dumbbell Lateral Raises", muscleGroup: "Shoulders", sets: 3, minReps: 12, maxReps: 15, restSeconds: 60, order: 4 },
            { name: "Face Pulls", muscleGroup: "Shoulders", sets: 2, minReps: 15, maxReps: 20, restSeconds: 60, order: 5 },
          ],
        },
      ];

      const daysArray = days === 3
        ? defaultDays3
        : Array.from({ length: days }, (_, i) => ({
            name: `Day ${i + 1}`,
            order: i + 1,
            exercises: [],
          }));
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), location: "gym", days: daysArray }),
      });
      if (!res.ok) throw new Error("Failed to create plan");
      const program = await res.json();
      onCreated(program._id);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl p-6 pb-28 space-y-5 shadow-2xl border-t border-border transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
        <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
        <h2 className="text-lg font-bold text-foreground">New Plan</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Plan name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Push Pull Legs"
            className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Number of days</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`flex-1 h-10 rounded-xl text-sm font-bold transition-colors ${
                  days === n
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Creating…" : "Create Plan"}
        </button>
      </div>
    </>
  );
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((data) => { setPrograms(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Plans</h1>
          <button
            onClick={() => setShowSheet(true)}
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
      <NewPlanSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onCreated={(id) => { setShowSheet(false); router.push(`/programs/${id}`); }}
      />
    </>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell, Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";

interface WorkoutSummary {
  _id: string;
  name: string;
  startedAt: string;
  durationMin?: number;
  exerciseCount: number;
}

type CalendarData = Record<string, WorkoutSummary[]>;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function WorkoutCard({
  w,
  onDeleted,
}: {
  w: WorkoutSummary;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleDelete() {
    if (!confirm(`Delete "${w.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/workouts/${w._id}`, { method: "DELETE" });
    onDeleted(w._id);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <Dumbbell size={16} className="text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{w.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {w.exerciseCount} exercise{w.exerciseCount !== 1 ? "s" : ""}
          </span>
          {w.durationMin && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={11} />
              {w.durationMin}m
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(w.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Three-dot menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <MoreVertical size={16} className="text-muted-foreground" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <button
              onClick={() => { setMenuOpen(false); router.push(`/workout/${w._id}?mode=edit`); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Pencil size={14} className="text-muted-foreground" />
              Edit / View
            </button>
            <button
              onClick={() => { setMenuOpen(false); handleDelete(); }}
              disabled={deleting}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? "Deleting…" : "Delete workout"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkoutCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [data, setData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setSelectedDay(null);
    const res = await fetch(`/api/workouts/calendar?year=${y}&month=${m}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonth(year, month);
  }, [year, month, fetchMonth]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function handleDeleted(id: string) {
    setData(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter(w => w._id !== id);
        if (next[key].length === 0) delete next[key];
      }
      return next;
    });
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = toKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedWorkouts = selectedDay ? (data[selectedDay] || []) : [];

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-foreground mb-4">Activity</h2>

      <div className="rounded-2xl border border-border bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = toKey(year, month, day);
              const hasWorkout = !!data[key]?.length;
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;

              return (
                <button
                  key={key}
                  onClick={() => hasWorkout ? setSelectedDay(isSelected ? null : key) : undefined}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all text-sm font-medium mx-0.5 ${
                    isSelected
                      ? "bg-emerald-500 text-black"
                      : isToday
                      ? "bg-muted text-foreground"
                      : hasWorkout
                      ? "text-foreground hover:bg-muted/60 cursor-pointer"
                      : "text-muted-foreground cursor-default"
                  }`}
                >
                  {day}
                  {hasWorkout && (
                    <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-black/60" : "bg-emerald-500"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Workout list for selected day */}
      {selectedDay && selectedWorkouts.length > 0 && (
        <div className="mt-3 space-y-2">
          {selectedWorkouts.map(w => (
            <WorkoutCard key={w._id} w={w} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

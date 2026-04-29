"use client";

import { useEffect, useState } from "react";
import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getTier } from "@/lib/strength-score";

interface MuscleScore {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
}

interface Snapshot {
  weekStart: string;
  overallScore: number;
  muscles: MuscleScore[];
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#34d399",
  back: "#60a5fa",
  legs: "#f472b6",
  shoulders: "#fbbf24",
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
};

const MUSCLE_ICONS: Record<string, string> = {
  chest: "🫁",
  back: "🔙",
  legs: "🦵",
  shoulders: "💪",
};

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const pct = Math.min(score / 200, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#27272a" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#34d399" strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/ 200</span>
        </div>
      </div>
      <span className="mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
        {tier}
      </span>
    </div>
  );
}

function MuscleCard({ muscle, score, bestExercise, estimated1RM, history, unitSystem }: {
  muscle: string;
  score: number;
  bestExercise: string;
  estimated1RM: number;
  history: { week: string; score: number }[];
  unitSystem: "metric" | "imperial";
}) {
  const color = MUSCLE_COLORS[muscle] ?? "#34d399";
  const display1RM = unitSystem === "imperial" ? Math.round(estimated1RM * 2.205) : estimated1RM;
  const unit = unitSystem === "imperial" ? "lbs" : "kg";
  const tier = getTier(score);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold text-foreground text-sm">{MUSCLE_LABELS[muscle]}</p>
            <p className="text-xs text-muted-foreground">{bestExercise} · {display1RM}{unit} 1RM est.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{score}</p>
          <p className="text-xs font-semibold" style={{ color }}>{tier}</p>
        </div>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(score / 200) * 100}%`, backgroundColor: color }} />
      </div>

      {history.length > 1 && (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={history} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#71717a" }} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
              labelFormatter={(l: unknown) => formatWeek(String(l))}
              formatter={(v: unknown) => [v as React.ReactNode, "Score"] as [React.ReactNode, string]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(p => {
      if (p.unitSystem) setUnitSystem(p.unitSystem);
    }).catch(() => {});

    fetch("/api/strength", { method: "POST" })
      .then(() => fetch("/api/strength"))
      .then(r => r.json())
      .then(data => { setSnapshots(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const overallScore = latest?.overallScore ?? 0;
  const tier = getTier(overallScore);
  const delta = latest && prev ? overallScore - prev.overallScore : null;

  const overallHistory = snapshots.map(s => ({ week: s.weekStart, score: s.overallScore }));
  const muscleHistory = (muscle: string) =>
    snapshots.map(s => ({ week: s.weekStart, score: s.muscles.find(m => m.muscle === muscle)?.score ?? 0 }));

  return (
    <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Strength Score</h1>
        {delta !== null && (
          <span className={`text-sm font-semibold ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts
          </span>
        )}
      </div>

      {latest ? (
        <div className="bg-card border border-border rounded-2xl">
          <ScoreRing score={overallScore} tier={tier} />
          {overallHistory.length > 1 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Last {overallHistory.length} weeks</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={overallHistory} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="week" tickFormatter={formatWeek} tick={{ fontSize: 9, fill: "#71717a" }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#71717a" }} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(l: unknown) => formatWeek(String(l))}
                    formatter={(v: unknown) => [v as React.ReactNode, "Score"] as [React.ReactNode, string]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-foreground font-semibold">No score yet</p>
          <p className="text-muted-foreground text-sm">Complete a workout with Bench Press, Squat, Deadlift or OHP to get your first score.</p>
        </div>
      )}

      {latest && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">By Muscle Group</h2>
          {latest.muscles.map(m => (
            <MuscleCard
              key={m.muscle}
              {...m}
              history={muscleHistory(m.muscle)}
              unitSystem={unitSystem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

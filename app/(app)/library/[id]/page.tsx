"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";

interface Exercise {
  _id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string;
  instructionSteps: string[];
  gifUrl: string;
  imageUrl: string;
}

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [gifLoaded, setGifLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.resolve(params).then(async ({ id }) => {
      try {
        const res = await fetch(`/api/exercises/${id}`);
        const data = await res.json();
        setExercise(data);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background animate-pulse">
        <div className="h-64 bg-card" />
        <div className="px-4 pt-4 space-y-3">
          <div className="h-6 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return <div className="px-4 pt-10 text-muted-foreground text-center">Exercise not found.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* GIF Hero */}
      <div className="relative bg-card overflow-hidden" style={{ minHeight: 260 }}>
        <button
          onClick={() => router.back()}
          className="absolute top-10 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-background/50 text-foreground backdrop-blur"
        >
          <ArrowLeft size={18} />
        </button>

        {exercise.gifUrl ? (
          <>
            {!gifLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exercise.gifUrl}
              alt={exercise.name}
              onLoad={() => setGifLoaded(true)}
              className={`w-full object-contain transition-opacity ${gifLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ maxHeight: 320 }}
            />
          </>
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-muted-foreground">
            <Dumbbell size={48} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-28 max-w-lg mx-auto w-full space-y-5">
        {/* Title + tags */}
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{exercise.name}</h1>
          <div className="flex gap-2 flex-wrap mt-2">
            {exercise.bodyPart && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold uppercase">
                {exercise.bodyPart}
              </span>
            )}
            {exercise.target && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold uppercase">
                {exercise.target}
              </span>
            )}
            {exercise.equipment && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-semibold uppercase">
                {exercise.equipment}
              </span>
            )}
          </div>
        </div>

        {/* Secondary muscles */}
        {exercise.secondaryMuscles?.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Secondary Muscles</p>
            <div className="flex gap-2 flex-wrap">
              {exercise.secondaryMuscles.map(m => (
                <span key={m} className="text-xs px-2 py-1 rounded-full bg-muted text-foreground">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {(exercise.instructionSteps?.length > 0 || exercise.instructions) && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">How to do it</p>
            {exercise.instructionSteps?.length > 0 ? (
              <ol className="space-y-3">
                {exercise.instructionSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{exercise.instructions}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
      <div className="flex flex-col h-screen bg-zinc-950 animate-pulse">
        <div className="h-64 bg-zinc-900" />
        <div className="px-4 pt-4 space-y-3">
          <div className="h-6 bg-zinc-800 rounded w-2/3" />
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-4 bg-zinc-800 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return <div className="px-4 pt-10 text-zinc-400 text-center">Exercise not found.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* GIF Hero */}
      <div className="relative bg-zinc-900 overflow-hidden" style={{ minHeight: 260 }}>
        <button
          onClick={() => router.back()}
          className="absolute top-10 left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
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
          <div className="w-full h-64 flex items-center justify-center text-zinc-700">
            <Dumbbell size={48} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-28 max-w-lg mx-auto w-full space-y-5">
        {/* Title + tags */}
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">{exercise.name}</h1>
          <div className="flex gap-2 flex-wrap mt-2">
            {exercise.bodyPart && (
              <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-semibold uppercase">
                {exercise.bodyPart}
              </span>
            )}
            {exercise.target && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-semibold uppercase">
                {exercise.target}
              </span>
            )}
            {exercise.equipment && (
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 font-semibold uppercase">
                {exercise.equipment}
              </span>
            )}
          </div>
        </div>

        {/* Secondary muscles */}
        {exercise.secondaryMuscles?.length > 0 && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">Secondary Muscles</p>
            <div className="flex gap-2 flex-wrap">
              {exercise.secondaryMuscles.map(m => (
                <span key={m} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {(exercise.instructionSteps?.length > 0 || exercise.instructions) && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">How to do it</p>
            {exercise.instructionSteps?.length > 0 ? (
              <ol className="space-y-3">
                {exercise.instructionSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm text-zinc-300 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed">{exercise.instructions}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

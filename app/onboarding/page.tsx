'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";

const GOALS = [
  { value: "strength",     label: "💪 Build Strength",   desc: "Lift heavier over time" },
  { value: "hypertrophy",  label: "🏋️ Build Muscle",     desc: "Maximize muscle growth" },
  { value: "endurance",    label: "🏃 Build Endurance",  desc: "Train longer, harder" },
  { value: "weight_loss",  label: "🔥 Lose Weight",      desc: "Burn fat, stay fit" },
  { value: "general",      label: "⚡ Stay Fit",          desc: "General fitness & health" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ goal: "", units: "metric", weightKg: "", heightCm: "", age: "" });
  const [loading, setLoading] = useState(false);

  async function finish() {
    setLoading(true);
    await fetch("/api/user/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col px-6 pt-12 pb-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Dumbbell className="w-6 h-6 text-emerald-400" />
        <span className="text-lg font-bold">Amaya</span>
        <span className="ml-auto text-sm text-zinc-500">{step}/2</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1 mb-8">
        <div className="bg-emerald-400 h-1 rounded-full transition-all" style={{ width: `${(step/2)*100}%` }} />
      </div>

      {step === 1 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">What's your main goal?</h1>
            <p className="text-zinc-500 text-sm mt-1">We'll tailor your experience around it.</p>
          </div>
          <div className="space-y-3">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setData(d => ({ ...d, goal: g.value }))}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  data.goal === g.value
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}>
                <p className="font-semibold">{g.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
          <button disabled={!data.goal} onClick={() => setStep(2)}
            className="w-full bg-emerald-500 disabled:opacity-40 text-black font-bold h-12 rounded-2xl transition-colors mt-4">
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">A few quick stats</h1>
            <p className="text-zinc-500 text-sm mt-1">Optional — you can skip any field.</p>
          </div>

          <div className="space-y-4">
            {/* Units toggle */}
            <div className="flex rounded-xl overflow-hidden border border-zinc-800">
              {["metric","imperial"].map(u => (
                <button key={u} onClick={() => setData(d => ({...d, units: u}))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    data.units === u ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-400"
                  }`}>
                  {u === "metric" ? "Metric (kg/cm)" : "Imperial (lbs/in)"}
                </button>
              ))}
            </div>

            {[
              { key: "age",      label: "Age",    placeholder: "e.g. 28",  type: "number" },
              { key: "weightKg", label: data.units === "metric" ? "Weight (kg)" : "Weight (lbs)", placeholder: data.units === "metric" ? "e.g. 80" : "e.g. 176", type: "number" },
              { key: "heightCm", label: data.units === "metric" ? "Height (cm)" : "Height (in)",  placeholder: data.units === "metric" ? "e.g. 178" : "e.g. 70",  type: "number" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-sm text-zinc-400 mb-1 block">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(data as any)[key]}
                  onChange={e => setData(d => ({...d, [key]: e.target.value}))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
            ))}
          </div>

          <button onClick={finish} disabled={loading}
            className="w-full bg-emerald-500 disabled:opacity-60 text-black font-bold h-12 rounded-2xl transition-colors">
            {loading ? "Setting up…" : "Let's go 🚀"}
          </button>
        </div>
      )}
    </div>
  );
}

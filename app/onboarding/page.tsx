'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";

const GOALS = [
  { value: "strength",    label: "💪 Build Strength",  desc: "Lift heavier over time" },
  { value: "hypertrophy", label: "🏋️ Build Muscle",    desc: "Maximize muscle growth" },
  { value: "endurance",   label: "🏃 Build Endurance", desc: "Train longer, harder" },
  { value: "weight_loss", label: "🔥 Lose Weight",     desc: "Burn fat, stay fit" },
  { value: "general",     label: "⚡ Stay Fit",         desc: "General fitness & health" },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    firstName: "", lastName: "",
    goal: "", units: "metric", weightKg: "", heightCm: "", age: "",
  });
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
    <div className="min-h-screen bg-background text-foreground flex flex-col px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Dumbbell className="w-6 h-6 text-emerald-400" />
        <span className="text-lg font-bold">Amaya</span>
        <span className="ml-auto text-sm text-muted-foreground">{step}/{TOTAL_STEPS}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1 mb-8">
        <div className="bg-emerald-400 h-1 rounded-full transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      {/* Step 1 — Name */}
      {step === 1 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">What's your name?</h1>
            <p className="text-muted-foreground text-sm mt-1">Let's make this personal.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">First Name</label>
              <input
                autoFocus
                type="text"
                placeholder="John"
                value={data.firstName}
                onChange={e => setData(d => ({ ...d, firstName: e.target.value }))}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-400"
             />
           </div>
           <div>
              <label className="text-sm text-muted-foreground mb-1 block">Last Name</label>
             <input
               type="text"
               placeholder="Smith"
               value={data.lastName}
               onChange={e => setData(d => ({ ...d, lastName: e.target.value }))}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <button
            disabled={!data.firstName.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-emerald-500 disabled:opacity-40 text-black font-bold h-12 rounded-2xl transition-colors mt-4"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2 — Goal */}
      {step === 2 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">What's your main goal?</h1>
            <p className="text-muted-foreground text-sm mt-1">We'll tailor your experience around it.</p>
          </div>
          <div className="space-y-3">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setData(d => ({ ...d, goal: g.value }))}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  data.goal === g.value
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-border bg-card"
                }`}>
                <p className="font-semibold">{g.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="px-5 h-12 rounded-2xl border border-border text-muted-foreground font-semibold">
             Back
           </button>
           <button disabled={!data.goal} onClick={() => setStep(3)}
              className="flex-1 bg-emerald-500 disabled:opacity-40 text-black font-bold h-12 rounded-2xl transition-colors">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Stats */}
      {step === 3 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">A few quick stats</h1>
            <p className="text-muted-foreground text-sm mt-1">Optional — you can skip any field.</p>
          </div>

          <div className="space-y-4">
            {/* Units toggle */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              {["metric", "imperial"].map(u => (
                <button key={u} onClick={() => setData(d => ({ ...d, units: u }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    data.units === u ? "bg-emerald-500 text-black" : "bg-card text-muted-foreground"
                  }`}>
                  {u === "metric" ? "Metric (kg/cm)" : "Imperial (lbs/in)"}
                </button>
              ))}
            </div>

            {[
              { key: "age",      label: "Age",    placeholder: "e.g. 28" },
              { key: "weightKg", label: data.units === "metric" ? "Weight (kg)" : "Weight (lbs)", placeholder: data.units === "metric" ? "e.g. 80" : "e.g. 176" },
              { key: "heightCm", label: data.units === "metric" ? "Height (cm)" : "Height (in)",  placeholder: data.units === "metric" ? "e.g. 178" : "e.g. 70" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
                <input
                  type="number"
                  placeholder={placeholder}
                  value={(data as any)[key]}
                  onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-400"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="px-5 h-12 rounded-2xl border border-border text-muted-foreground font-semibold">
             Back
           </button>
           <button onClick={finish} disabled={loading}
              className="flex-1 bg-emerald-500 disabled:opacity-60 text-black font-bold h-12 rounded-2xl transition-colors">
              {loading ? "Setting up…" : "Let's go 🚀"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

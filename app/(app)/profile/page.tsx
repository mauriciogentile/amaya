"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Check, LogOut, Sun, Moon } from "lucide-react";

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
  weightKg?: number;
  heightCm?: number;
  unitSystem?: "metric" | "imperial";
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <img src={image} alt={name} className="w-20 h-20 rounded-full object-cover" />;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold text-white">
      {initials || "?"}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
      />
    </div>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      setProfile(data);
      setDraft({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        weightKg: data.weightKg,
        heightCm: data.heightCm,
      });
      setUnitSystem(data.unitSystem || "metric");
    });
  }, []);

  const displayWeight = () => {
    if (!draft.weightKg) return "";
    if (unitSystem === "imperial") return String(Math.round(draft.weightKg * 2.20462));
    return String(draft.weightKg);
  };

  const displayHeight = () => {
    if (!draft.heightCm) return "";
    if (unitSystem === "imperial") {
      const totalInches = draft.heightCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round(totalInches % 12);
      return `${ft}'${inch}"`;
    }
    return String(draft.heightCm);
  };

  const handleWeightChange = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) { setDraft(d => ({ ...d, weightKg: undefined })); return; }
    setDraft(d => ({ ...d, weightKg: unitSystem === "imperial" ? Math.round(num / 2.20462) : num }));
  };

  const handleHeightChange = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) { setDraft(d => ({ ...d, heightCm: undefined })); return; }
    setDraft(d => ({ ...d, heightCm: unitSystem === "imperial" ? Math.round(num * 2.54) : num }));
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, unitSystem }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fullName = `${draft.firstName || ""} ${draft.lastName || ""}`.trim() || session?.user?.name || "";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <div className="px-4 pt-10 pb-28 max-w-lg mx-auto w-full space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4">
          <Avatar name={fullName} image={profile?.image} />
          <div className="text-center">
            <p className="text-lg font-bold text-white">{fullName || "Your Name"}</p>
            <p className="text-sm text-zinc-500">{profile?.email}</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Appearance</p>
            <button
              onClick={() => mounted && setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Personal Info</p>
          <Field
            label="First Name"
            value={draft.firstName || ""}
            onChange={v => setDraft(d => ({ ...d, firstName: v }))}
            placeholder="John"
          />
          <Field
            label="Last Name"
            value={draft.lastName || ""}
            onChange={v => setDraft(d => ({ ...d, lastName: v }))}
            placeholder="Smith"
          />
        </div>

        {/* Units toggle */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Units</p>
            <div className="flex rounded-lg overflow-hidden border border-zinc-800">
              {(["metric", "imperial"] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setUnitSystem(u)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                    unitSystem === u ? "bg-orange-500 text-white" : "text-zinc-500"
                  }`}
                >
                  {u === "metric" ? "kg / cm" : "lbs / ft"}
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              Weight ({unitSystem === "metric" ? "kg" : "lbs"})
            </label>
            <input
              type="number"
              value={displayWeight()}
              onChange={e => handleWeightChange(e.target.value)}
              placeholder={unitSystem === "metric" ? "75" : "165"}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Height */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              Height ({unitSystem === "metric" ? "cm" : "inches"})
            </label>
            <input
              type="number"
              value={unitSystem === "imperial" && draft.heightCm
                ? String(Math.round(draft.heightCm / 2.54))
                : (draft.heightCm ? String(draft.heightCm) : "")}
              onChange={e => handleHeightChange(e.target.value)}
              placeholder={unitSystem === "metric" ? "175" : "69"}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            saved ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-400 text-white"
          }`}
        >
          {saved ? <><Check size={16} /> Saved!</> : saving ? "Saving..." : "Save Changes"}
        </button>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-red-400 border border-red-900/50 hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

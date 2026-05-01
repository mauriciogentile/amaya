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
  theme?: "light" | "dark";
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <img src={image} alt={name} className="w-20 h-20 rounded-full object-cover" />;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-2xl font-bold text-black">
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
      <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-muted-foreground"
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
      if (data.theme) setTheme(data.theme);
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
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-8 max-w-lg mx-auto w-full space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4">
          <Avatar name={fullName} image={profile?.image} />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{fullName || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Appearance</p>
            <button
              onClick={async () => {
                if (!mounted) return;
                const next = resolvedTheme === "dark" ? "light" : "dark";
                setTheme(next);
                await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
              }}
              className="w-11 h-11 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Personal Info</p>
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Units</p>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["metric", "imperial"] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setUnitSystem(u)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                    unitSystem === u ? "bg-emerald-500 text-black" : "text-muted-foreground"
                  }`}
                >
                  {u === "metric" ? "kg / cm" : "lbs / ft"}
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              Weight ({unitSystem === "metric" ? "kg" : "lbs"})
            </label>
            <input
              type="number"
              value={displayWeight()}
              onChange={e => handleWeightChange(e.target.value)}
              placeholder={unitSystem === "metric" ? "75" : "165"}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-muted-foreground"
            />
          </div>

          {/* Height */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              Height ({unitSystem === "metric" ? "cm" : "inches"})
            </label>
            <input
              type="number"
              value={unitSystem === "imperial" && draft.heightCm
                ? String(Math.round(draft.heightCm / 2.54))
                : (draft.heightCm ? String(draft.heightCm) : "")}
              onChange={e => handleHeightChange(e.target.value)}
              placeholder={unitSystem === "metric" ? "175" : "69"}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-muted-foreground"
            />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            saved ? "bg-emerald-500 text-black" : "bg-emerald-500 hover:bg-emerald-400 text-black"
          }`}
        >
          {saved ? <><Check size={16} /> Saved!</> : saving ? "Saving..." : "Save Changes"}
        </button>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-red-400 border border-red-900/50 hover:bg-red-950/30 transition-colors min-h-[44px]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

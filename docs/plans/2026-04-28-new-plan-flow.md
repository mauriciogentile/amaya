# New Plan Creation Flow — Implementation Plan

**Goal:** When the user taps + on the Plans page, show a bottom sheet asking for plan name and number of days (default 3). On confirm, create the plan with Day 1…N pre-populated and navigate to the plan detail page.

**Architecture:** All UI changes in programs/page.tsx — a `NewPlanSheet` bottom-drawer component rendered inline. No new API routes needed (POST /api/programs already works).

**UX Flow:**
1. User taps + → bottom sheet slides up
2. Sheet shows: name input (auto-focused), days picker (1–7, default 3), Create button
3. On Create → POST /api/programs with name + days array → navigate to /programs/{id}

---

## Task 1: Build NewPlanSheet component + wire up + button in programs/page.tsx

**Files:**
- Modify: `app/(app)/programs/page.tsx`

**What to implement:**

Replace the `alert("Coming soon...")` onClick with state to show the sheet.

Add a `NewPlanSheet` component in the same file with:
- Slides up from bottom (fixed bottom-0, translate-y transition)
- Backdrop overlay (semi-transparent, click to close)
- Name text input (placeholder "e.g. Push Pull Legs", auto-focused when sheet opens)
- Days picker: a row of 7 numbered buttons (1–7), selected one highlighted in emerald
- Default selected days = 3
- "Create Plan" button (disabled when name is empty or loading)
- On submit: POST to /api/programs with body:
  ```json
  {
    "name": "<name>",
    "location": "gym",
    "days": [
      { "name": "Day 1", "order": 1, "exercises": [] },
      { "name": "Day 2", "order": 2, "exercises": [] },
      { "name": "Day 3", "order": 3, "exercises": [] }
    ]
  }
  ```
  Days array length = selected number, names are "Day 1", "Day 2", ... "Day N"
- On success: close sheet, navigate to `/programs/${newProgram._id}`
- On error: show inline error text

**Sheet styling:**
- `fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl p-6 pb-10 space-y-5 shadow-2xl border-t border-border`
- Translate from `translate-y-full` (hidden) to `translate-y-0` (visible) with `transition-transform duration-300`
- Backdrop: `fixed inset-0 z-40 bg-black/50` (click closes sheet)

**Complete implementation for the sheet:**

```tsx
function NewPlanSheet({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
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
      const daysArray = Array.from({ length: days }, (_, i) => ({
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
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />}

      {/* Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl p-6 pb-10 space-y-5 shadow-2xl border-t border-border transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
        {/* Handle */}
        <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

        <h2 className="text-lg font-bold text-foreground">New Plan</h2>

        {/* Name input */}
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

        {/* Days picker */}
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

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Creating…" : "Create Plan"}
        </button>
      </div>
    </>
  );
}
```

**Wire into ProgramsPage:**
- Add `const [showSheet, setShowSheet] = useState(false);` to ProgramsPage state
- Add `import { useRef } from "react";` to imports
- Change the + button's onClick to `() => setShowSheet(true)`
- Add `<NewPlanSheet open={showSheet} onClose={() => setShowSheet(false)} onCreated={(id) => { setShowSheet(false); router.push(\`/programs/${id}\`); }} />` at the bottom of the returned JSX (outside the main div, as a sibling or at root level — use a fragment `<>...</>` wrapper if needed)

**After writing:** run `cd /home/maclaurin/amaya && npx tsc --noEmit 2>&1 | head -30`

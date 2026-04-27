'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, BarChart3, Calendar, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",  label: "Log",      icon: Dumbbell  },
  { href: "/programs",   label: "Plans",     icon: Calendar  },
  { href: "/library",    label: "Library",   icon: BookOpen  },
  { href: "/progress",   label: "Progress",  icon: BarChart3 },
  { href: "/profile",    label: "Profile",   icon: User      },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background border-t border-border flex z-50 pb-[env(safe-area-inset-bottom)]">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors min-h-[56px]",
            active ? "text-emerald-400" : "text-muted-foreground"
          )}>
            <Icon className={cn("w-6 h-6", active && "drop-shadow-[0_0_6px_#34d399]")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

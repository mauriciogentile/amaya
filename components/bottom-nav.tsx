'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, BarChart3, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",  label: "Log",      icon: Dumbbell  },
  { href: "/programs",   label: "Programs",  icon: Calendar  },
  { href: "/progress",   label: "Progress",  icon: BarChart3 },
  { href: "/profile",    label: "Profile",   icon: User      },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-zinc-950 border-t border-zinc-800 flex z-50">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors",
            active ? "text-emerald-400" : "text-zinc-500"
          )}>
            <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_#34d399]")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

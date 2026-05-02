"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeInitializer({ theme, accent }: { theme: "light" | "dark"; accent?: string }) {
  const { setTheme } = useTheme();
  useEffect(() => { setTheme(theme); }, [theme]);
  useEffect(() => {
    if (accent) document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);
  return null;
}

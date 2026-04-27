"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeInitializer({ theme }: { theme: "light" | "dark" }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
  }, [theme]);
  return null;
}

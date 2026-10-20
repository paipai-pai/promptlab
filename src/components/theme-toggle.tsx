"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.classList.toggle("dark");

  root.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem("promptlab-theme", isDark ? "dark" : "light");
}

export function ThemeToggle() {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="切换明暗主题"
      title="切换明暗主题"
      onClick={toggleTheme}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </Button>
  );
}

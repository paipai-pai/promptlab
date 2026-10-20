import { FlaskConical, LibraryBig, Menu } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/features/auth/components/logout-button";

type AppShellProps = {
  children: ReactNode;
  sidebarContent?: ReactNode;
  toolbar?: ReactNode;
};

function Brand() {
  return (
    <Link
      href="/library"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span
        className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-mono text-xs font-semibold text-sidebar-primary-foreground shadow-sm shadow-indigo-950/20"
        aria-hidden="true"
      >
        P/
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">PromptLab</span>
        <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Prompt workspace
        </span>
      </span>
    </Link>
  );
}

function PrimaryNavigation() {
  return (
    <nav aria-label="主导航" className="space-y-1">
      <Link
        href="/library"
        aria-current="page"
        className="flex h-9 items-center gap-3 rounded-lg bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground"
      >
        <LibraryBig className="size-4" aria-hidden="true" />
        资产库
      </Link>
      <span
        aria-disabled="true"
        className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground"
        title="将在 UI-04 开放"
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        实验记录
        <span className="ml-auto text-[10px]">稍后</span>
      </span>
    </nav>
  );
}

function AccountPreview() {
  return (
    <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
      <span className="grid size-8 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
        PL
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">私有工作区</span>
        <span className="block truncate text-[10px] text-muted-foreground">Supabase Auth</span>
      </span>
      <LogoutButton />
    </div>
  );
}

export function AppShell({ children, sidebarContent, toolbar }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="border-b border-sidebar-border px-5 py-4">
          <Brand />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <PrimaryNavigation />
          {sidebarContent}
        </div>
        <div className="px-4 pb-4">
          <AccountPreview />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <details className="group relative md:hidden">
            <summary className="grid size-9 list-none place-items-center rounded-lg border bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" aria-hidden="true" />
              <span className="sr-only">打开导航菜单</span>
            </summary>
            <div className="absolute left-0 top-12 z-50 w-72 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl">
              <div className="border-b pb-3">
                <Brand />
              </div>
              <div className="space-y-5 pt-3">
                <PrimaryNavigation />
                {sidebarContent}
                <AccountPreview />
              </div>
            </div>
          </details>
          <div className="mr-auto md:hidden">
            <span className="text-sm font-semibold">PromptLab</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {toolbar}
            <ThemeToggle />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

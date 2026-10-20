import { Braces, History, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const WORKSPACE_POINTS = [
  {
    icon: Braces,
    title: "模板化复用",
    description: "用变量组织可重复使用的 Prompt。",
  },
  {
    icon: History,
    title: "不可变版本",
    description: "每次正文保存都保留清晰历史。",
  },
  {
    icon: ShieldCheck,
    title: "默认私有",
    description: "身份校验与 RLS 共同保护业务数据。",
  },
] as const;

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.9fr)_minmax(32rem,1.1fr)]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <section className="hidden border-r bg-sidebar px-10 py-12 lg:flex lg:flex-col">
        <Link
          href="/login"
          className="flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground shadow-sm shadow-indigo-950/20"
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

        <div className="my-auto max-w-lg py-16">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Developer workspace
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
            让每一次 Prompt 迭代都有迹可循。
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
            集中管理模板、版本与人工实验，把零散的提示词沉淀为可持续演进的个人资产。
          </p>

          <div className="mt-10 grid gap-3">
            {WORKSPACE_POINTS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3 rounded-xl border bg-card/55 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-medium">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">PromptLab · Personal prompt operations</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="mb-10 flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground">
              P/
            </span>
            <span className="font-semibold">PromptLab</span>
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}

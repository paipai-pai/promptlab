import type { Metadata } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { NewPromptForm } from "@/features/prompts/components/new-prompt-form";

export const metadata: Metadata = {
  title: "新建 Prompt · PromptLab",
};

export default function NewPromptPage() {
  const toolbar = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/library" />}
    >
      <ArrowLeft data-icon="inline-start" />
      取消
    </Button>
  );

  return (
    <AppShell toolbar={toolbar}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="border-b pb-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">
              新建 Prompt
            </h1>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            填写元数据和首版正文。提交后将原子创建 Prompt 与不可变 v1。
          </p>
        </header>

        <section className="mt-6 rounded-xl border bg-card p-4 shadow-xs sm:p-6">
          <NewPromptForm />
        </section>
      </div>
    </AppShell>
  );
}

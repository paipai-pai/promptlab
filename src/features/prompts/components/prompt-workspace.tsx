import { ArrowLeft, Clock3, FileText, History } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DeletePromptDialog } from "@/features/prompts/components/delete-prompt-dialog";
import { PromptDraftEditor } from "@/features/prompts/components/prompt-draft-editor";
import { PromptMetadataForm } from "@/features/prompts/components/prompt-metadata-form";
import { formatPromptTimestamp } from "@/features/prompts/format";
import {
  PROMPT_CATEGORY_LABELS,
  type PromptDetail,
} from "@/features/prompts/types";

export function PromptWorkspace({ prompt }: { prompt: PromptDetail }) {
  const toolbar = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/library" />}
    >
      <ArrowLeft data-icon="inline-start" />
      <span className="hidden sm:inline">返回资产库</span>
      <span className="sm:hidden">返回</span>
    </Button>
  );

  return (
    <AppShell toolbar={toolbar}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.025em]">
                {prompt.title}
              </h1>
              <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                {PROMPT_CATEGORY_LABELS[prompt.category]}
              </span>
              <span className="rounded-md bg-accent px-2 py-1 font-mono text-xs text-accent-foreground">
                v{prompt.latestVersion}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {prompt.description || "暂无描述"}
            </p>
          </div>
          <DeletePromptDialog promptId={prompt.id} promptTitle={prompt.title} />
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
            <div className="mb-5 flex items-center gap-2 border-b pb-4">
              <FileText className="size-4 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">编辑与测试</h2>
                <p className="text-xs text-muted-foreground">
                  当前基于正式版本 v{prompt.latestVersion}
                </p>
              </div>
            </div>
            <PromptDraftEditor content={prompt.latestContent} />
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
              <div className="mb-5 flex items-center gap-2 border-b pb-4">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold">Prompt 基本信息</h2>
                  <p className="text-xs text-muted-foreground">
                    修改元数据不会创建正文版本
                  </p>
                </div>
              </div>
              <PromptMetadataForm prompt={prompt} />
            </section>

            <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">正式版本状态</h2>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">当前版本</dt>
                  <dd className="font-mono">v{prompt.latestVersion}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">版本保存时间</dt>
                  <dd className="text-right">
                    {formatPromptTimestamp(prompt.latestVersionCreatedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Prompt 更新时间</dt>
                  <dd className="text-right">
                    {formatPromptTimestamp(prompt.updatedAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 flex gap-2 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                完整版本历史与实验记录将在后续阶段接入；这里不模拟持久化结果。
              </p>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

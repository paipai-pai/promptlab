import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PromptWorkspace } from "@/features/prompts/components/prompt-workspace";
import { getPromptDetail } from "@/features/prompts/queries";

export const metadata: Metadata = {
  title: "Prompt 工作台 · PromptLab",
};

function PromptWorkspaceLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <p className="text-sm text-muted-foreground">正在读取 Prompt…</p>
    </div>
  );
}

async function PromptWorkspaceContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prompt = await getPromptDetail(id);

  if (!prompt) {
    notFound();
  }

  return <PromptWorkspace prompt={prompt} />;
}

export default function PromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PromptWorkspaceLoading />}>
      <PromptWorkspaceContent params={params} />
    </Suspense>
  );
}

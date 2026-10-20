import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PromptLibrary } from "@/features/prompts/components/prompt-library";
import {
  listPrompts,
  parsePromptListFilters,
} from "@/features/prompts/queries";

export const metadata: Metadata = {
  title: "Prompt 资产库 · PromptLab",
};

function LibraryLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <p className="text-sm text-muted-foreground">正在读取资产库…</p>
    </div>
  );
}

function firstPageUrl(filters: ReturnType<typeof parsePromptListFilters>) {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);

  const serialized = params.toString();
  return serialized ? `/library?${serialized}` : "/library";
}

async function LibraryContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parsePromptListFilters(await searchParams);
  const result = await listPrompts(filters);

  if (filters.page > 1 && result.prompts.length === 0) {
    redirect(firstPageUrl(filters));
  }

  return (
    <PromptLibrary
      key={`${filters.query}:${filters.category}:${filters.page}`}
      prompts={result.prompts}
      total={result.total}
      totalPages={result.totalPages}
      filters={filters}
    />
  );
}

export default function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryContent searchParams={searchParams} />
    </Suspense>
  );
}

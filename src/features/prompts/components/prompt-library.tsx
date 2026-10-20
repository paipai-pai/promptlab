"use client";

import {
  BookOpen,
  Braces,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Code2,
  ImageIcon,
  LibraryBig,
  LoaderCircle,
  PenTool,
  Plus,
  Search,
  SearchX,
  Shapes,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPromptTimestamp } from "@/features/prompts/format";
import {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_LABELS,
  type PromptCategory,
  type PromptCategoryFilter,
  type PromptListFilters,
  type PromptSummary,
} from "@/features/prompts/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<PromptCategory, LucideIcon> = {
  coding: Code2,
  product: ClipboardList,
  content: PenTool,
  image: ImageIcon,
  research: BookOpen,
  other: Shapes,
};

type PromptLibraryProps = {
  prompts: readonly PromptSummary[];
  total: number;
  totalPages: number;
  filters: PromptListFilters;
};

function CategoryFilter({
  selectedCategory,
  onSelect,
  compact = false,
}: {
  selectedCategory: PromptCategoryFilter;
  onSelect: (category: PromptCategoryFilter) => void;
  compact?: boolean;
}) {
  const categories: readonly PromptCategoryFilter[] = [
    "all",
    ...PROMPT_CATEGORIES,
  ];

  return (
    <div
      className={cn(
        compact
          ? "flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "space-y-1",
      )}
      aria-label="Prompt 分类"
    >
      {categories.map((category) => {
        const isSelected = category === selectedCategory;
        const Icon = category === "all" ? Braces : CATEGORY_ICONS[category];
        const label =
          category === "all" ? "全部 Prompt" : PROMPT_CATEGORY_LABELS[category];

        return (
          <button
            key={category}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(category)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-8 border px-3" : "h-9 w-full px-3",
              isSelected
                ? "border-primary/30 bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchField({
  query,
  onQueryChange,
  pending,
  className,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  pending: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {pending ? (
        <LoaderCircle
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary"
          aria-hidden="true"
        />
      ) : (
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <Input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label="搜索 Prompt"
        placeholder="搜索名称、描述或最新正文…"
        className="h-9 bg-card pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {query ? (
        <button
          type="button"
          aria-label="清空搜索"
          onClick={() => onQueryChange("")}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-dashed bg-card/40 p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <LibraryBig className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold">还没有 Prompt</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          创建第一条 Prompt，系统会同时生成不可变的首个正文版本。
        </p>
        <Button
          className="mt-5"
          nativeButton={false}
          render={<Link href="/prompts/new" />}
        >
          <Plus data-icon="inline-start" />
          新建 Prompt
        </Button>
      </div>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-dashed bg-card/40 p-8 text-center">
      <div>
        <SearchX className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-base font-semibold">没有匹配的 Prompt</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          搜索会匹配名称、描述和最新正式版本正文。
        </p>
        <Button className="mt-5" variant="outline" onClick={onClear}>
          清除筛选
        </Button>
      </div>
    </div>
  );
}

function PromptList({ prompts }: { prompts: readonly PromptSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="hidden grid-cols-[minmax(0,1fr)_8rem_6rem_9rem] gap-4 border-b bg-muted/35 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground lg:grid">
        <span>Prompt</span>
        <span>分类</span>
        <span>版本</span>
        <span>最近更新</span>
      </div>
      <div className="divide-y">
        {prompts.map((prompt) => (
          <article
            key={prompt.id}
            className="group grid gap-4 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5 lg:grid-cols-[minmax(0,1fr)_8rem_6rem_9rem] lg:items-center"
          >
            <div className="min-w-0">
              <Link
                href={`/prompts/${prompt.id}`}
                className="inline-flex max-w-full items-center gap-1.5 font-medium tracking-tight outline-none hover:text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{prompt.title}</span>
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {prompt.description || "暂无描述"}
              </p>
            </div>
            <div>
              <span className="inline-flex rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                {PROMPT_CATEGORY_LABELS[prompt.category]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm lg:block">
              <span className="font-mono text-xs font-medium">
                v{prompt.latestVersion}
              </span>
              <span className="text-xs text-muted-foreground lg:mt-1 lg:block">
                {prompt.variableCount} 个变量
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPromptTimestamp(prompt.updatedAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  direction,
  href,
}: {
  page: number;
  disabled: boolean;
  direction: "previous" | "next";
  href: string;
}) {
  const label = direction === "previous" ? "上一页" : "下一页";
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  if (disabled) {
    return (
      <Button variant="outline" disabled>
        <Icon data-icon="inline-start" />
        {label}
      </Button>
    );
  }

  return (
    <Button variant="outline" nativeButton={false} render={<Link href={href} />}>
      <Icon data-icon={direction === "previous" ? "inline-start" : "inline-end"} />
      {label}
      <span className="sr-only">，第 {page} 页</span>
    </Button>
  );
}

export function PromptLibrary({
  prompts,
  total,
  totalPages,
  filters,
}: PromptLibraryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [query, setQuery] = useState(filters.query);
  const [pending, startTransition] = useTransition();

  const buildUrl = useCallback(
    (changes: {
      q?: string | null;
      category?: PromptCategoryFilter | null;
      page?: number | null;
    }) => {
      const params = new URLSearchParams(searchParamsString);

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === "all" || value === 1) {
          params.delete(key);
        } else if (value !== undefined) {
          params.set(key, String(value));
        }
      }

      const serialized = params.toString();
      return serialized ? `${pathname}?${serialized}` : pathname;
    },
    [pathname, searchParamsString],
  );

  useEffect(() => {
    if (query === filters.query) return;

    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(buildUrl({ q: query, page: null }), { scroll: false });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [buildUrl, filters.query, query, router]);

  const selectCategory = (category: PromptCategoryFilter) => {
    startTransition(() => {
      router.replace(buildUrl({ category, page: null }), { scroll: false });
    });
  };

  const clearFilters = () => {
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const hasFilters = Boolean(filters.query) || filters.category !== "all";
  const sidebarContent = (
    <section aria-label="Prompt 分类筛选">
      <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        分类
      </h2>
      <CategoryFilter
        selectedCategory={filters.category}
        onSelect={selectCategory}
      />
    </section>
  );

  const toolbar = (
    <>
      <SearchField
        query={query}
        onQueryChange={setQuery}
        pending={pending}
        className="hidden w-full max-w-sm sm:block"
      />
      <Button nativeButton={false} render={<Link href="/prompts/new" />}>
        <Plus data-icon="inline-start" />
        <span className="hidden sm:inline">新建 Prompt</span>
        <span className="sm:hidden">新建</span>
      </Button>
    </>
  );

  return (
    <AppShell sidebarContent={sidebarContent} toolbar={toolbar}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.025em]">
                Prompt 资产库
              </h1>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Supabase
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              管理模板、分类和正式版本；数据仅对当前账号可见。
            </p>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            共 {total} 条{pending ? " · 正在更新" : ""}
          </p>
        </div>

        <SearchField
          query={query}
          onQueryChange={setQuery}
          pending={pending}
          className="mt-5 sm:hidden"
        />

        <div className="mt-5 md:hidden">
          <CategoryFilter
            compact
            selectedCategory={filters.category}
            onSelect={selectCategory}
          />
        </div>

        <div className={cn("mt-6 transition-opacity", pending && "opacity-60")}>
          {total === 0 && !hasFilters ? (
            <EmptyLibrary />
          ) : prompts.length === 0 ? (
            <NoResults onClear={clearFilters} />
          ) : (
            <PromptList prompts={prompts} />
          )}
        </div>

        {totalPages > 1 ? (
          <nav
            aria-label="Prompt 分页"
            className="mt-5 flex items-center justify-between gap-3"
          >
            <PageLink
              direction="previous"
              page={filters.page - 1}
              disabled={filters.page <= 1}
              href={buildUrl({ page: filters.page - 1 })}
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              第 {filters.page} / {totalPages} 页
            </span>
            <PageLink
              direction="next"
              page={filters.page + 1}
              disabled={filters.page >= totalPages}
              href={buildUrl({ page: filters.page + 1 })}
            />
          </nav>
        ) : null}
      </div>
    </AppShell>
  );
}

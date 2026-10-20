import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PromptLibrary } from "@/features/prompts/components/prompt-library";
import type { PromptSummary } from "@/features/prompts/types";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.searchParams),
}));

const PROMPTS: PromptSummary[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    title: "API 错误诊断助手",
    description: "排查接口错误",
    category: "coding",
    latestVersionId: "11000000-0000-0000-0000-000000000001",
    latestVersion: 1,
    variableCount: 1,
    createdAt: "2026-10-20T01:00:00.000Z",
    updatedAt: "2026-10-20T01:00:00.000Z",
  },
  {
    id: "20000000-0000-0000-0000-000000000001",
    title: "产品主视觉提示词",
    description: "图像生成简报",
    category: "image",
    latestVersionId: "21000000-0000-0000-0000-000000000001",
    latestVersion: 2,
    variableCount: 1,
    createdAt: "2026-10-20T02:00:00.000Z",
    updatedAt: "2026-10-20T02:00:00.000Z",
  },
];

const DEFAULT_FILTERS = {
  query: "",
  category: "all" as const,
  page: 1,
  pageSize: 12,
};

describe("PromptLibrary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigation.replace.mockReset();
    navigation.searchParams = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders server-provided Prompt rows", () => {
    render(
      <PromptLibrary
        prompts={PROMPTS}
        total={2}
        totalPages={1}
        filters={DEFAULT_FILTERS}
      />,
    );

    expect(screen.getByText("API 错误诊断助手")).toBeDefined();
    expect(screen.getByText("产品主视觉提示词")).toBeDefined();
  });

  it("updates the URL for debounced server search", async () => {
    render(
      <PromptLibrary
        prompts={PROMPTS}
        total={2}
        totalPages={1}
        filters={DEFAULT_FILTERS}
      />,
    );

    fireEvent.change(
      screen.getAllByRole("searchbox", { name: "搜索 Prompt" })[0],
      { target: { value: "needle" } },
    );
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(navigation.replace).toHaveBeenCalledWith("/library?q=needle", {
      scroll: false,
    });
  });

  it("combines category selection through URL state", () => {
    render(
      <PromptLibrary
        prompts={PROMPTS}
        total={2}
        totalPages={1}
        filters={DEFAULT_FILTERS}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "图像生成" })[0]);

    expect(navigation.replace).toHaveBeenCalledWith(
      "/library?category=image",
      { scroll: false },
    );
  });

  it("distinguishes empty-library and no-results states", () => {
    const { rerender } = render(
      <PromptLibrary
        prompts={[]}
        total={0}
        totalPages={1}
        filters={DEFAULT_FILTERS}
      />,
    );
    expect(screen.getByText("还没有 Prompt")).toBeDefined();

    rerender(
      <PromptLibrary
        prompts={[]}
        total={0}
        totalPages={1}
        filters={{ ...DEFAULT_FILTERS, query: "missing" }}
      />,
    );
    expect(screen.getByText("没有匹配的 Prompt")).toBeDefined();
  });

  it("clears search and category without restoring stale URL state", async () => {
    navigation.searchParams = "q=missing&category=product";

    render(
      <PromptLibrary
        prompts={[]}
        total={0}
        totalPages={1}
        filters={{
          ...DEFAULT_FILTERS,
          query: "missing",
          category: "product",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith("/library", {
      scroll: false,
    });
  });

  it("keeps filters while generating stable pagination links", () => {
    navigation.searchParams = "q=api&category=coding&page=2";

    render(
      <PromptLibrary
        prompts={PROMPTS}
        total={26}
        totalPages={3}
        filters={{
          ...DEFAULT_FILTERS,
          query: "api",
          category: "coding",
          page: 2,
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /上一页/ }).getAttribute("href"),
    ).toBe("/library?q=api&category=coding");
    expect(
      screen.getByRole("button", { name: /下一页/ }).getAttribute("href"),
    ).toBe("/library?q=api&category=coding&page=3");
    expect(screen.getByText("第 2 / 3 页")).toBeDefined();
  });
});

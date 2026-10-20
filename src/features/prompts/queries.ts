import "server-only";

import { connection } from "next/server";

import { getCurrentUser } from "@/features/auth/user";
import {
  promptCategorySchema,
  promptIdSchema,
  promptListFiltersSchema,
} from "@/features/prompts/schemas";
import { extractTemplateVariables } from "@/features/prompts/template";
import type {
  PromptDetail,
  PromptListFilters,
  PromptListResult,
  PromptSummary,
} from "@/features/prompts/types";
import { createClient } from "@/lib/supabase/server";

export class PromptQueryError extends Error {
  constructor(
    public readonly code: "AUTH_REQUIRED" | "QUERY_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PromptQueryError";
  }
}

export function parsePromptListFilters(
  input: Record<string, string | string[] | undefined>,
): PromptListFilters {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return promptListFiltersSchema.parse({
    query: first(input.q) ?? "",
    category: first(input.category) ?? "all",
    page: first(input.page) ?? 1,
    pageSize: 12,
  });
}

async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new PromptQueryError("AUTH_REQUIRED", "登录状态已失效，请重新登录。");
  }

  return user;
}

function mapPromptSummary(row: {
  id: string;
  title: string;
  description: string;
  category: string;
  latest_version_id: string;
  latest_version_number: number;
  latest_content: string;
  created_at: string;
  updated_at: string;
}): PromptSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: promptCategorySchema.parse(row.category),
    latestVersionId: row.latest_version_id,
    latestVersion: row.latest_version_number,
    variableCount: extractTemplateVariables(row.latest_content).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPrompts(
  input: PromptListFilters,
): Promise<PromptListResult> {
  await connection();
  await requireUser();
  const filters = promptListFiltersSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_prompts", {
    p_query: filters.query || undefined,
    p_category: filters.category === "all" ? undefined : filters.category,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });

  if (error) {
    throw new PromptQueryError(
      "QUERY_FAILED",
      "暂时无法读取 Prompt 资产，请稍后重试。",
    );
  }

  const prompts = data.map(mapPromptSummary);
  const total = data[0]?.total_count ?? 0;

  return {
    prompts,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getPromptDetail(id: string): Promise<PromptDetail | null> {
  await connection();
  await requireUser();
  const parsedId = promptIdSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(
      "id,title,description,category,created_at,updated_at,prompt_versions(id,version_number,content,created_at)",
    )
    .eq("id", parsedId.data)
    .order("version_number", {
      referencedTable: "prompt_versions",
      ascending: false,
    })
    .limit(1, { referencedTable: "prompt_versions" })
    .maybeSingle();

  if (error) {
    throw new PromptQueryError(
      "QUERY_FAILED",
      "暂时无法读取 Prompt 详情，请稍后重试。",
    );
  }

  const latestVersion = data?.prompt_versions[0];

  if (!data || !latestVersion) {
    return null;
  }

  return {
    ...mapPromptSummary({
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      latest_version_id: latestVersion.id,
      latest_version_number: latestVersion.version_number,
      latest_content: latestVersion.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }),
    latestContent: latestVersion.content,
    latestVersionCreatedAt: latestVersion.created_at,
  };
}

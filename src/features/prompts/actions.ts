"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  DeletePromptState,
  PromptActionState,
  PromptFormValues,
} from "@/features/prompts/action-state";
import {
  createPromptSchema,
  promptIdSchema,
  promptMetadataSchema,
} from "@/features/prompts/schemas";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readPromptValues(formData: FormData, includeContent: boolean) {
  const values: PromptFormValues = {
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    category: readText(formData, "category"),
  };

  if (includeContent) {
    values.content = readText(formData, "content");
  }

  return values;
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== "string") {
    return null;
  }

  return supabase;
}

export async function createPromptAction(
  _previousState: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const values = readPromptValues(formData, true);
  const result = createPromptSchema.safeParse(values);

  if (!result.success) {
    return {
      status: "error",
      message: "请修正表单中的问题后再创建。",
      errors: result.error.flatten().fieldErrors,
      values,
    };
  }

  const supabase = await getAuthenticatedClient();

  if (!supabase) {
    return {
      status: "error",
      message: "登录状态已失效。请重新登录后再次提交。",
      values,
    };
  }

  const { data, error } = await supabase.rpc(
    "create_prompt_with_initial_version",
    {
      p_title: result.data.title,
      p_description: result.data.description,
      p_category: result.data.category,
      p_content: result.data.content,
    },
  );

  const createdPrompt = data?.[0];

  if (error || !createdPrompt) {
    console.error("[prompts.create] Database operation failed", {
      code: error?.code ?? "missing_result",
    });
    return {
      status: "error",
      message: "Prompt 创建失败，数据尚未保存。请稍后重试。",
      values,
    };
  }

  revalidatePath("/library");
  redirect(`/prompts/${createdPrompt.prompt_id}`);
}

export async function updatePromptMetadataAction(
  promptId: string,
  _previousState: PromptActionState,
  formData: FormData,
): Promise<PromptActionState> {
  const values = readPromptValues(formData, false);
  const idResult = promptIdSchema.safeParse(promptId);
  const result = promptMetadataSchema.safeParse(values);

  if (!idResult.success || !result.success) {
    return {
      status: "error",
      message: "请修正表单中的问题后再保存。",
      errors: result.success ? undefined : result.error.flatten().fieldErrors,
      values,
    };
  }

  const supabase = await getAuthenticatedClient();

  if (!supabase) {
    return {
      status: "error",
      message: "登录状态已失效。请重新登录后再次提交。",
      values,
    };
  }

  const { data, error } = await supabase
    .from("prompts")
    .update(result.data)
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[prompts.update] Database operation failed", {
      code: error?.code ?? "not_found",
    });
    return {
      status: "error",
      message: "无法保存元数据。该 Prompt 不存在、无权访问或服务暂时不可用。",
      values,
    };
  }

  revalidatePath("/library");
  revalidatePath(`/prompts/${idResult.data}`);

  return {
    status: "success",
    message: "元数据已保存；正文版本没有变化。",
    values: result.data,
  };
}

export async function deletePromptAction(
  promptId: string,
  _previousState: DeletePromptState,
  _formData: FormData,
): Promise<DeletePromptState> {
  void _previousState;
  void _formData;
  const idResult = promptIdSchema.safeParse(promptId);

  if (!idResult.success) {
    return { status: "error", message: "Prompt 标识无效，无法删除。" };
  }

  const supabase = await getAuthenticatedClient();

  if (!supabase) {
    return {
      status: "error",
      message: "登录状态已失效。请重新登录后再次操作。",
    };
  }

  const { data, error } = await supabase
    .from("prompts")
    .delete()
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[prompts.delete] Database operation failed", {
      code: error?.code ?? "not_found",
    });
    return {
      status: "error",
      message: "删除失败。该 Prompt 不存在、无权访问或服务暂时不可用。",
    };
  }

  revalidatePath("/library");
  redirect("/library");
}

import { z } from "zod";

import { PROMPT_CATEGORIES } from "@/features/prompts/types";

const trimmedRequiredText = (label: string, max: number) =>
  z
    .string({ error: `${label}格式不正确。` })
    .max(max, `${label}不能超过 ${max} 个字符。`)
    .refine((value) => value.trim().length > 0, `${label}不能为空。`)
    .transform((value) => value.trim());

export const promptCategorySchema = z.enum(PROMPT_CATEGORIES, {
  error: "请选择有效分类。",
});

export const promptMetadataSchema = z.object({
  title: trimmedRequiredText("名称", 120),
  description: z
    .string({ error: "描述格式不正确。" })
    .max(1000, "描述不能超过 1000 个字符。")
    .transform((value) => value.trim()),
  category: promptCategorySchema,
});

export const createPromptSchema = promptMetadataSchema.extend({
  content: z
    .string({ error: "Prompt 正文格式不正确。" })
    .max(50000, "Prompt 正文不能超过 50000 个字符。")
    .refine((value) => value.trim().length > 0, "Prompt 正文不能为空。"),
});

export const promptIdSchema = z.uuid("Prompt 标识无效。");

export const promptListFiltersSchema = z.object({
  query: z.string().trim().max(500).catch(""),
  category: z.union([z.literal("all"), promptCategorySchema]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(12),
});

export type PromptMetadataInput = z.infer<typeof promptMetadataSchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;

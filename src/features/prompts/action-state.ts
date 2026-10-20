import type { PromptCategory } from "@/features/prompts/types";

export type PromptFormValues = {
  title: string;
  description: string;
  category: PromptCategory | string;
  content?: string;
};

export type PromptFieldErrors = Partial<
  Record<"title" | "description" | "category" | "content", string[]>
>;

export type PromptActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: PromptFieldErrors;
  values: PromptFormValues;
};

export type DeletePromptState = {
  status: "idle" | "error";
  message?: string;
};

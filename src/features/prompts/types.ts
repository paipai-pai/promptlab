export const PROMPT_CATEGORIES = [
  "coding",
  "product",
  "content",
  "image",
  "research",
  "other",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];
export type PromptCategoryFilter = "all" | PromptCategory;

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  coding: "编程开发",
  product: "产品工作",
  content: "内容创作",
  image: "图像生成",
  research: "学习研究",
  other: "其他",
};

export type PromptSummary = {
  id: string;
  title: string;
  description: string;
  category: PromptCategory;
  latestVersionId: string;
  latestVersion: number;
  variableCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PromptDetail = PromptSummary & {
  latestContent: string;
  latestVersionCreatedAt: string;
};

export type PromptListFilters = {
  query: string;
  category: PromptCategoryFilter;
  page: number;
  pageSize: number;
};

export type PromptListResult = {
  prompts: PromptSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

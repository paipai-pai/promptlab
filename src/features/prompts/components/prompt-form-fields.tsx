import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PromptFieldErrors } from "@/features/prompts/action-state";
import {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_LABELS,
  type PromptCategory,
} from "@/features/prompts/types";
import { cn } from "@/lib/utils";

type PromptFormFieldsProps = {
  values: {
    title: string;
    description: string;
    category: string;
    content?: string;
  };
  errors?: PromptFieldErrors;
  includeContent?: boolean;
  onValueChange?: (name: string, value: string) => void;
};

function FieldError({ messages, id }: { messages?: string[]; id: string }) {
  if (!messages?.length) return null;

  return (
    <p id={id} className="text-xs text-destructive">
      {messages[0]}
    </p>
  );
}

export function PromptFormFields({
  values,
  errors,
  includeContent = false,
  onValueChange,
}: PromptFormFieldsProps) {
  const inputProps = (name: "title" | "description" | "category" | "content") => ({
    name,
    value: values[name] ?? "",
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => onValueChange?.(name, event.target.value),
    "aria-invalid": Boolean(errors?.[name]?.length),
    "aria-describedby": errors?.[name]?.length ? `${name}-error` : undefined,
  });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">名称</Label>
        <Input
          id="title"
          maxLength={120}
          required
          placeholder="例如：API 错误诊断助手"
          {...inputProps("title")}
        />
        <FieldError id="title-error" messages={errors?.title} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="description">描述</Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {values.description.length}/1000
          </span>
        </div>
        <Textarea
          id="description"
          maxLength={1000}
          rows={3}
          placeholder="说明用途、输入和预期输出。"
          {...inputProps("description")}
        />
        <FieldError id="description-error" messages={errors?.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <select
          id="category"
          required
          className={cn(
            "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors?.category?.length && "border-destructive",
          )}
          {...inputProps("category")}
        >
          {PROMPT_CATEGORIES.map((category: PromptCategory) => (
            <option key={category} value={category}>
              {PROMPT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <FieldError id="category-error" messages={errors?.category} />
      </div>

      {includeContent ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="content">Prompt 正文</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {(values.content ?? "").length}/50000
            </span>
          </div>
          <Textarea
            id="content"
            required
            maxLength={50000}
            rows={16}
            placeholder="使用 {{variable_name}} 插入可复用变量。"
            className="min-h-64 font-mono leading-6"
            {...inputProps("content")}
          />
          <p className="text-xs text-muted-foreground">
            创建时会在同一事务中保存 Prompt 和不可变 v1。
          </p>
          <FieldError id="content-error" messages={errors?.content} />
        </div>
      ) : null}
    </div>
  );
}

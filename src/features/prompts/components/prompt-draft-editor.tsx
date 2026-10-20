"use client";

import { AlertTriangle, Check, Copy, FileClock, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  extractTemplateVariables,
  renderPromptTemplate,
} from "@/features/prompts/template";

type CopyStatus = "idle" | "copied" | "error";

export function PromptDraftEditor({ content }: { content: string }) {
  const [draft, setDraft] = useState(content);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const hasChanges = draft !== content;
  const variables = useMemo(() => extractTemplateVariables(draft), [draft]);
  const { renderedContent, missingVariables } = useMemo(
    () => renderPromptTemplate(draft, variableValues),
    [draft, variableValues],
  );

  useEffect(() => {
    if (copyStatus !== "copied") return;

    const timer = window.setTimeout(() => setCopyStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const updateVariableValue = (variable: string, value: string) => {
    setCopyStatus("idle");
    setVariableValues((current) => ({ ...current, [variable]: value }));
  };

  const updateDraft = (value: string) => {
    setCopyStatus("idle");
    setDraft(value);
  };

  const copyRenderedPrompt = async () => {
    setCopyStatus("idle");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(renderedContent);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label htmlFor="prompt-content">正文草稿</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            修改仅保留在当前页面，不会覆盖正式版本。
          </p>
        </div>
        <span
          className={
            hasChanges
              ? "rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
              : "rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300"
          }
        >
          {hasChanges ? "有未保存更改" : "与正式版本一致"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
        <div className="space-y-4">
          <Textarea
            id="prompt-content"
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            rows={18}
            maxLength={50000}
            className="min-h-80 font-mono leading-6"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              保存 v2/v3 属于 Phase 3；当前不会显示虚假的保存成功状态。
            </p>
            <Button
              type="button"
              variant="outline"
              disabled
              title="将在 Phase 3 开放"
            >
              <FileClock data-icon="inline-start" />
              保存为新版本
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border bg-muted/15 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">模板变量</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  输入值会立即更新下方预览。
                </p>
              </div>
              <span className="rounded-md border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {variables.length} 个
              </span>
            </div>

            {variables.length ? (
              <div className="mt-4 space-y-3">
                {variables.map((variable) => {
                  const inputId = `prompt-variable-${variable}`;
                  const isMissing = missingVariables.includes(variable);

                  return (
                    <div key={variable} className="space-y-1.5">
                      <Label htmlFor={inputId}>变量 {variable}</Label>
                      <Input
                        id={inputId}
                        value={variableValues[variable] ?? ""}
                        onChange={(event) =>
                          updateVariableValue(variable, event.target.value)
                        }
                        placeholder={`填写 {{${variable}}}`}
                        aria-invalid={isMissing}
                        autoComplete="off"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-dashed bg-background/60 p-3 text-xs text-muted-foreground">
                当前正文未识别到模板变量。
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-3 py-2.5">
              <div>
                <h3 className="text-sm font-medium">实时预览</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  当前为本地草稿，不是正式版本。
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={renderedContent.trim().length === 0}
                onClick={copyRenderedPrompt}
              >
                <Copy data-icon="inline-start" />
                复制预览
              </Button>
            </div>

            <pre
              data-testid="rendered-prompt"
              className="min-h-40 max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-6 text-foreground sm:p-4"
            >
              {renderedContent || "预览内容将在这里显示。"}
            </pre>

            <div className="border-t px-3 py-2.5 sm:px-4">
              {missingVariables.length ? (
                <p
                  role="status"
                  className="flex items-start gap-2 text-xs leading-5 text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    缺少 {missingVariables.length} 个变量：
                    {missingVariables.map((variable) => `{{${variable}}}`).join("、")}
                  </span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5" aria-hidden="true" />
                  {variables.length ? "所有变量均已填写" : "正文无需填写变量"}
                </p>
              )}

              <p className="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">
                {copyStatus === "copied" ? "已复制当前预览" : null}
                {copyStatus === "error"
                  ? "复制失败，请检查浏览器权限后重试"
                  : null}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

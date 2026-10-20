"use client";

import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  PromptActionState,
  PromptFormValues,
} from "@/features/prompts/action-state";
import { updatePromptMetadataAction } from "@/features/prompts/actions";
import { PromptFormFields } from "@/features/prompts/components/prompt-form-fields";
import type { PromptDetail } from "@/features/prompts/types";
import { useRecoverableActionState } from "@/lib/use-recoverable-action-state";

export function PromptMetadataForm({ prompt }: { prompt: PromptDetail }) {
  const initialValues: PromptFormValues = useMemo(
    () => ({
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
    }),
    [prompt.category, prompt.description, prompt.title],
  );
  const action = useMemo(
    () => updatePromptMetadataAction.bind(null, prompt.id),
    [prompt.id],
  );
  const { state, formAction, pending, transportError } =
    useRecoverableActionState(action, {
      status: "idle",
      values: initialValues,
    } satisfies PromptActionState);
  const [values, setValues] = useState(initialValues);

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  return (
    <form action={formAction} className="space-y-5">
      <PromptFormFields
        values={values}
        errors={state.errors}
        onValueChange={updateValue}
      />

      {transportError || state.message ? (
        <p
          role={transportError || state.status === "error" ? "alert" : "status"}
          className={
            !transportError && state.status === "success"
              ? "flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {!transportError && state.status === "success" ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : null}
          {transportError ?? state.message}
        </p>
      ) : null}

      <div className="flex justify-end border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {pending ? "正在保存…" : "保存元数据"}
        </Button>
      </div>
    </form>
  );
}

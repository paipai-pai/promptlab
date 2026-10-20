"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  PromptActionState,
  PromptFormValues,
} from "@/features/prompts/action-state";
import { createPromptAction } from "@/features/prompts/actions";
import { PromptFormFields } from "@/features/prompts/components/prompt-form-fields";
import { useRecoverableActionState } from "@/lib/use-recoverable-action-state";

const INITIAL_VALUES: PromptFormValues = {
  title: "",
  description: "",
  category: "coding",
  content: "",
};

const INITIAL_STATE: PromptActionState = {
  status: "idle",
  values: INITIAL_VALUES,
};

export function NewPromptForm() {
  const { state, formAction, pending, transportError } =
    useRecoverableActionState(
    createPromptAction,
    INITIAL_STATE,
  );
  const [values, setValues] = useState(INITIAL_VALUES);

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  return (
    <form action={formAction} className="space-y-6">
      <PromptFormFields
        includeContent
        values={values}
        errors={state.errors}
        onValueChange={updateValue}
      />

      {transportError || state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {transportError ?? state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/library" />}
        >
          <ArrowLeft data-icon="inline-start" />
          返回资产库
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {pending ? "正在创建…" : "创建 Prompt 与 v1"}
        </Button>
      </div>
    </form>
  );
}

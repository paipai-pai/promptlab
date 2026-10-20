"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useMemo } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DeletePromptState } from "@/features/prompts/action-state";
import { deletePromptAction } from "@/features/prompts/actions";
import { useRecoverableActionState } from "@/lib/use-recoverable-action-state";

export function DeletePromptDialog({
  promptId,
  promptTitle,
}: {
  promptId: string;
  promptTitle: string;
}) {
  const action = useMemo(
    () => deletePromptAction.bind(null, promptId),
    [promptId],
  );
  const { state, formAction, pending, transportError } =
    useRecoverableActionState(action, {
      status: "idle",
    } satisfies DeletePromptState);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2 data-icon="inline-start" />
        删除 Prompt
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>确认删除“{promptTitle}”？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作会级联删除该 Prompt 的所有版本和实验记录，MVP 不提供回收站。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction}>
          {transportError || state.message ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {transportError ?? state.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {pending ? "正在删除…" : "确认删除"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

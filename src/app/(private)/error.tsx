"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PrivateAreaError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold">暂时无法加载工作区</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          连接可能中断，或登录状态已经过期。请重试；若仍失败，请重新登录。
        </p>
        <Button className="mt-5" type="button" onClick={reset}>
          <RotateCw data-icon="inline-start" />
          重试
        </Button>
      </div>
    </div>
  );
}

import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function PromptNotFound() {
  return (
    <AppShell>
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12">
        <div className="max-w-md text-center">
          <FileQuestion className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">找不到该 Prompt</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            记录可能不存在、已删除，或不属于当前账号。为保护隐私，这些情况不会进一步区分。
          </p>
          <Button
            className="mt-5"
            nativeButton={false}
            render={<Link href="/library" />}
          >
            返回资产库
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

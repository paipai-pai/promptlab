import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { getCurrentUser } from "@/features/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function AuthenticatedContent({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/login?reason=configuration");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return children;
}

function WorkspaceLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary font-mono text-xs font-semibold text-primary-foreground">
          P/
        </span>
        <p className="mt-4 text-sm text-muted-foreground">正在验证工作区会话…</p>
      </div>
    </div>
  );
}

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Suspense>
  );
}

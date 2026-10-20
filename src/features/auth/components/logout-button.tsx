"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    setError(undefined);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signOut({ scope: "local" });

        if (authError) {
          setError("退出失败，请重试。");
          return;
        }

        router.replace("/login?status=signed-out");
        router.refresh();
      } catch {
        setError("认证服务暂时不可用。");
      }
    });
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-50"
        aria-label={pending ? "正在退出" : "退出登录"}
        title="退出登录"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="size-4" aria-hidden="true" />
        )}
      </button>
      {error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

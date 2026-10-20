import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { getLoginNotice } from "@/features/auth/login-notice";
import { getSafeRedirectPath } from "@/features/auth/paths";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(firstValue(params.next));
  const configured = isSupabaseConfigured();

  return (
    <AuthForm
      mode="login"
      nextPath={nextPath}
      configured={configured}
      notice={getLoginNotice(params, configured)}
    />
  );
}

function AuthFormFallback() {
  return <div className="h-[32rem] animate-pulse rounded-2xl border bg-card/40" />;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback />}>
        <LoginContent {...props} />
      </Suspense>
    </AuthShell>
  );
}

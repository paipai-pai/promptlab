import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { getSafeRedirectPath } from "@/features/auth/paths";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "邮箱注册",
};

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function SignupContent({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthForm
      mode="signup"
      nextPath={getSafeRedirectPath(rawNext)}
      configured={isSupabaseConfigured()}
    />
  );
}

function AuthFormFallback() {
  return <div className="h-[38rem] animate-pulse rounded-2xl border bg-card/40" />;
}

export default function SignupPage(props: SignupPageProps) {
  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback />}>
        <SignupContent {...props} />
      </Suspense>
    </AuthShell>
  );
}

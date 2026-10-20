"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, signupAction } from "@/features/auth/actions";
import { INITIAL_AUTH_FORM_STATE } from "@/features/auth/schemas";
import { useRecoverableActionState } from "@/lib/use-recoverable-action-state";

type AuthFormProps = {
  mode: "login" | "signup";
  nextPath: string;
  configured: boolean;
  notice?: {
    tone: "info" | "error" | "success";
    message: string;
  };
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="mt-1.5 text-xs text-destructive">
      {errors[0]}
    </p>
  );
}

export function AuthForm({ mode, nextPath, configured, notice }: AuthFormProps) {
  const isLogin = mode === "login";
  const action = isLogin ? loginAction : signupAction;
  const { state, formAction, pending, transportError } =
    useRecoverableActionState(action, INITIAL_AUTH_FORM_STATE);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
        {isLogin ? "Welcome back" : "Create workspace"}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
        {isLogin ? "登录 PromptLab" : "创建 PromptLab 账户"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {isLogin
          ? "使用邮箱和密码进入你的私有 Prompt 工作区。"
          : "注册后请通过验证邮件确认邮箱，再进入工作区。"}
      </p>

      {!configured ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-6">
            当前未配置 Supabase 开发项目。表单与校验可以预览，但认证请求不会被提交。
          </p>
        </div>
      ) : null}

      {notice ? (
        <div
          className={
            notice.tone === "error"
              ? "mt-6 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive"
              : notice.tone === "success"
                ? "mt-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
                : "mt-6 rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground"
          }
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}

      <form action={formAction} noValidate className="mt-7 space-y-5">
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            邮箱
          </label>
          <div className="relative mt-2">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(state.errors?.email)}
              aria-describedby={state.errors?.email ? "email-error" : undefined}
              className="h-10 bg-card pl-9"
            />
          </div>
          <FieldError id="email-error" errors={state.errors?.email} />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            密码
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            aria-invalid={Boolean(state.errors?.password)}
            aria-describedby={state.errors?.password ? "password-error" : undefined}
            className="mt-2 h-10 bg-card"
          />
          <FieldError id="password-error" errors={state.errors?.password} />
          {!isLogin ? (
            <p className="mt-1.5 text-xs text-muted-foreground">至少 8 个字符，最多 72 个字符。</p>
          ) : null}
        </div>

        {!isLogin ? (
          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              确认密码
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.errors?.confirmPassword)}
              aria-describedby={
                state.errors?.confirmPassword ? "confirm-password-error" : undefined
              }
              className="mt-2 h-10 bg-card"
            />
            <FieldError
              id="confirm-password-error"
              errors={state.errors?.confirmPassword}
            />
          </div>
        ) : null}

        {transportError || state.message ? (
          <div
            className={
              !transportError && state.status === "success"
                ? "flex gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                : "rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive"
            }
            role={transportError || state.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {!transportError && state.status === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : null}
            <span>{transportError ?? state.message}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
          ) : null}
          {pending ? "处理中…" : isLogin ? "登录" : "创建账户"}
          {!pending ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? "还没有账户？" : "已有账户？"}{" "}
        <Link
          href={`${isLogin ? "/signup" : "/login"}?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isLogin ? "邮箱注册" : "返回登录"}
        </Link>
      </p>
    </div>
  );
}

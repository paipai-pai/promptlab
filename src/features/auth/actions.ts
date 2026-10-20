"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getSafeRedirectPath } from "@/features/auth/paths";
import {
  type AuthFormState,
  loginSchema,
  signupSchema,
} from "@/features/auth/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const siteUrlSchema = z.url();

function getSiteUrl() {
  const configuredUrl = siteUrlSchema.safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  return configuredUrl.success ? configuredUrl.data : "http://localhost:3000";
}

function getAuthErrorMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "邮箱或密码不正确，请检查后重试。";
    case "email_not_confirmed":
      return "该邮箱尚未完成验证，请先打开确认邮件。";
    case "signup_disabled":
      return "当前 Supabase 项目未开放邮箱注册。";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "请求过于频繁，请稍后再试。";
    case "weak_password":
      return "密码未满足 Supabase 项目的安全策略。";
    default:
      return fallback;
  }
}

function getRawAuthFields(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = loginSchema.safeParse(getRawAuthFields(formData));

  if (!result.success) {
    return {
      status: "error",
      errors: result.error.flatten().fieldErrors,
      message: "请修正表单中的问题。",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Supabase 尚未配置，请先完成 .env.local 设置。",
    };
  }

  let authError: { code?: string } | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(result.data);
    authError = error;
  } catch {
    return {
      status: "error",
      message: "暂时无法连接认证服务，请检查网络与 Supabase 配置。",
    };
  }

  if (authError) {
    return {
      status: "error",
      message: getAuthErrorMessage(authError.code, "登录失败，请稍后重试。"),
    };
  }

  redirect(getSafeRedirectPath(formData.get("next")?.toString()));
}

export async function signupAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = signupSchema.safeParse(getRawAuthFields(formData));

  if (!result.success) {
    return {
      status: "error",
      errors: result.error.flatten().fieldErrors,
      message: "请修正表单中的问题。",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Supabase 尚未配置，请先完成 .env.local 设置。",
    };
  }

  const nextPath = getSafeRedirectPath(formData.get("next")?.toString());
  const confirmationUrl = new URL("/auth/confirm", getSiteUrl());
  confirmationUrl.searchParams.set("next", nextPath);

  let hasSession = false;
  let authError: { code?: string } | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: confirmationUrl.toString(),
      },
    });
    hasSession = Boolean(data.session);
    authError = error;
  } catch {
    return {
      status: "error",
      message: "暂时无法连接认证服务，请检查网络与 Supabase 配置。",
    };
  }

  if (authError) {
    return {
      status: "error",
      message: getAuthErrorMessage(authError.code, "注册失败，请稍后重试。"),
    };
  }

  if (hasSession) {
    redirect(nextPath);
  }

  return {
    status: "success",
    message: "注册请求已提交。请打开验证邮件完成邮箱确认后再登录。",
  };
}

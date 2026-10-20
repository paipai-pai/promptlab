import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/features/auth/paths";
import { emailOtpTypeSchema } from "@/features/auth/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  const loginUrl = new URL("/login", requestUrl.origin);

  if (!isSupabaseConfigured()) {
    loginUrl.searchParams.set("reason", "configuration");
    return noStoreRedirect(loginUrl);
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = emailOtpTypeSchema.safeParse(requestUrl.searchParams.get("type"));

  try {
    const supabase = await createClient();
    let error: { message: string } | null = null;

    if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code));
    } else if (tokenHash && otpType.success) {
      ({ error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType.data as EmailOtpType,
      }));
    } else {
      loginUrl.searchParams.set("error", "confirmation");
      return noStoreRedirect(loginUrl);
    }

    if (error) {
      loginUrl.searchParams.set("error", "confirmation");
      return noStoreRedirect(loginUrl);
    }

    return noStoreRedirect(new URL(nextPath, requestUrl.origin));
  } catch {
    loginUrl.searchParams.set("error", "confirmation");
    return noStoreRedirect(loginUrl);
  }
}

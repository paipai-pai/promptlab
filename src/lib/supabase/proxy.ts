import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isAuthPage, isProtectedPath } from "@/features/auth/paths";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

function copyAuthResponse(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const header of AUTH_CACHE_HEADERS) {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  }

  return target;
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", nextPath);
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isServerActionRequest = request.headers.has("next-action");

  if (!isSupabaseConfigured()) {
    return isProtectedPath(pathname)
      ? redirectToLogin(request, "configuration")
      : NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseConfig();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }

        for (const [name, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(name, value);
        }
      },
    },
  });

  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && typeof data?.claims?.sub === "string";
  } catch {
    isAuthenticated = false;
  }

  if (
    !isAuthenticated &&
    isProtectedPath(pathname) &&
    !isServerActionRequest
  ) {
    return copyAuthResponse(supabaseResponse, redirectToLogin(request));
  }

  if (isAuthenticated && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/library";
    url.search = "";
    return copyAuthResponse(supabaseResponse, NextResponse.redirect(url));
  }

  return supabaseResponse;
}

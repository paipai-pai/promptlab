const DEFAULT_AUTHENTICATED_PATH = "/library";

const PROTECTED_PATH_PREFIXES = ["/library", "/prompts", "/experiments"] as const;
const AUTH_PAGE_PATHS = ["/login", "/signup"] as const;

export function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPage(pathname: string) {
  return AUTH_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://promptlab.local");

    if (parsed.origin !== "https://promptlab.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

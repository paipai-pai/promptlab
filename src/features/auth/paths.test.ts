import { describe, expect, it } from "vitest";

import {
  getSafeRedirectPath,
  isAuthPage,
  isProtectedPath,
} from "@/features/auth/paths";

describe("auth route helpers", () => {
  it("recognizes current and future private workspace routes", () => {
    expect(isProtectedPath("/library")).toBe(true);
    expect(isProtectedPath("/prompts/new")).toBe(true);
    expect(isProtectedPath("/experiments/123")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("recognizes public auth pages", () => {
    expect(isAuthPage("/login")).toBe(true);
    expect(isAuthPage("/signup")).toBe(true);
    expect(isAuthPage("/auth/confirm")).toBe(false);
  });

  it("accepts local redirects and rejects external or malformed targets", () => {
    expect(getSafeRedirectPath("/prompts/new?from=library")).toBe(
      "/prompts/new?from=library",
    );
    expect(getSafeRedirectPath("https://evil.example/phish")).toBe("/library");
    expect(getSafeRedirectPath("//evil.example/phish")).toBe("/library");
    expect(getSafeRedirectPath("/\\evil.example/phish")).toBe("/library");
  });
});

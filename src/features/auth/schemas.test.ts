import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "@/features/auth/schemas";

describe("auth schemas", () => {
  it("normalizes a valid login email", () => {
    const result = loginSchema.parse({
      email: "Developer@Example.com",
      password: "password",
    });

    expect(result.email).toBe("developer@example.com");
  });

  it("rejects an invalid email and empty password", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.email).toContain("请输入有效的邮箱地址。");
      expect(errors.password).toContain("请输入密码。");
    }
  });

  it("requires a strong-enough matching signup password", () => {
    const tooShort = signupSchema.safeParse({
      email: "developer@example.com",
      password: "short",
      confirmPassword: "short",
    });
    const mismatch = signupSchema.safeParse({
      email: "developer@example.com",
      password: "long-enough-password",
      confirmPassword: "different-password",
    });

    expect(tooShort.success).toBe(false);
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.flatten().fieldErrors.confirmPassword).toContain(
        "两次输入的密码不一致。",
      );
    }
  });
});

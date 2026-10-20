import { describe, expect, it } from "vitest";

import { getLoginNotice } from "@/features/auth/login-notice";

describe("getLoginNotice", () => {
  it("hides a stale configuration warning after Supabase is configured", () => {
    expect(getLoginNotice({ reason: "configuration" }, true)).toBeUndefined();
  });

  it("shows the configuration warning while Supabase is not configured", () => {
    expect(getLoginNotice({ reason: "configuration" }, false)).toEqual({
      tone: "error",
      message: "该私有页面需要登录。请先配置 Supabase 开发项目。",
    });
  });
});

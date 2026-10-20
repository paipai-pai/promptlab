type SearchParams = Record<string, string | string[] | undefined>;

export type LoginNotice = {
  tone: "info" | "error" | "success";
  message: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getLoginNotice(
  params: SearchParams,
  configured: boolean,
): LoginNotice | undefined {
  const reason = firstValue(params.reason);
  const error = firstValue(params.error);
  const status = firstValue(params.status);

  if (!configured && reason === "configuration") {
    return {
      tone: "error",
      message: "该私有页面需要登录。请先配置 Supabase 开发项目。",
    };
  }

  if (error === "confirmation") {
    return {
      tone: "error",
      message: "邮箱验证链接无效或已过期，请重新注册或获取新的验证邮件。",
    };
  }

  if (status === "confirmed") {
    return {
      tone: "success",
      message: "邮箱验证成功。现在可以登录了。",
    };
  }

  if (status === "signed-out") {
    return {
      tone: "info",
      message: "你已安全退出当前会话。",
    };
  }

  return undefined;
}

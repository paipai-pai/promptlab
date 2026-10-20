import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Database } from "../../src/lib/supabase/database.types";

type TestIdentity = {
  client: SupabaseClient<Database>;
  email: string;
  password: string;
  userId: string;
};

type StoredIdentity = Pick<TestIdentity, "email" | "password">;

type StoredIdentities = {
  userA: StoredIdentity;
  userB: StoredIdentity;
};

type MailpitMessage = {
  ID?: string;
  To?: unknown;
};

type MailpitList = {
  messages?: MailpitMessage[];
};

type MailpitDetail = {
  HTML?: string;
  Text?: string;
};

type RetryableAuthResult = {
  error: { name: string } | null;
};

const supabaseUrl = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requireEnvironment(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const mailpitUrl = "http://127.0.0.1:54324";
const identityFile = join(process.cwd(), ".playwright", "test-identities.json");
const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const titlePrefix = `P2-04 ${runId}`;

if (!isLocalUrl(supabaseUrl) || !isLocalUrl(siteUrl)) {
  throw new Error(
    "P2-04 E2E 仅允许连接 localhost/127.0.0.1 的独立开发环境。",
  );
}

function requireEnvironment(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`缺少 E2E 环境变量：${name}`);
  }

  return value;
}

function isLocalUrl(value: string) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function newClient() {
  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function runLocalAuthOperation<Result extends RetryableAuthResult>(
  operation: () => Promise<Result>,
) {
  let result = await operation();

  for (
    let retry = 1;
    result.error?.name === "AuthRetryableFetchError" && retry <= 2;
    retry += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, retry * 250));
    result = await operation();
  }

  return result;
}

function isStoredIdentity(value: unknown): value is StoredIdentity {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.email === "string" &&
    candidate.email.startsWith("promptlab-") &&
    candidate.email.endsWith("@example.com") &&
    typeof candidate.password === "string" &&
    candidate.password.length >= 8
  );
}

function readStoredIdentities(): StoredIdentities | null {
  if (!existsSync(identityFile)) return null;

  try {
    const candidate = JSON.parse(readFileSync(identityFile, "utf8")) as {
      userA?: unknown;
      userB?: unknown;
    };

    return isStoredIdentity(candidate.userA) &&
      isStoredIdentity(candidate.userB)
      ? { userA: candidate.userA, userB: candidate.userB }
      : null;
  } catch {
    return null;
  }
}

async function findConfirmationLink(email: string) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`);

    if (!response.ok) {
      throw new Error(`本地 Mailpit 不可用：HTTP ${response.status}`);
    }

    const mailbox = (await response.json()) as MailpitList;
    const message = mailbox.messages?.find((candidate) =>
      JSON.stringify(candidate.To).includes(email),
    );

    if (message?.ID) {
      const detailResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${encodeURIComponent(message.ID)}`,
      );
      const detail = (await detailResponse.json()) as MailpitDetail;
      const body = `${detail.HTML ?? ""}\n${detail.Text ?? ""}`.replaceAll(
        "&amp;",
        "&",
      );
      const confirmationLink = body
        .match(/https?:\/\/[^\s"'<>]+/g)
        ?.find((link) => link.includes("/auth/v1/verify"));

      if (confirmationLink) {
        return confirmationLink;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`未收到 ${email} 的本地确认邮件。`);
}

async function createConfirmedIdentity(label: string): Promise<TestIdentity> {
  const email = `promptlab-${label}-${runId}@example.com`;
  const password = `E2e-${crypto.randomUUID()}-Aa1!`;
  const client = newClient();
  const { error: signupError } = await runLocalAuthOperation(() =>
    client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/library`,
      },
    }),
  );

  expect(signupError, "普通用户注册应成功").toBeNull();

  const confirmationLink = await findConfirmationLink(email);
  const confirmationResponse = await fetch(confirmationLink, {
    redirect: "manual",
  });

  expect(
    [200, 302, 303].includes(confirmationResponse.status),
    "邮箱确认链接应被本地 Supabase 接受",
  ).toBe(true);

  const { data, error: loginError } = await runLocalAuthOperation(() =>
    client.auth.signInWithPassword({ email, password }),
  );

  expect(loginError, "确认后的普通用户应能登录").toBeNull();
  expect(data.user?.id).toBeTruthy();

  return {
    client,
    email,
    password,
    userId: data.user!.id,
  };
}

async function signInIdentity(
  storedIdentity: StoredIdentity,
): Promise<TestIdentity | null> {
  const client = newClient();
  const { data, error } = await runLocalAuthOperation(() =>
    client.auth.signInWithPassword(storedIdentity),
  );

  if (error || !data.user) return null;

  return {
    client,
    ...storedIdentity,
    userId: data.user.id,
  };
}

async function loadOrCreateIdentities() {
  const stored = readStoredIdentities();

  if (stored) {
    const [storedUserA, storedUserB] = await Promise.all([
      signInIdentity(stored.userA),
      signInIdentity(stored.userB),
    ]);

    if (storedUserA && storedUserB) {
      return { userA: storedUserA, userB: storedUserB };
    }
  }

  const userA = await createConfirmedIdentity("a");
  const userB = await createConfirmedIdentity("b");
  mkdirSync(dirname(identityFile), { recursive: true });
  writeFileSync(
    identityFile,
    JSON.stringify(
      {
        userA: { email: userA.email, password: userA.password },
        userB: { email: userB.email, password: userB.password },
      } satisfies StoredIdentities,
      null,
      2,
    ),
    { encoding: "utf8", mode: 0o600 },
  );

  return { userA, userB };
}

async function login(page: Page, identity: TestIdentity) {
  await page.goto("/login?next=/library");
  await page.getByLabel("邮箱").fill(identity.email);
  await page.getByLabel("密码").fill(identity.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/library(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Prompt 资产库" }),
  ).toBeVisible();
}

async function createPrompt(
  client: SupabaseClient<Database>,
  title: string,
  category = "coding",
  content = "正文 {{topic}}",
) {
  const { data, error } = await client.rpc(
    "create_prompt_with_initial_version",
    {
      p_title: title,
      p_description: `由 ${title} 创建的 P2-04 隔离测试数据`,
      p_category: category,
      p_content: content,
    },
  );

  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  return data![0];
}

async function cleanup(identity: TestIdentity | undefined) {
  if (!identity) return;

  const { error } = await identity.client
    .from("prompts")
    .delete()
    .like("title", `${titlePrefix}%`);

  expect(error).toBeNull();
  await identity.client.auth.signOut({ scope: "local" });
}

test.describe.serial("PromptLab Phase 2 集成验收", () => {
  let userA: TestIdentity;
  let userB: TestIdentity;
  let protectedPromptId: string;
  let protectedVersionId: string;
  let uiPromptId: string;
  let uiPromptTitle: string;

  test.beforeAll(async () => {
    ({ userA, userB } = await loadOrCreateIdentities());
  });

  test.afterAll(async () => {
    await cleanup(userA);
    await cleanup(userB);
  });

  test("匿名与跨用户访问受 RLS 和函数权限保护", async () => {
    const anonymous = newClient();
    const { data: anonymousRows, error: anonymousReadError } = await anonymous
      .from("prompts")
      .select("id");
    expect(anonymousRows).toBeNull();
    expect(anonymousReadError?.code).toBe("42501");

    const { error: anonymousCreateError } = await anonymous.rpc(
      "create_prompt_with_initial_version",
      {
        p_title: `${titlePrefix} anonymous`,
        p_description: "",
        p_category: "coding",
        p_content: "不能创建",
      },
    );
    expect(anonymousCreateError).not.toBeNull();

    const created = await createPrompt(
      userA.client,
      `${titlePrefix} owner security`,
    );
    protectedPromptId = created.prompt_id;
    protectedVersionId = created.prompt_version_id;

    const { data: versions } = await userA.client
      .from("prompt_versions")
      .select("id,version_number")
      .eq("prompt_id", protectedPromptId);
    expect(versions).toEqual([
      { id: protectedVersionId, version_number: 1 },
    ]);

    const { data: foreignPrompt } = await userB.client
      .from("prompts")
      .select("id")
      .eq("id", protectedPromptId);
    expect(foreignPrompt).toEqual([]);

    const { data: foreignVersions } = await userB.client
      .from("prompt_versions")
      .select("id")
      .eq("prompt_id", protectedPromptId);
    expect(foreignVersions).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } =
      await userB.client
        .from("prompts")
        .update({ title: `${titlePrefix} forged update` })
        .eq("id", protectedPromptId)
        .select("id");
    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } =
      await userB.client
        .from("prompts")
        .delete()
        .eq("id", protectedPromptId)
        .select("id");
    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: ownerForgeryError } = await userA.client
      .from("prompts")
      .update({ user_id: userB.userId })
      .eq("id", protectedPromptId);
    expect(ownerForgeryError).not.toBeNull();

    const { error: versionForgeryError } = await userB.client.rpc(
      "append_prompt_version",
      {
        p_prompt_id: protectedPromptId,
        p_content: "伪造版本",
      },
    );
    expect(versionForgeryError).not.toBeNull();

    const { error: experimentForgeryError } = await userB.client
      .from("experiments")
      .insert({
        user_id: userB.userId,
        prompt_version_id: protectedVersionId,
        status: "completed",
        model_name: "security-test",
        rendered_prompt: "伪造快照",
        output_text: "不应写入",
      });
    expect(experimentForgeryError).not.toBeNull();
  });

  test("未登录跳转、登录、退出和退出后保护均正确", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);

    await login(page, userA);
    await page.getByRole("button", { name: "退出登录" }).click();
    await expect(page).toHaveURL(/\/login\?status=signed-out/);

    await page.goto("/library");
    await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);
  });

  test("创建、v1、刷新、元数据、编辑器和失效会话形成完整链路", async ({
    page,
  }) => {
    await login(page, userA);
    await page.locator('a[href="/prompts/new"]').first().click();

    await page.getByLabel("名称").fill("   ");
    await page.getByLabel("描述").fill("保留的描述");
    await page.getByLabel("Prompt 正文").fill("保留的正文");
    await page.getByRole("button", { name: "创建 Prompt 与 v1" }).click();
    await expect(
      page.getByText("请修正表单中的问题后再创建。", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("描述")).toHaveValue("保留的描述");
    await expect(page.getByLabel("Prompt 正文")).toHaveValue("保留的正文");

    uiPromptTitle = `${titlePrefix} UI lifecycle`;
    await page.getByLabel("名称").fill(uiPromptTitle);
    await page.getByLabel("描述").fill("创建后应保留到刷新");
    await page.getByLabel("分类", { exact: true }).selectOption("coding");
    await page
      .getByLabel("Prompt 正文")
      .fill("请为 {{topic}} 输出摘要，并再次检查 {{topic}}。");
    await page.getByRole("button", { name: "创建 Prompt 与 v1" }).dblclick();
    await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+$/);
    uiPromptId = new URL(page.url()).pathname.split("/").at(-1)!;

    const { data: createdRows } = await userA.client
      .from("prompts")
      .select("id,title,prompt_versions(id,version_number,content)")
      .eq("title", uiPromptTitle);
    expect(createdRows).toHaveLength(1);
    expect(createdRows![0].id).toBe(uiPromptId);
    expect(createdRows![0].prompt_versions).toHaveLength(1);
    expect(createdRows![0].prompt_versions[0].version_number).toBe(1);

    await page.reload();
    await expect(page.getByRole("heading", { name: uiPromptTitle })).toBeVisible();
    await expect(page.getByLabel("正文草稿")).toContainText("{{topic}}");

    const updatedTitle = `${titlePrefix} UI updated`;
    await page.getByLabel("名称").fill(updatedTitle);
    await page.getByLabel("描述").fill("元数据已更新");
    await page.getByLabel("分类", { exact: true }).selectOption("product");
    await page.getByRole("button", { name: "保存元数据" }).click();
    await expect(
      page.getByText("元数据已保存；正文版本没有变化。", { exact: true }),
    ).toBeVisible();
    uiPromptTitle = updatedTitle;

    const { data: afterUpdate } = await userA.client
      .from("prompts")
      .select("title,description,category,prompt_versions(id)")
      .eq("id", uiPromptId)
      .single();
    expect(afterUpdate).toMatchObject({
      title: updatedTitle,
      description: "元数据已更新",
      category: "product",
    });
    expect(afterUpdate!.prompt_versions).toHaveLength(1);

    await page
      .getByLabel("正文草稿")
      .fill("Hello {{name}} / {{name}} / {{2bad}}");
    await expect(page.getByText("有未保存更改")).toBeVisible();
    await expect(page.getByLabel("变量 name")).toBeVisible();
    await expect(page.getByLabel("变量 2bad")).toHaveCount(0);
    await expect(page.getByText(/缺少 1 个变量：\{\{name\}\}/)).toBeVisible();
    await page.getByLabel("变量 name").fill("PromptLab");
    await expect(page.getByTestId("rendered-prompt")).toContainText(
      "Hello PromptLab / PromptLab / {{2bad}}",
    );
    await page.getByRole("button", { name: "复制预览" }).click();
    await expect(page.getByText("已复制当前预览")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Hello PromptLab / PromptLab / {{2bad}}",
    );

    const wasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    await page.getByRole("button", { name: "切换明暗主题" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark")),
      )
      .toBe(!wasDark);
    await page.reload();
    expect(
      await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      ),
    ).toBe(!wasDark);

    await page.context().clearCookies();
    await page.getByLabel("名称").fill(`${updatedTitle} unsaved`);
    await page.getByRole("button", { name: "保存元数据" }).click();
    await expect(
      page.getByText("登录状态已失效。请重新登录后再次提交。", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("名称")).toHaveValue(`${updatedTitle} unsaved`);

    const { data: unchanged } = await userA.client
      .from("prompts")
      .select("title")
      .eq("id", uiPromptId)
      .single();
    expect(unchanged?.title).toBe(updatedTitle);
  });

  test("Server Action 网络中断时保留输入且不写入数据库", async ({ page }) => {
    const originalTitle = `${titlePrefix} network original`;
    const interruptedTitle = `${titlePrefix} network unsaved`;
    const created = await createPrompt(userA.client, originalTitle);

    await login(page, userA);
    await page.goto(`/prompts/${created.prompt_id}`);
    await page.getByLabel("名称").fill(interruptedTitle);

    let requestAborted = false;
    await page.route(`**/prompts/${created.prompt_id}`, async (route) => {
      const request = route.request();

      if (
        !requestAborted &&
        request.method() === "POST" &&
        request.headers()["next-action"]
      ) {
        requestAborted = true;
        await route.abort("internetdisconnected");
        return;
      }

      await route.continue();
    });

    await page.getByRole("button", { name: "保存元数据" }).click();
    await expect(
      page.getByText("网络连接中断，请检查连接后重试。未保存的输入仍保留在当前页面。", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("名称")).toHaveValue(interruptedTitle);
    expect(requestAborted).toBe(true);

    const { data: unchanged } = await userA.client
      .from("prompts")
      .select("title")
      .eq("id", created.prompt_id)
      .single();
    expect(unchanged?.title).toBe(originalTitle);
  });

  test("搜索、分类组合、分页、跨用户详情和空状态正确", async ({ page }) => {
    for (let index = 0; index < 13; index += 1) {
      await createPrompt(
        userA.client,
        `${titlePrefix} page ${index.toString().padStart(2, "0")}`,
        index % 2 === 0 ? "product" : "research",
        index === 3 ? "唯一正文搜索标记" : `分页正文 ${index}`,
      );
    }

    await login(page, userA);
    await expect(page.getByLabel("Prompt 分页")).toBeVisible();
    await page.locator('input[aria-label="搜索 Prompt"]:visible').fill("唯一正文搜索标记");
    await expect(page).toHaveURL(/q=/);
    await expect(
      page.getByRole("link", {
        name: `${titlePrefix} page 03`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("共 1 条")).toBeVisible();

    await page
      .getByRole("button", { name: "产品工作", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/category=product/);
    await expect(page.getByText("没有匹配的 Prompt")).toBeVisible();
    await page.getByRole("button", { name: "清除筛选" }).click();
    await expect(page).toHaveURL(/\/library$/);

    await page.goto(`/prompts/${protectedPromptId}`);
    await expect(page.getByRole("heading", { name: /owner security/ })).toBeVisible();

    await page.context().clearCookies();
    await login(page, userB);
    await page.goto(`/prompts/${protectedPromptId}`);
    await expect(
      page.getByRole("heading", { name: "找不到该 Prompt" }),
    ).toBeVisible();

    await page.context().clearCookies();
    await login(page, userB);
    await expect(page.getByText("还没有 Prompt")).toBeVisible();
  });

  test("删除确认会级联清理版本，移动布局无严重横向溢出", async ({ page }) => {
    await login(page, userA);
    await page.goto(`/prompts/${uiPromptId}`);
    await page.getByRole("button", { name: "删除 Prompt" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "确认删除" }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(
      page.getByRole("link", { name: uiPromptTitle, exact: true }),
    ).toHaveCount(0);

    const { data: deletedPrompt } = await userA.client
      .from("prompts")
      .select("id")
      .eq("id", uiPromptId);
    const { data: deletedVersions } = await userA.client
      .from("prompt_versions")
      .select("id")
      .eq("prompt_id", uiPromptId);
    expect(deletedPrompt).toEqual([]);
    expect(deletedVersions).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "Prompt 资产库" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});

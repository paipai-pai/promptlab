import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PromptDraftEditor } from "@/features/prompts/components/prompt-draft-editor";

const clipboard = vi.hoisted(() => ({
  writeText: vi.fn(),
}));

describe("PromptDraftEditor", () => {
  beforeEach(() => {
    clipboard.writeText.mockReset();
    clipboard.writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
  });

  it("renders one input per unique variable and updates the preview", () => {
    render(
      <PromptDraftEditor content="为 {{audience}} 写 {{topic}}，适合 {{audience}}。" />,
    );

    expect(screen.getAllByRole("textbox", { name: /变量/ })).toHaveLength(2);
    expect(screen.getByText(/缺少 2 个变量/)).toBeDefined();

    fireEvent.change(screen.getByRole("textbox", { name: "变量 audience" }), {
      target: { value: "开发者" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "变量 topic" }), {
      target: { value: "发布说明" },
    });

    expect(screen.getByTestId("rendered-prompt").textContent).toContain(
      "为 开发者 写 发布说明，适合 开发者。",
    );
    expect(screen.getByText("所有变量均已填写")).toBeDefined();
  });

  it("tracks unsaved changes and returns to the saved state", () => {
    render(<PromptDraftEditor content="正式正文" />);

    const editor = screen.getByRole("textbox", { name: "正文草稿" });
    expect(screen.getByText("与正式版本一致")).toBeDefined();

    fireEvent.change(editor, { target: { value: "本地草稿" } });
    expect(screen.getByText("有未保存更改")).toBeDefined();

    fireEvent.change(editor, { target: { value: "正式正文" } });
    expect(screen.getByText("与正式版本一致")).toBeDefined();
  });

  it("copies the current rendered preview", async () => {
    render(<PromptDraftEditor content="Hello {{name}}" />);

    fireEvent.change(screen.getByRole("textbox", { name: "变量 name" }), {
      target: { value: "PromptLab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "复制预览" }));

    await waitFor(() => {
      expect(clipboard.writeText).toHaveBeenCalledWith("Hello PromptLab");
      expect(screen.getByText("已复制当前预览")).toBeDefined();
    });
  });

  it("reports clipboard failures without claiming success", async () => {
    clipboard.writeText.mockRejectedValue(new Error("permission denied"));
    render(<PromptDraftEditor content="可复制正文" />);

    fireEvent.click(screen.getByRole("button", { name: "复制预览" }));

    await waitFor(() => {
      expect(screen.getByText("复制失败，请检查浏览器权限后重试")).toBeDefined();
    });
    expect(screen.queryByText("已复制当前预览")).toBeNull();
  });

  it("disables copying when the rendered preview is empty", () => {
    render(<PromptDraftEditor content="" />);

    expect(
      screen.getByRole("button", { name: "复制预览" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});

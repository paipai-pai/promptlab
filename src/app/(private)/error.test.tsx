import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PrivateAreaError from "@/app/(private)/error";

describe("PrivateAreaError", () => {
  it("shows a safe recovery message and retries through the error boundary", () => {
    const reset = vi.fn();

    render(<PrivateAreaError reset={reset} />);

    expect(screen.getByText("暂时无法加载工作区")).toBeDefined();
    expect(screen.getByText(/登录状态已经过期/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

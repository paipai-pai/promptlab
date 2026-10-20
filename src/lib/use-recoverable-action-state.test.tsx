import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRecoverableActionState } from "@/lib/use-recoverable-action-state";

type State = { status: "idle" | "success" };

const INITIAL_STATE: State = { status: "idle" };

describe("useRecoverableActionState", () => {
  it("turns a rejected transport request into recoverable UI state", async () => {
    const action = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() =>
      useRecoverableActionState(action, INITIAL_STATE),
    );

    act(() => result.current.formAction(new FormData()));

    await waitFor(() => {
      expect(result.current.transportError).toContain("网络连接中断");
    });
    expect(result.current.state).toEqual(INITIAL_STATE);
  });

  it("updates state after a successful action", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ status: "success" } satisfies State);
    const { result } = renderHook(() =>
      useRecoverableActionState(action, INITIAL_STATE),
    );

    act(() => result.current.formAction(new FormData()));

    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });
    expect(result.current.transportError).toBeUndefined();
  });
});

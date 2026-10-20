"use client";

import { useCallback, useRef, useState, useTransition } from "react";

const DEFAULT_TRANSPORT_ERROR =
  "网络连接中断，请检查连接后重试。未保存的输入仍保留在当前页面。";

type ServerAction<State> = (
  previousState: State,
  formData: FormData,
) => Promise<State>;

export function useRecoverableActionState<State>(
  action: ServerAction<State>,
  initialState: State,
  transportErrorMessage = DEFAULT_TRANSPORT_ERROR,
) {
  const [state, setState] = useState(initialState);
  const [transportError, setTransportError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const formAction = useCallback(
    (formData: FormData) => {
      if (inFlight.current) return;

      inFlight.current = true;
      setTransportError(undefined);

      startTransition(async () => {
        try {
          setState(await action(state, formData));
        } catch {
          setTransportError(transportErrorMessage);
        } finally {
          inFlight.current = false;
        }
      });
    },
    [action, state, transportErrorMessage],
  );

  return { state, formAction, pending, transportError };
}

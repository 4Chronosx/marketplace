"use client";

import { useEffect, useRef, useState } from "react";
import { ApiRequestError } from "./api-client";

type Settled<T> = { key: string; data?: T; error?: ApiRequestError };

/**
 * Loads data whenever `key` changes (pass null to skip loading).
 *
 * Loading is derived by comparing the settled result's key with the current
 * key, so nothing is set synchronously inside the effect. Responses for an
 * outdated key are ignored and in-flight requests are aborted.
 */
export function useApiResource<T>(
  key: string | null,
  loader: (signal: AbortSignal) => Promise<T>,
) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // Always call the latest loader without re-running the effect on every render.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const requestKey = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();

    loaderRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key: requestKey, data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          key: requestKey,
          error:
            error instanceof ApiRequestError
              ? error
              : new ApiRequestError(0, "Something went wrong. Please try again."),
        });
      },
    );

    return () => controller.abort();
  }, [requestKey]);

  const current =
    settled !== null && settled.key === requestKey ? settled : null;

  return {
    data: current?.data,
    error: current?.error,
    loading: requestKey !== null && current === null,
    retry: () => setAttempt((n) => n + 1),
  };
}

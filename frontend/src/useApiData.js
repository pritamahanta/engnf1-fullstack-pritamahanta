import { useEffect, useState } from "react";
import { useAuth } from "./auth.jsx";

export function useApiData(path, revision = 0, delay = 0) {
  const { request } = useAuth();
  const [state, setState] = useState({ path: null, data: null, error: "", loading: false });

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState((previous) => ({
      path, data: previous.path === path ? previous.data : null, error: "", loading: true,
    }));
    const timer = setTimeout(async () => {
      try {
        const data = await request(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ path, data, error: "", loading: false });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((previous) => ({ ...previous, error: error.message, loading: false }));
        }
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, revision, delay, request]);

  function replaceData(update) {
    setState((previous) => previous.path === path && previous.data
      ? { ...previous, data: update(previous.data) }
      : previous);
  }

  const current = state.path === path ? state : { data: null, error: "", loading: Boolean(path) };
  return { ...current, replaceData };
}

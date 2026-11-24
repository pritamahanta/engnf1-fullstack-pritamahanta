import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api.js";

const TOKEN_KEY = "triagesync.token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    return token ? { token, user: null } : null;
  });
  const [restoreError, setRestoreError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const token = session?.token;
  const user = session?.user;

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setRestoreError("");
  }, []);

  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();

    apiRequest("/auth/me", { token, signal: controller.signal })
      .then(({ user: restoredUser }) => {
        if (!controller.signal.aborted) setSession({ token, user: restoredUser });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401) signOut();
        else setRestoreError(error.message);
      });
    return () => controller.abort();
  }, [token, user, attempt, signOut]);

  async function signIn(credentials) {
    const next = await apiRequest("/auth/login", { method: "POST", body: credentials });
    sessionStorage.setItem(TOKEN_KEY, next.token);
    setSession(next);
  }

  function retryRestore() {
    setRestoreError("");
    setAttempt((previous) => previous + 1);
  }

  const request = useCallback(async (path, options) => {
    try {
      return await apiRequest(path, { ...options, token });
    } catch (error) {
      if (error.status === 401 && token && sessionStorage.getItem(TOKEN_KEY) === token) {
        signOut();
      }
      throw error;
    }
  }, [token, signOut]);

  const value = { user, restoring: Boolean(token && !user), restoreError, retryRestore, signIn, signOut, request };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

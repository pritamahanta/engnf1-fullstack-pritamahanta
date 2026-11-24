import { useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "./api.js";
import { useAuth } from "./auth.jsx";

function AuthPage({ registration = false }) {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    const input = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (registration) {
        await apiRequest("/auth/register", { method: "POST", body: input });
        navigate("/login", { replace: true, state: { notice: "Account created. Sign in to continue." } });
      } else {
        await signIn(input);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  const title = registration ? "Create an account" : "Sign in";
  return (
    <main className="auth-page">
      <section className="card auth-card" aria-labelledby="auth-title">
        <p className="brand">TriageSync</p>
        <h1 id="auth-title">{title}</h1>
        {location.state?.notice && <p className="notice" role="status">{location.state.notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={submit}>
          {registration && <label>Name<input name="name" autoComplete="name" required minLength={2} maxLength={50} /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={registration ? "new-password" : "current-password"}
              required
              minLength={registration ? 8 : undefined}
              maxLength={registration ? 64 : 200}
              aria-describedby={registration ? "password-hint" : undefined}
            />
            {registration && <small id="password-hint">8–64 characters with a letter and a digit.</small>}
          </label>
          <button disabled={pending}>{pending ? "Please wait…" : title}</button>
        </form>
        <p className="auth-switch">
          {registration ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={registration ? "/login" : "/register"}>{registration ? "Sign in" : "Register"}</Link>
        </p>
      </section>
    </main>
  );
}

function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function Shell() {
  const { user, signOut } = useAuth();
  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">TriageSync</Link>
        <div className="session-tools">
          <span>{user.name}</span>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="app-main"><Outlet /></main>
    </>
  );
}

function Account() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h1>Account</h1>
      <dl>
        <dt>Name</dt><dd>{user.name}</dd>
        <dt>Email</dt><dd>{user.email}</dd>
        <dt>Role</dt><dd>{user.role}</dd>
      </dl>
    </section>
  );
}

export default function App() {
  const { restoring, restoreError, retryRestore, signOut } = useAuth();
  if (restoring) {
    return (
      <main className="auth-page">
        <section className="card auth-card">
          <p className="brand">TriageSync</p>
          {restoreError ? (
            <>
              <h1>Session unavailable</h1>
              <p className="error" role="alert">{restoreError}</p>
              <div className="session-tools">
                <button onClick={retryRestore}>Retry</button>
                <button className="secondary" onClick={signOut}>Sign out</button>
              </div>
            </>
          ) : <p role="status">Checking your session…</p>}
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/register" element={<AuthPage key="register" registration />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

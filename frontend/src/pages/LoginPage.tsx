import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, fetchMe } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { TfsMark } from "../components/TfsMark";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "admin@company.com", password: "Admin@123" },
  { role: "Sales Manager", email: "manager@company.com", password: "Manager@123" },
  { role: "Sales Representative", email: "rep@company.com", password: "Rep@123" },
  { role: "Executive", email: "exec@company.com", password: "Exec@123" },
  { role: "Read-Only Auditor", email: "auditor@company.com", password: "Auditor@123" },
];

export function LoginPage() {
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      useAuthStore.getState().setSession(result.access_token, {
        id: result.user_id,
        name: result.name,
        email,
        role: result.role as never,
      });
      const me = await fetchMe();
      setSession(result.access_token, me);
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ background: "var(--bg)" }}>
      {/* Static dot grid, faded toward the edges — no animation, no blur. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--border-strong) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 45%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 45%, #000 20%, transparent 75%)",
        }}
      />

      <main className="page-enter relative w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <TfsMark size={40} />
          <h1 className="mt-5 text-xl font-semibold" style={{ letterSpacing: "-0.03em", color: "var(--ink)" }}>
            Log in to Lead Intelligence
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
            Telangana Food Suncons · AI-powered lead management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink-secondary)" }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field w-full"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--ink-secondary)" }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field w-full"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-md px-3 py-2 text-[13px]"
              style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 30%, var(--border))" }}
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary h-9 w-full">
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="mt-4 rounded-[var(--radius-card)] border border-dashed p-4" style={{ borderColor: "var(--border-strong)" }}>
          <p className="eyebrow mb-2.5">Demo accounts</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email}>
                <button
                  type="button"
                  className="menu-item justify-between"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                >
                  <span>{acc.role}</span>
                  <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>{acc.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
          &copy; {new Date().getFullYear()} Telangana Food Suncons
        </p>
      </main>
    </div>
  );
}

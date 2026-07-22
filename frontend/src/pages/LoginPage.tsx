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
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-5/12 xl:w-[42%] flex-col justify-between p-10"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <TfsMark />
          <div>
            <p
              className="text-[14px] font-semibold leading-none"
              style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--sidebar-ink)" }}
            >
              Telangana Food Suncons
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--sidebar-ink-muted)" }}>
              Lead Intelligence Platform
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative">
          {/* Soft amber glow for depth, echoing the AI accent used across the dashboard —
              this panel previously had nothing tying it to the product's "AI" identity. */}
          <div
            className="pointer-events-none absolute -left-12 -top-20 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)" }}
          />

          <span
            className="relative mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-semibold uppercase"
            style={{
              background: "var(--ai-soft)",
              border: "1px solid var(--ai-border)",
              color: "var(--ai-bright)",
              letterSpacing: "0.08em",
            }}
          >
            ✦ AI-Powered
          </span>

          <p
            className="relative leading-[1.12]"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "clamp(1.625rem, 2.5vw, 2.375rem)",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              color: "#ffffff",
            }}
          >
            Every lead.<br />Every signal.<br />One platform.
          </p>
          <p
            className="relative mt-5 text-sm leading-[1.75]"
            style={{ color: "var(--sidebar-ink-muted)", maxWidth: "28ch" }}
          >
            AI-powered lead management for the TFS sales team. From first touch to closed deal — with Claude AI at every step.
          </p>
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: "var(--sidebar-ink-muted)" }}>
          &copy; {new Date().getFullYear()} Telangana Food Suncons. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12"
        style={{ background: "var(--bg)" }}
      >
        {/* Soft color blobs so the glass panels have something to refract */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 70%)" }}
        />

        {/* Mobile logo */}
        <div className="relative mb-8 flex items-center gap-2.5 lg:hidden">
          <TfsMark size={32} />
          <p
            className="text-[15px] font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--ink)" }}
          >
            Telangana Food Suncons
          </p>
        </div>

        <div className="relative w-full max-w-[360px]">
          <div className="mb-7">
            <h1
              className="leading-none"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "1.625rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
              }}
            >
              Sign in
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
              Enter your credentials to access the platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-4">
            <div>
              <label className="eyebrow mb-2 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field w-full px-3.5 py-2.5"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="eyebrow mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field w-full px-3.5 py-2.5"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div
                className="rounded-lg px-3.5 py-2.5 text-sm"
                style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-1"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="glass-panel mt-4 p-5">
            <p className="eyebrow mb-3">Demo accounts</p>
            <ul className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--ink-secondary)" }}>{acc.role}</span>
                  <button
                    type="button"
                    className="font-medium transition-colors"
                    style={{ color: "var(--accent)" }}
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                    }}
                  >
                    {acc.email}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import { NAV_ITEMS } from "../components/navConfig";
import { IconGrid, IconClose, IconSun, IconMoon } from "../components/icons";
import { TfsMark } from "../components/TfsMark";

export function TopBarLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const overflowItems = NAV_ITEMS.filter((item) => item.path !== "/" && item.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <TfsMark size={32} transparent={theme === "dark"} />
            <span className="page-title text-[19px]" style={{ letterSpacing: "-0.02em" }}>
              Dashboard
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="glass-icon-btn"
              aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
            >
              {theme === "dark" ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
            </button>

            <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="glass-icon-btn"
              aria-label="Open menu"
            >
              {menuOpen ? <IconClose width={16} height={16} /> : <IconGrid width={16} height={16} />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="glass-panel absolute right-0 top-12 z-40 w-64 overflow-hidden p-2">
                  <nav className="space-y-0.5">
                    {overflowItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
                          style={({ isActive }) => ({
                            background: isActive ? "var(--accent-soft)" : "transparent",
                            color: isActive ? "var(--accent)" : "var(--ink-secondary)",
                          })}
                        >
                          <Icon width={15} height={15} style={{ flexShrink: 0 }} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="mt-2 border-t px-3 pt-3" style={{ borderColor: "var(--border)" }}>
                    <p className="truncate text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>{user.name}</p>
                    <p className="mt-0.5 truncate text-[10.5px] capitalize" style={{ color: "var(--ink-tertiary)" }}>
                      {user.role.replace(/_/g, " ")}
                    </p>
                    <button onClick={handleLogout} className="btn-secondary mt-2 w-full px-3 py-1.5 text-xs">
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}

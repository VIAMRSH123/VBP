import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../hooks/useTheme";
import { NAV_ITEMS } from "../components/navConfig";
import { CommandPalette, type Command } from "../components/CommandPalette";
import { IconBell, IconHome, IconLogOut, IconMoon, IconSearch, IconSettings, IconSun } from "../components/icons";
import { TfsMark } from "../components/TfsMark";

const IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const SHORTCUT_LABEL = IS_APPLE ? "⌘" : "Ctrl";

export function TopBarLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenuOpen(false);
        setPaletteOpen((open) => !open);
      } else if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const role = user?.role;
  const navItems = useMemo(
    () => [
      { label: "Dashboard", path: "/", icon: IconHome },
      ...NAV_ITEMS.filter((item) => role && item.roles.includes(role)),
    ],
    [role],
  );

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const commands = useMemo<Command[]>(
    () => [
      ...navItems.map((item) => ({
        id: `nav-${item.path}`,
        label: item.label,
        group: "Navigate",
        icon: item.icon,
        keywords: "go open page",
        run: () => navigate(item.path),
      })),
      {
        id: "toggle-theme",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        icon: theme === "dark" ? IconSun : IconMoon,
        keywords: "appearance mode night day",
        run: toggleTheme,
      },
      {
        id: "logout",
        label: "Log out",
        group: "Actions",
        icon: IconLogOut,
        keywords: "sign out",
        run: () => {
          logout();
          navigate("/login");
        },
      },
    ],
    [navItems, theme, toggleTheme, navigate, logout],
  );

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
        style={{ background: "var(--ink)", color: "var(--bg)" }}
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5 rounded-md" aria-label="Dashboard home">
            <TfsMark size={26} />
            <span aria-hidden="true" className="hidden text-lg font-light sm:inline" style={{ color: "var(--border-strong)" }}>/</span>
            <span className="hidden text-[13px] font-semibold sm:inline" style={{ letterSpacing: "-0.01em" }}>
              Lead Intelligence
            </span>
          </NavLink>

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="input-field hidden w-full max-w-[360px] cursor-pointer items-center gap-2 text-left md:flex"
              style={{ color: "var(--ink-tertiary)" }}
              aria-label="Open command palette"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <IconSearch width={14} height={14} />
              <span className="flex-1">Search…</span>
              <span className="kbd">{SHORTCUT_LABEL}</span>
              <span className="kbd -ml-1">K</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" className="icon-btn md:hidden" aria-label="Search" onClick={() => setPaletteOpen(true)}>
              <IconSearch width={16} height={16} />
            </button>
            <NavLink to="/notifications" className="icon-btn" aria-label="Notifications">
              <IconBell width={16} height={16} />
            </NavLink>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
            </button>

            <div className="relative ml-1.5">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border text-[11px] font-semibold transition-colors"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-strong)", color: "var(--ink)" }}
              >
                {initials}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                  <div role="menu" className="popover absolute right-0 top-10 z-40 w-60 p-1.5">
                    <div className="px-2.5 pb-2.5 pt-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <p className="truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>{user.name}</p>
                      <p className="mt-0.5 truncate text-xs capitalize" style={{ color: "var(--ink-tertiary)" }}>
                        {user.role.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="pt-1.5">
                      {user.role === "administrator" && (
                        <NavLink to="/admin" role="menuitem" className="menu-item" onClick={() => setMenuOpen(false)}>
                          <IconSettings width={15} height={15} />
                          Settings
                        </NavLink>
                      )}
                      <button type="button" role="menuitem" className="menu-item" onClick={handleLogout}>
                        <IconLogOut width={15} height={15} />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <nav aria-label="Primary" className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="tab-list" style={{ borderBottom: 0, marginLeft: "-0.625rem" }}>
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} className="nav-tab">
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        queryCommand={(query) => ({
          id: "search-leads",
          label: `Search leads for “${query}”`,
          group: "Leads",
          icon: IconSearch,
          run: () => navigate(`/leads?q=${encodeURIComponent(query)}`),
        })}
      />
    </div>
  );
}

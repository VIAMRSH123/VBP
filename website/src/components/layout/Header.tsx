"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        isScrolled || isMenuOpen
          ? "border-b border-sand/80 bg-ivory/90 backdrop-blur-sm"
          : "border-b border-transparent"
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>

      <div className="shell flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="relative z-10 flex items-center" aria-label="TFS Suncons — home">
          <Image
            src="/brand/tfs-logo-light.png"
            alt="TFS Suncons"
            width={496}
            height={296}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-10 md:flex">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`t-meta link-underline py-1 transition-colors ${
                  isActive ? "text-forest" : "text-muted hover:text-forest"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/contact#enquiry"
            data-cursor-label="ENQUIRE"
            className="t-meta border border-forest px-5 py-2.5 text-forest transition-colors duration-200 hover:bg-forest hover:text-ivory"
          >
            Trade enquiry
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          className="relative z-10 -mr-2 flex h-11 w-11 items-center justify-center md:hidden"
        >
          <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="flex w-6 flex-col gap-[5px]">
            <span
              className={`block h-px w-full bg-charcoal transition-transform duration-300 ${
                isMenuOpen ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-px w-full bg-charcoal transition-opacity duration-200 ${
                isMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-px w-full bg-charcoal transition-transform duration-300 ${
                isMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!isMenuOpen}
        className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto border-t border-sand bg-ivory md:hidden"
      >
        <nav aria-label="Mobile navigation" className="shell flex flex-col py-6">
          {[...navigation, { href: "/contact#enquiry", label: "Trade enquiry" }].map(
            (item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="t-display border-b border-sand py-5 text-forest last:border-0"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

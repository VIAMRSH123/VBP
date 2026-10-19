"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import {
  gsap,
  isTouchDevice,
  reducedMotionNow,
  useIsomorphicLayoutEffect,
} from "@/lib/motion";

type MagneticButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "solid" | "outline" | "ghost";
  className?: string;
  /** Pull radius in px; the hit area itself never moves. */
  strength?: number;
  disabled?: boolean;
  cursorLabel?: string;
};

const base =
  "relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap px-7 py-3.5 text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors duration-200";

const variants = {
  solid:
    "bg-forest text-ivory hover:bg-forest-soft disabled:opacity-50 disabled:pointer-events-none",
  outline:
    "border border-current text-current hover:bg-current/5 disabled:opacity-50",
  ghost: "text-current hover:text-leaf",
} as const;

/**
 * Magnetic pull on the *content*, never on the hit area — the clickable
 * rectangle stays exactly where the browser (and a keyboard user) expects it.
 * Pointer movement drives gsap.quickTo directly, so React never re-renders.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "solid",
  className = "",
  strength = 14,
  disabled = false,
  cursorLabel,
}: MagneticButtonProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    if (isTouchDevice() || reducedMotionNow()) return;

    const moveX = gsap.quickTo(content, "x", {
      duration: 0.5,
      ease: "power3.out",
    });
    const moveY = gsap.quickTo(content, "y", {
      duration: 0.5,
      ease: "power3.out",
    });

    const handleMove = (event: PointerEvent) => {
      const bounds = wrapper.getBoundingClientRect();
      const relX = event.clientX - (bounds.left + bounds.width / 2);
      const relY = event.clientY - (bounds.top + bounds.height / 2);
      moveX((relX / bounds.width) * strength * 2);
      moveY((relY / bounds.height) * strength * 2);
    };

    const handleLeave = () => {
      moveX(0);
      moveY(0);
    };

    wrapper.addEventListener("pointermove", handleMove);
    wrapper.addEventListener("pointerleave", handleLeave);
    return () => {
      wrapper.removeEventListener("pointermove", handleMove);
      wrapper.removeEventListener("pointerleave", handleLeave);
      gsap.killTweensOf(content);
    };
  }, [strength]);

  const classes = `${base} ${variants[variant]} ${className}`;
  const inner = (
    <span ref={contentRef} className="pointer-events-none inline-flex items-center gap-2.5">
      {children}
    </span>
  );

  return (
    <span ref={wrapperRef} className="inline-flex">
      {href ? (
        <Link href={href} className={classes} data-cursor-label={cursorLabel}>
          {inner}
        </Link>
      ) : (
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={classes}
          data-cursor-label={cursorLabel}
        >
          {inner}
        </button>
      )}
    </span>
  );
}

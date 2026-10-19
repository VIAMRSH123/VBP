import type { NextConfig } from "next";

/**
 * The old WordPress URLs are what Google has indexed today, so every one of
 * them is redirected permanently to its replacement rather than 404ing.
 * Source: crawl of tfsuncons.com.qa, 18 Oct 2026.
 */
const legacyRedirects = [
  { source: "/our-products", destination: "/products" },
  { source: "/about-us", destination: "/about" },
  { source: "/contact-us", destination: "/contact" },
  { source: "/bharat-gate", destination: "/products/rice/bharat-gate" },
  { source: "/golden-india", destination: "/products/rice/golden-indian" },
  { source: "/golden-grand", destination: "/products/rice/golden-grand" },
  { source: "/131-long-grain", destination: "/products/rice/131-long-grain" },
  {
    source: "/91-telangana-gold",
    destination: "/products/rice/91-telangana-gold",
  },
  {
    source: "/91-parboiled-rice",
    destination: "/products/rice/91-parboiled-rice",
  },
  { source: "/911-sona-masuri", destination: "/products/rice/911-sona-masoori" },
  { source: "/spices", destination: "/products/spices" },
  { source: "/pulses", destination: "/products/pulses" },
  { source: "/sugar", destination: "/products/sugar" },
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return legacyRedirects.map((redirect) => ({ ...redirect, permanent: true }));
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

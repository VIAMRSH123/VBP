import type { MetadataRoute } from "next";
import { company } from "@/content/company";

/**
 * Only the real domain invites crawlers. Any other host — a Vercel preview, a
 * staging box — is disallowed outright, so a deployed copy can never compete
 * with tfsuncons.com.qa in search or get indexed by mistake.
 */
export default function robots(): MetadataRoute.Robots {
  const isCanonicalHost = company.siteUrl === company.canonicalOrigin;

  if (!isCanonicalHost) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${company.siteUrl}/sitemap.xml`,
    host: company.siteUrl,
  };
}

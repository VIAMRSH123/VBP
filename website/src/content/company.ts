/**
 * Where this deployment believes it lives.
 *
 * Explicit NEXT_PUBLIC_SITE_URL wins. Otherwise any non-production Vercel
 * deployment reports its own URL, so previews never claim to be the real site
 * — robots.ts keys off this to disallow crawlers on every host but the real
 * domain. Only consumed server-side (metadata, JSON-LD, sitemap, robots).
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://tfsuncons.com.qa";
}

/**
 * Every fact in this file was read off the official site on 18 Oct 2026.
 * Nothing here may be changed to something that cannot be verified — see
 * docs/01-company-facts.md for sources and for the list of things we deliberately do not claim.
 */

export const company = {
  legalName: "Suncons Trading and Contracting W.L.L.",
  tradingName: "TF Suncons",
  shortName: "TFS",
  domain: "tfsuncons.com.qa",
  /** Canonicals, Open Graph URLs and the sitemap are all built from this. */
  siteUrl: resolveSiteUrl(),
  canonicalOrigin: "https://tfsuncons.com.qa",

  positioning: "India's grain, held to a standard, landed in Doha.",
  descriptor:
    "A Doha food trading house supplying rice, spices, pulses and sugar to the retail, industrial and food-service markets.",

  address: {
    building: "Building No 493",
    zone: "Zone 57",
    street: "Street 43",
    area: "Industrial Area",
    city: "Doha",
    country: "Qatar",
    oneLine:
      "Building No 493, Zone 57, Street 43, Industrial Area, Doha, Qatar",
  },

  phones: [
    { label: "Landline", display: "+974 4455 0945", href: "tel:+97444550945" },
    { label: "Mobile", display: "+974 3133 7009", href: "tel:+97431337009" },
    { label: "Mobile", display: "+974 3099 7009", href: "tel:+97430997009" },
  ],

  email: "info@tfsuncons.com.qa",

  /** Verbatim from /about-us/ — quoted on the About page, attributed as the company's own words. */
  mission:
    "To deliver quality products and make the world experience true Indian flavors in its authentic form that brings joy and satisfaction to our global consumers.",
  vision:
    "To be pioneers in rice products around the world and adopt innovative strategies that aid in the emergence of Bharat Gate 91 as the most trusted and preferred brand in the global market.",
  qualityStatement:
    "Our rice brands come with an assurance of quality as we follow strict guidelines at every stage of production to maintain the taste and nutritious value of the product, and include regulatory agencies to inspect the development, packaging and distribution of the product.",

  /** The company's own description of its reach. Not expanded beyond this wording. */
  reach: ["India", "Africa", "Dubai", "Qatar"],

  /** Verified on the official site: "retail, industrial, and food service markets". */
  markets: [
    "Wholesale & distribution",
    "Supermarkets & retail",
    "Hotels & restaurants",
    "Catering & food service",
  ],

  /**
   * Proof points. Each one is readable on a pack or stated on the official site —
   * no invented metrics, no counters, no certifications.
   */
  proof: [
    {
      label: "Origin",
      value: "Telangana, Korutla",
      note: "Printed on the 91 Telangana Gold pack",
    },
    {
      label: "Grading",
      value: "Satake sortex",
      note: "100% sortex marks on Telangana Gold & 911",
    },
    {
      label: "Trade sizes",
      value: "18 · 20 · 35 kg",
      note: "Pack weights across the rice range",
    },
    {
      label: "Labelling",
      value: "EN · AR · TE",
      note: "Trilingual packs for Gulf retail",
    },
  ],
} as const;

export type Company = typeof company;

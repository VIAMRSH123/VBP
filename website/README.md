# TFS Suncons — Website

A complete redesign and rebuild of **tfsuncons.com.qa** for Suncons Trading & Contracting W.L.L.
(TF Suncons), the Doha food trading house. Next.js 16 · React 19 · TypeScript · Tailwind v4 ·
GSAP + ScrollTrigger · Lenis.

## Run it

```bash
cd website
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
```

> The dev server must be launched outside the Claude Code sandbox in this environment
> (`dangerouslyDisableSandbox: true`) — same quirk as the VBP backend, see `docs/RUNBOOK.md`
> in the parent project. `preview_start` with `{url: "http://localhost:3000"}` works for
> browser verification once it is up.

## What's where

```
website/
├── docs/                      research + handover (read these first)
│   ├── 01-company-facts.md    verified facts, and what we refused to claim
│   ├── 02-product-catalogue.md every SKU, mapped to its real pack image
│   ├── 03-asset-inventory.md  every image, including the ones we would not ship
│   ├── 04-competitor-research.md
│   ├── 05-design-direction.md the visual system and why
│   └── 06-handover.md         build + test results, open items
├── public/
│   ├── brand/                 logo, about banner, rice-sack composite
│   ├── journey/               watercolour farm vignettes
│   └── products/              11 pack renders at 1000×1000
└── src/
    ├── app/                   routes, API, sitemap, robots
    ├── components/
    │   ├── layout/            Header, Footer, SmoothScroll
    │   ├── motion/            CustomCursor, TextReveal, ImageReveal, MagneticButton, Reveal
    │   ├── sections/          the nine homepage sections
    │   └── ui/                PageHero, ProductCard, SectionHeading
    ├── content/               company.ts + products.ts — the only source of copy and catalogue
    └── lib/motion.ts          GSAP registration, reduced-motion and touch guards
```

## Adding a product

Everything — category pages, the rice index, the sitemap, the enquiry dropdown, the product
detail routes — is generated from `src/content/products.ts`. Append one object:

```ts
{
  slug: "toor-dal",
  name: "Toor Dal",
  category: "pulses",
  summary: "Split pigeon peas, processed and packed for the trade.",
  description: "…",
  attributes: ["Processed & packaged"],
  packSizes: [],            // [] renders "quoted on enquiry"
  image: null,              // null renders a typographic card, not a stock photo
  imageAlt: "",
  verified: "owner",        // "site" | "pack" | "owner"
}
```

`image: null` is a supported, deliberate state: a SKU can go live the moment its name is known
and gain its photograph later.

## The enquiry form

`/contact#enquiry` posts to `/api/enquiry`, which validates with Zod server-side, applies a
honeypot and a per-instance rate limit, then delivers by whichever route is configured in
`.env` (see `.env.example`):

1. `ENQUIRY_WEBHOOK_URL` — posts the enquiry as JSON. Point this at the VBP lead backend and
   website enquiries land on the same dashboard as the WhatsApp leads.
2. `RESEND_API_KEY` + `ENQUIRY_TO_EMAIL` + `ENQUIRY_FROM_EMAIL` — emails it.

With neither set the API returns **503** and the form shows a real error plus the phone number
and email. It never fakes a success.

## Ground rules this build follows

- Nothing is claimed that cannot be read off the official site or off the packaging. No founding
  year, revenue, tonnage, client names, certifications or counters.
- No stock photography standing in for a TFS product. Two images on the live site carry visible
  agency watermarks and were not reused — see `docs/03-asset-inventory.md`.
- Every old WordPress URL redirects (308) to its replacement; see `next.config.ts`.

# Handover — TFS Suncons Website Redesign

Built 18 October 2026. This document is deliberately blunt about what was verified, what was
measured, and what was not.

---

## 1. The design, in one paragraph

**"The 91 Standard."** Every TFS pack carries a 91 roundel — India's dialling code, stamped on
grain sold into a country that imports nearly all of its food. The site is built as a trade
document made beautiful: indexed sections (`01 / PORTFOLIO`), hairline rules, specifications set
like data, deep forest green against warm ivory, wheat gold used only for metadata, and the real
product packs treated as photographed objects rather than thumbnails in a card grid. Fraunces
(display) + Inter (text). Sections alternate ivory → dark → product-led so the page has rhythm
instead of one green wash. Full rationale in `05-design-direction.md`.

## 2. Pages built

| Route | What it is |
|---|---|
| `/` | Nine sections: cinematic hero · proof strip · company intro · portfolio grid · rice index (horizontal) · spices · sourcing journey · quality · enquiry |
| `/about` | Company story, mission & vision quoted verbatim, reach, markets, quality |
| `/products` | All four categories with a sticky category nav and every SKU |
| `/products/rice` · `/spices` · `/pulses` · `/sugar` | Category pages |
| `/products/[category]/[slug]` | 15 product pages, each with an "On the pack" spec panel |
| `/contact` | Verified address, working `tel:` and `mailto:`, enquiry form |
| `/_not-found` | 404 that points at the portfolio, since most bad links will be old WP URLs |
| `/sitemap.xml`, `/robots.txt` | Generated from the catalogue |

**27 pages prerendered**, 26 of them static HTML; only `/api/enquiry` is dynamic.

## 3. Interactions

- **Custom cursor** — dot + ring with contextual labels (`VIEW PRODUCT`, `ENQUIRE`, `CALL`).
  Disabled on touch and under reduced motion; `pointer-events: none` throughout, so links,
  buttons, text selection and form controls behave exactly as they would without it. The native
  cursor is only hidden once the custom one is actually running, and text fields keep their caret.
- **Masked line reveals** on every display heading; each line is real text in the DOM at all times.
- **Clip-path image reveals** with a 1.06→1 settle and optional parallax.
- **Horizontal rice index** — pinned and scrubbed on desktop, a native snap-scroll track on
  mobile. Focusing an off-screen card drives the page scroll to that point, so keyboard users
  can reach all seven.
- **Magnetic CTAs** — the *content* moves, never the hit area, so the clickable rectangle stays
  where a pointer or keyboard expects it.
- **Lenis smooth scroll**, wired to ScrollTrigger through GSAP's ticker; skipped entirely under
  reduced motion.
- **Animated SVG arc diagram** for sourcing (see §7 on why there is no WebGL).
- **Flag storm** on the About masthead — every pixel of the Indian flag is a
  rice grain; on a loop the flag tears itself apart into a storm, each grain
  thrown along its own arc and changing colour in flight, and lands as the flag
  of Qatar. Canvas, ~2,900 grains, no new dependencies.
- **Trade board** in the company section — a split-flap freight board stating
  the range as grade and weight (sona masoori · 18 kg, basmati 1121 · 20 kg…),
  each cell spinning through glyphs before it lands. The flaps are
  `aria-hidden`; a visually-hidden line carries the real text.
- **Grain morph** on the About page — 1,500 canvas grains re-forming across four
  scroll-driven states (paddy rows → ocean swell → Doha skyline → the 91 mark).
  Each grain keeps its identity throughout; the gold grains become the wheat
  wreath in the final state. The loop is suspended off screen, and reduced
  motion renders the final state once, statically. See `05-design-direction.md`.

All GSAP work runs inside a `gsap.context()` per component and is reverted on unmount.

## 4. Build and test results — measured, not claimed

| Check | Result |
|---|---|
| `npm run build` | ✅ passes, 27 pages generated |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean (0 errors, 0 warnings) |
| All routes | ✅ 200 — home, products, 4 categories, product detail, about, contact; 404 returns 404 |
| **All 10 legacy WP URLs** | ✅ 308 → correct new URL |
| Internal links crawled | ✅ 25 unique links, **0 broken** |
| Horizontal overflow @ 320/375/768/1024/1280/1920 | ✅ none at any width |
| Hero headline line integrity @ same widths | ✅ holds two lines everywhere |
| Enquiry API — valid + webhook configured | ✅ 200, payload delivered with bearer token to a test receiver |
| Enquiry API — valid + nothing configured | ✅ 503 `not_configured`; UI shows a real error + phone/email fallback, keeps the typed message |
| Enquiry API — invalid input | ✅ 422 with per-field errors |
| Enquiry API — honeypot filled | ✅ silent 200, **nothing delivered** (verified against the receiver log) |
| Content without JavaScript | ✅ all copy present in the server HTML; a `<noscript>` style disables the reveal system so nothing stays hidden |
| Colour contrast | ✅ recomputed and fixed — see §5 |

### Performance — actual numbers from the production build

Measured in-browser against `next start`, homepage, warm localhost:

| Resource | Transferred | Budget (your web rules) |
|---|---|---|
| CSS | **8.7 kB** | < 30 kB ✅ |
| Fonts | **83 kB** (Fraunces 35.7 + Inter 47.3) | — |
| HTML | 17.1 kB | — |
| Images | 151.7 kB (5 images, AVIF/WebP via next/image) | — |
| **JS** | **220.6 kB** | < 150 kB ❌ |

**The JS budget is missed, and I am not going to dress that up.** The breakdown is roughly
GSAP + ScrollTrigger ≈ 70 kB, React 19 + Next runtime ≈ 91 kB, application code ≈ 60 kB. The
brief makes GSAP and ScrollTrigger a core requirement; with React and Next underneath, 150 kB is
not reachable without dropping the motion system. The lever, if you want it later: replace GSAP
with CSS scroll-driven animations and drop Lenis (~80 kB saved, at the cost of the scrub-pinned
rice index and the cursor drift).

One real win was taken: Fraunces was loading its optional SOFT and WONK axes while the CSS pinned
both to zero. Removing them cut that font from **118 kB → 35.7 kB**.

**Lighthouse was not run.** There is no Lighthouse CLI in this environment and no Chrome binary
I can drive headlessly for it, so no score is claimed. FCP measured 196 ms on localhost, which
tells you about the machine, not about Doha on 4G. Run Lighthouse against the deployed URL
before quoting any number.

## 5. Accessibility

Semantic landmarks throughout, a skip link, correct heading order, visible focus rings
(gold on dark sections), labelled form fields with a polite live region for the submit result,
alt text on every meaningful image and `alt=""` on decorative ones, `aria-current` on the active
nav item, breadcrumbs, and a reduced-motion kill switch that renders everything in its final
state.

**Two contrast failures were found and fixed** by computing ratios rather than eyeballing:

| Token | Was | Now | Ratio on ivory / white |
|---|---|---|---|
| `--color-gold` (11–13px metadata) | `#b8873e` — **2.86:1, fail** | `#8c6529` | 4.69 / 5.24 ✅ |
| `--color-muted` (small body) | `#6b7169` — 4.48:1, marginal | `#636962` | 5.04 / 5.63 ✅ |

The sourcing diagram's origin node was also moved to `gold-soft` so it clears 3:1 against the
dark panel as a meaningful graphic.

**Not tested:** a real screen reader (VoiceOver/NVDA), and `prefers-reduced-motion` toggled at
the OS level — this environment cannot emulate it. The CSS block and the JS guards are in place
and the media query ships in the compiled stylesheet, but the behaviour has not been observed.

## 6. SEO

Per-page titles and descriptions, Open Graph and Twitter cards, canonicals, a generated sitemap
and robots, descriptive URLs, internal linking, and JSON-LD for Organization, LocalBusiness and
Product — **restricted to fields that are actually verifiable**. No price, availability or
aggregate rating is emitted, because none of it is published.

The ten legacy WordPress URLs all redirect permanently, so existing search equity is preserved.

## 7. Decisions you should know about

**No WebGL.** The brief allows Three.js "only when the resulting visual experience justifies the
cost". There is no accurate 3D model of a TFS sack, and building one would mean inventing
packaging. The sourcing section is an animated SVG arc diagram instead: ~0 kB of runtime, works
without WebGL, degrades to a static diagram under reduced motion, and never misrepresents a
product. The hero uses layered real photography with parallax and cursor drift, which is what the
brief prescribes as the alternative.

**Pulses have no photography.** The only pulses image on the live site is a watermarked stock
photo. Rather than ship it or substitute an unrelated bowl of lentils, the four pulse lines
(chickpeas, white beans, green gram, kidney beans) are presented typographically, and the
category page says plainly why.

**Sugar is a fourth category.** It is on the official site at `/sugar/` and was missing from the
brief's category list. It is included.

## 8. What TFS needs to supply

1. **Pulses photography** — the highest-value missing asset.
2. **A re-shot or retouched 91 Parboiled pack** — the current render has "PKG 04/2018 / EXP
   03/2020" printed legibly on the sack and is live on the current site today.
3. **Facility and team photography** — warehouse, pallets, loading, the Industrial Area premises,
   people at work. The site has none, which is why About and Quality are typographic. This is the
   single biggest upgrade available to the site's credibility.
4. **A vector logo** (SVG/AI/EPS). Only a 496×296 raster exists.
5. **Verified social profiles** — the current footer shows Facebook/Twitter/LinkedIn icons wired
   to nothing, so the rebuild omits social links rather than guessing URLs.
6. **A decision on the flagged inconsistencies** in `01-company-facts.md`: "Golden India" vs
   "Golden Indian", "Bharath Gate" vs "Bharat Gate", the live lorem-ipsum blog posts, and the
   mismatched product modals.
7. **Any certification** the company actually holds. A competitor states ISO 22000 above the
   fold; TFS names none, so the site claims none.
8. **The SKUs you sell that the old site never listed** — the catalogue is one data file and was
   built for exactly this; see "Adding a product" in the README.

## 9. Backend integration required before launch

The enquiry form is wired and proven, but **not connected to anything yet**. Set one of the two
options in `.env` (see `.env.example`):

- `ENQUIRY_WEBHOOK_URL` (+ optional `ENQUIRY_WEBHOOK_TOKEN`) — recommended: point it at the VBP
  lead backend so website enquiries join the WhatsApp leads on one dashboard. Verified working
  against a test receiver.
- `RESEND_API_KEY` + `ENQUIRY_TO_EMAIL` + `ENQUIRY_FROM_EMAIL` — the email route. **Written but
  not executed**, because that would mean sending real mail through a real account.

Also before launch: the rate limiter is per-instance in memory, so a multi-instance deployment
needs a shared store; and the security headers in `next.config.ts` do not yet include a CSP —
Next injects inline scripts, so a nonce-based policy has to be added at the proxy or via
middleware.

## 10. Research sources

All crawled or opened on 18 Oct 2026 and recorded in `01`–`05`:

- `tfsuncons.com.qa` — homepage, about, products, spices, pulses, sugar, contact, and all seven
  rice product pages, plus every image file downloaded and visually inspected.
- Competitors: `bradmagroup.com.qa`, `royaldohatrading.com`, `progressiveqatar.com` (found
  broken — HTTP 500), plus searches for the other six names on the shortlist, none of which have
  a findable official website. No URLs were invented.
- Design references opened: `ldc.com`, `olamagri.com`, `tilda.com`, `awwwards.com/websites/food`,
  `recent.design`. `acquerello.it` would not render. The two galleries could not be scraped for
  project URLs in this browser, so the reference board is five genuinely inspected sites rather
  than the eight the brief asked for — stated plainly rather than padded.

## 11. Dependencies added

`next@16.4.2` · `react@19.3.1` · `react-dom` · `gsap@3.15` · `lenis@1.3` · `zod@4.6`
Dev: `typescript` · `tailwindcss@4.3` · `@tailwindcss/postcss` · `eslint` + `eslint-config-next`
· `@types/*`.

No second animation library, no UI kit, no icon package.

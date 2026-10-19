# Design Direction — "The 91 Standard"

## The idea

Every TFS pack carries a **91** roundel. 91 is India's dialling code — the brand is literally
stamped with where the grain comes from, sold to a country that imports nearly all of its food.
That is the whole business in one mark, and it is the spine of the site:

> **India's grain, held to a standard, landed in Doha.**

The site is built as a **trade document made beautiful** — an editorial take on a packing list.
Fine rules, indexed sections (`01 / PORTFOLIO`), specifications set like data, generous paper-white
space, and then full-bleed dark panels where the story turns cinematic. Product packs are
photographed objects, not thumbnails in a card grid.

The audience is a purchasing manager at a hotel, a supermarket buyer, a catering wholesaler. The
site has to read *serious* in five seconds and *specific* in thirty.

## What it is deliberately not

Not a consumer rice brand (Tilda's world — recipes, bright pack grids, lifestyle). Not a
conglomerate brochure (Bradma's world). Not a dark SaaS landing page with a gradient blob. Not a
three-card grid repeated eight times.

## Palette

Tuned to the logo's greens and wheat gold, and to the packs themselves.

| Token | Value | Role |
|---|---|---|
| `--forest` | `#13301F` | Dark cinematic sections, footer |
| `--forest-deep` | `#0B1F14` | Deepest ground, hero vignette |
| `--leaf` | `#2E7D43` | The logo green — marks, links, focus |
| `--ivory` | `#F6F2E8` | Primary paper |
| `--paper` | `#FFFFFF` | Lifted surfaces |
| `--charcoal` | `#1C221E` | Body text on ivory |
| `--gold` | `#B8873E` | Hairlines, index numerals, small caps — *sparingly* |
| `--sand` | `#E3DECF` | Rules, borders, muted fills |

Colour carries meaning: gold = index/metadata, leaf = interactive, forest = narrative weight.
Sections alternate ivory → dark → product-led so the page has rhythm instead of one green wash.

## Typography — two families

- **Fraunces** (variable serif) for display. Optical-size axis set high, `WONK 0`, so it reads
  agricultural-editorial rather than fashion-serif. Used at `clamp()` sizes up to ~9vw.
- **Inter** for everything else, including the small-caps metadata lines (`0.08em` tracking,
  11–12px, gold or muted).

Numerals matter on this site (18 kg, 35 kg, 1121, 911, 131, 91) — Fraunces sets them with
character, and they become a visual motif in their own right.

## Layout principles

12-column grid, 1440 max content width, asymmetric by default. Editorial section headers sit in
columns 1–4 with the content in 5–12. Image panels break the grid and bleed. Overlap is used once
per section at most. Spacing comes from a single `--space-section` clamp, never ad-hoc padding.

## Motion language

One system, four verbs:

1. **Rise** — text and blocks enter 24px up, opacity 0→1, stagger 60ms, `expo.out`.
2. **Unmask** — headlines reveal line-by-line behind `clip-path` masks.
3. **Settle** — pack images scale 1.06→1 under a clip reveal, then hold.
4. **Track** — slow parallax and cursor-reactive drift on hero layers only.

Durations 400–900ms, `cubic-bezier(0.16,1,0.3,1)`. Transform and opacity only. Everything is
registered through one GSAP context per component and reverted on unmount. The entire system is
disabled under `prefers-reduced-motion`, where content renders in its final state.

## The About page's grain morph

The About page's lead sentence — "From the rice belt to the Gulf" — is drawn in
the company's own product. A field of 1,500 rice grains on a 2D canvas re-forms
through four scroll-driven states: **paddy rows → an ocean swell → the Doha
skyline → the 91 mark**. Every grain keeps its identity across all four states
and is released on its own delay, so the field ripples into shape instead of
snapping.

Details that matter:

- The skyline is built from real tower profiles — a domed cylinder, a waisted
  hyperboloid, a tapering spire with a mast — plus a corniche line and the bay
  thinning out beneath it. Not a row of boxes.
- The final state is the pack mark as it actually is: the numerals inside a
  ring, held by two sprigs of grain curving up each side. The **gold grains in
  the field are routed to the wreath**, so the wheat reads as wheat.
- The sequence finishes while the panel is still well inside the viewport, not
  as it leaves — the last state is the payoff.
- The render loop is suspended whenever the panel is off screen, and reduced
  motion gets the final state painted once with no animation at all.

Cost: ~7 kB of application code, no new dependencies.

## 3D decision — no WebGL, on purpose

There is no accurate 3D model of a TFS sack, and building one would mean inventing packaging. The
brief's own rule applies: use layered photography and parallax instead. The sourcing section is an
**animated SVG arc map** (India → Gulf), drawn with `stroke-dashoffset`, which costs ~0 kB of
runtime, works without WebGL, degrades to a static map under reduced motion, and never
misrepresents a product.

## References actually inspected (18 Oct 2026)

| Reference | Verified | What it contributes |
|---|---|---|
| `ldc.com` (Louis Dreyfus Company) | ✅ opened | The target register for a commodity merchant: muted green, serif wordmark, institutional calm. Confirms dark-green + editorial is right for B2B agri. |
| `olamagri.com` (Olam Agri) | ✅ opened | Human photography carrying a supply-chain story; proof that agri B2B can be warm without being folksy. |
| `tilda.com` | ✅ opened | The consumer-rice register — recipes, bright grids, cookie-wall. Useful as the **anti-reference**: TFS must not look like this. |
| `bradmagroup.com.qa` | ✅ opened | Local benchmark; credibility stated above the fold (1970 / ISO 22000). |
| `royaldohatrading.com` | ✅ opened | Local benchmark; product-wall hero, and a lesson in what fabricated testimonials cost. |
| `awwwards.com/websites/food/` | ✅ opened | Category scan. Studio names render, but outbound project URLs are not in the DOM. |
| `recent.design` (formerly `godly.website`) | ✅ opened | Gallery now redirects here; the grid is lazy-loaded imagery with no machine-readable outbound links. |
| `acquerello.it/en/` | ⚠️ blank | Premium Italian rice brand — rendered blank in this browser (JS-gated). Not used as a reference. |

**Honest note:** the brief asked for eight-plus inspected references. Five sites were genuinely
opened and read; the two design galleries could not be scraped for project URLs in this
environment, and one candidate would not render. No reference URL in this table is invented, and
none is claimed as inspected when it was not.

## Section-by-section intent (homepage)

| # | Section | Treatment |
|---|---|---|
| 01 | Hero | Ivory→forest stage, three real packs layered with depth and cursor drift, masked headline, two CTAs, scroll cue |
| 02 | Positioning strip | Four verified proof-points as a hairline-ruled band (origin, sortex, trade sizes, markets) |
| 03 | Company introduction | Editorial two-column, paddy-sack image, real mission language rewritten |
| 04 | Portfolio | Four asymmetric category panels — Rice (featured, large), Spices, Pulses, Sugar |
| 05 | Rice index | Horizontal scroll-driven showcase of all 7 packs on desktop; vertical stack on mobile |
| 06 | Spices | Warm dark band, three 1 kg pouches, sensory copy |
| 07 | Supply journey | Dark section, Source → Select → Package → Distribute, animated SVG arc map + the brand's own watercolour vignettes |
| 08 | Quality | Typographic; only claims that can be read off a pack |
| 09 | Partnership | B2B enquiry form, real validation, real submission, honest failure states |
| 10 | Contact + footer | Verified address, working `tel:`/`mailto:`, site map |

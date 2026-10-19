# Asset Inventory

Every image on the live site was downloaded and **opened and looked at** — not judged by filename.
29 files pulled from `tfsuncons.com.qa/wp-content/uploads/…` on 18 Oct 2026.

## Shipped in the rebuild (`public/products/`, `public/brand/`)

| File | Px | What it actually is | Used for |
|---|---|---|---|
| `tfs-bharat-gate.png` | 1000² | Bharat Gate 1121 sack, 20 kg | Hero object, rice index, product page |
| `tfs-golden-indian.png` | 1000² | Golden Indian sack, 5 kg | Hero stack, rice index, product page |
| `tfsgoldengrand.png` | 1000² | Golden Grand sack, 35 kg | Hero stack, rice index, product page |
| `tfs-indianlonggrain-rice.png` | 1000² | 131 sack, 35 kg | Rice index, product page |
| `tfs-91telanganagold.png` | 1000² | 91 Telangana Gold sack, 18 kg | Rice index, product page, "flagship" slot |
| `91paraboiledrice.png` | 1000² | 91 Parboiled sack, 20 kg | Rice index, product page — ⚠️ see below |
| `911-sonamasuri-rice-banner.png` | 1000² | 911 Sona Masoori sack, 35 kg | Rice index, product page |
| `telanganagold-turmeric.png` | 1000² | Turmeric Powder pouch, 1 kg | Spices |
| `telanganagold-coriander.png` | 1000² | Coriander Powder pouch, 1 kg | Spices |
| `telanganagold-chilli.png` | 1000² | Chilli Powder pouch, 1 kg | Spices |
| `sugar.png` | 1000² | Overhead bowl of white sugar, clean | Sugar category |
| `tfs1.png` | 379×369 | Jute sacks + paddy stalks composite | About page only, at small size. Too low-res to carry a panel — the homepage company section uses a typographic trade board instead. |
| `tfs-bg3.jpg` | 1663×417 | Four watercolour farm vignettes: ploughing → harvest → cart → delivery truck | **Supply journey section** — maps exactly onto Source/Select/Package/Distribute |
| `about-us-page-banner.jpg` | 1663×400 | Bharat Gate pack + watercolour harvest scene | About page band |
| `tfs-logo.png` / `-transparent.png` | 496×296 | TFS wordmark, green + wheat gold | Header, footer, favicon source |

The 496×296 logo comes from this repo (`frontend/public/`) and is **3× larger than the 161×112 one
the live site serves** — the better file is used.

## Deliberately NOT shipped

| File | Why |
|---|---|
| `dal.png` | Visible repeating **stock-agency watermark** across the whole image. Confirmed by cropping and enlarging the centre. Unlicensed-looking; not reused. |
| `tfs-bg4.jpg` | Paddy-terrace illustration with a legible **"depositphotos"** watermark. Not reused. |
| `blog1-3.jpg` | 360×251 photos of unidentified people in a field, attached to the "lorem ipsum" placeholder posts. No provenance, no consent, too low-res. |
| `chillipowder.png`, `chilly.png`, `rice.png`, `plues.png` | Duplicates/thumbnails of assets already shipped at 1000². |
| `tfs-bg.jpg`, `tfs-bg1.jpg`, `tfs-bg2.jpg` | Flat paper-texture strips; replaced by a CSS grain layer that scales properly. |
| `our-products-slider.jpg`, `contact-us-slider.jpg` | 1663×400 WordPress banner crops, unusable at modern viewport heights. |

## Missing assets — the owner needs to supply these

1. **Pulses photography.** The only pulses image is watermarked. The new pulses page is built
   typographically, with no product photo, rather than substituting an unrelated stock image.
2. **A re-shot or retouched 91 Parboiled pack** — the current render has 2018/2020 pack and expiry
   dates printed legibly on the sack.
3. **Real facility and team photography** — warehouse, pallets, loading, the Industrial Area
   premises, people at work. The site currently has none, which is why the About and Quality
   sections are typographic rather than photographic. This is the single highest-value asset to
   add: it is what separates a credible trader from a catalogue.
4. **A vector logo (SVG/AI/EPS).** Only a 496×296 raster exists; it soft-edges on large screens.
5. **Higher-resolution `tfs1.png`** (currently 379×369).
6. **Verified social profiles.** The live footer shows Facebook/Twitter/LinkedIn icons that are not
   wired to any URL — so the rebuild omits social links rather than guessing them.

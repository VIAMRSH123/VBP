/**
 * The product catalogue — the single source of truth for the whole site.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  ADDING A PRODUCT WE SELL THAT THE OLD SITE NEVER LISTED
 * ──────────────────────────────────────────────────────────────────────────
 *  Append a `Product` object to `products` below. Nothing else needs editing —
 *  the category pages, the rice index, the sitemap, the enquiry dropdown and
 *  the product detail routes are all generated from this array.
 *
 *  `image: null` is fully supported and intentional: a SKU with no pack
 *  photograph yet renders as a typographic card instead of borrowing an
 *  unrelated stock image. So a product can go live the moment we know its
 *  name, and gain its photo later.
 *
 *  `verified` records where the information came from:
 *    "site"  — published on tfsuncons.com.qa (crawled 18 Oct 2026)
 *    "pack"  — read off the product's own packaging artwork
 *    "owner" — supplied by TFS directly; not on the old website
 *  Keep it honest: it drives what the handover doc reports as verified.
 */

export type CategorySlug = "rice" | "spices" | "pulses" | "sugar";
export type VerificationSource = "site" | "pack" | "owner";

export interface Product {
  /** URL segment — /products/<category>/<slug> */
  slug: string;
  name: string;
  /** Sub-brand printed on the pack, e.g. "Telangana Gold". */
  brand?: string;
  category: CategorySlug;
  /** One line for index cards. */
  summary: string;
  /** Full description for the product page. */
  description: string;
  /** Short, factual attributes. Only things readable on the pack or published. */
  attributes: readonly string[];
  /** Pack sizes as printed. Empty array = not yet confirmed; the UI then says so. */
  packSizes: readonly string[];
  image: string | null;
  imageAlt: string;
  verified: VerificationSource;
  /** Shown larger, first, on the rice index. */
  featured?: boolean;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  image: string | null;
  imageAlt: string;
}

export const categories: readonly Category[] = [
  {
    slug: "rice",
    name: "Rice",
    tagline: "Seven varieties, basmati to sona masoori",
    description:
      "The core of the business. Basmati and non-basmati rice sourced from India and packed for the trade in 18, 20 and 35 kg packs — the sizes hotels, caterers and wholesalers actually buy.",
    image: "/products/91-telangana-gold.png",
    imageAlt: "91 Telangana Gold sona masoori rice pack",
  },
  {
    slug: "spices",
    name: "Spices",
    tagline: "Ground, packed and sealed at 1 kg",
    description:
      "Turmeric, coriander and chilli, ground and packed under the Telangana Gold label at a kilogram — the working size for a kitchen rather than a household shelf.",
    image: "/products/chilli-powder.png",
    imageAlt: "Telangana Gold chilli powder pouch",
  },
  {
    slug: "pulses",
    name: "Pulses",
    tagline: "Chickpeas, beans and gram",
    description:
      "Processed and packaged pulses across a range of shapes, sizes and colours, supplied to the same retail, industrial and food-service customers as the rice.",
    image: null,
    imageAlt: "",
  },
  {
    slug: "sugar",
    name: "Sugar",
    tagline: "Packed in its purest form",
    description:
      "Fine-grain sugar held to the same processing standard as the rest of the range, available in different forms and packaging.",
    image: "/products/sugar.png",
    imageAlt: "Bowl of fine white sugar",
  },
] as const;

export const products: readonly Product[] = [
  // ── Rice ────────────────────────────────────────────────────────────────
  {
    slug: "91-telangana-gold",
    name: "91 Telangana Gold",
    brand: "Telangana Gold",
    category: "rice",
    summary:
      "The flagship sona masoori, and one of the top rice brands in Qatar.",
    description:
      "One of TF Suncons' core products. A sona masoori valued for its high nutritional value and low carbohydrate content, used daily as a staple by households, hotels, restaurants and catering companies. The pack names its origin outright — Telangana, Korutla — and carries the Satake 100% sortex mark.",
    attributes: [
      "Sona masoori",
      "Telangana Korutla origin",
      "Satake 100% sortex",
      "Trilingual pack — English, Arabic, Telugu",
    ],
    packSizes: ["18 kg"],
    image: "/products/91-telangana-gold.png",
    imageAlt: "91 Telangana Gold sona masoori rice pack, 18 kg",
    verified: "pack",
    featured: true,
  },
  {
    slug: "bharat-gate",
    name: "Bharat Gate 1121",
    category: "rice",
    summary: "The premium basmati of the range — 1121, extra long grain.",
    description:
      "Bharat Gate is the finest variety of basmati TFS carries: a much sought-after product in India and the Middle East, grown with care to hold its quality and aroma year after year. Long grain, non-sticky, with a fluffy texture and a distinctive taste that suits rice-based delicacies.",
    attributes: [
      "1121 basmati",
      "Extra long grain",
      "Indian premium grade",
      "Non-sticky, fluffy texture",
    ],
    packSizes: ["20 kg"],
    image: "/products/bharat-gate.png",
    imageAlt: "Bharat Gate 1121 premium basmati rice pack, 20 kg",
    verified: "pack",
    featured: true,
  },
  {
    slug: "golden-indian",
    name: "Golden Indian",
    category: "rice",
    summary: "XXXL extra long grain basmati, built for value at volume.",
    description:
      "An irresistible choice for heavy rice consumers and basmati lovers, nurtured to hold taste and aroma. Popular with mid-tier restaurants, hotels and catering companies making biryani in quantity, because it balances grain quality against price.",
    attributes: [
      "XXXL extra long grain",
      "Basmati",
      "Quality Produce of India mark",
      "Favoured for biryani",
    ],
    packSizes: ["5 kg"],
    image: "/products/golden-indian.png",
    imageAlt: "Golden Indian XXXL extra long grain basmati rice pack, 5 kg",
    verified: "pack",
  },
  {
    slug: "golden-grand",
    name: "Golden Grand",
    category: "rice",
    summary: "The catering basmati — 35 kg, biryani-grade, trilingual pack.",
    description:
      "A basmati most desired by budget cafeterias and hotels. Years of work have gone into holding grain quality and flavour steady at volume. A common household name among TFS customers, and the pack is labelled in English and Arabic for the Gulf trade.",
    attributes: [
      "Indian basmati",
      "Arabic + English pack",
      "Produce of India",
      "Catering volume",
    ],
    packSizes: ["35 kg"],
    image: "/products/golden-grand.png",
    imageAlt: "Golden Grand Indian basmati rice pack, 35 kg",
    verified: "pack",
  },
  {
    slug: "131-long-grain",
    name: "131 Long Grain",
    category: "rice",
    summary: "Sortex-cleaned long grain for everyday Indian cooking.",
    description:
      "The go-to variety for day-to-day dishes — idly, biryani, pulao. Famed for its closeness to traditional basmati, it sits above regular sona masoori on grain length, aroma and consistency. The pack is marked Super Special and Sortex Cleaned.",
    attributes: [
      "Long grain",
      "Sortex cleaned",
      '"From the foothills of Himalayas"',
      "Produce of India",
    ],
    packSizes: ["35 kg"],
    image: "/products/131-long-grain.png",
    imageAlt: "131 Super Special Indian long grain rice pack, 35 kg",
    verified: "pack",
  },
  {
    slug: "911-sona-masoori",
    name: "911 Sona Masoori",
    category: "rice",
    summary: "Everyday sona masoori — light, aromatic, low starch.",
    description:
      "A quality product and a perfect choice for everyday meals, used across sweet and savoury dishes alike thanks to its lightweight, aromatic character and low starch content. Carries the Satake 100% sortex and Quality Produce of India marks.",
    attributes: [
      "Sona masoori",
      "Satake 100% sortex",
      "Low starch",
      "Quality Produce of India",
    ],
    packSizes: ["35 kg"],
    image: "/products/911-sona-masoori.png",
    imageAlt: "911 Sona Masoori Indian rice pack, 35 kg",
    verified: "pack",
  },
  {
    slug: "91-parboiled-rice",
    name: "91 Parboiled Rice",
    brand: "Telangana Gold",
    category: "rice",
    summary: "Steam-treated long grain with a firm bite and golden colour.",
    description:
      "Long-grain rice treated with water vapour, which draws the nutrients of the shell into the grain and gives it a firm consistency and its characteristic golden colour. Rich in fibre and minerals, and it cooks loose with whole grains.",
    attributes: ["Parboiled", "Aromatic", "High nutrition value", "Golden colour"],
    packSizes: ["20 kg"],
    image: "/products/91-parboiled-rice.png",
    imageAlt: "91 Telangana Gold parboiled rice pack, 20 kg",
    verified: "pack",
  },

  // ── Spices ──────────────────────────────────────────────────────────────
  {
    slug: "turmeric-powder",
    name: "Turmeric Powder",
    brand: "91 Telangana Gold",
    category: "spices",
    summary: "Ground from fine-quality turmeric for colour, taste and aroma.",
    description:
      "Processed from fine-quality turmeric, adding colour, taste and aroma to dishes prepared daily. Packed at a kilogram with no preservatives.",
    attributes: ["100% natural ground spice", "No preservatives", "Arabic + English pack"],
    packSizes: ["1 kg"],
    image: "/products/turmeric-powder.png",
    imageAlt: "91 Telangana Gold turmeric powder pouch, 1 kg",
    verified: "pack",
  },
  {
    slug: "coriander-powder",
    name: "Coriander Powder",
    brand: "91 Telangana Gold",
    category: "spices",
    summary: "Blended from fresh coriander seed — aromatic at a pinch.",
    description:
      "Blended from fresh, quality coriander seeds. It makes dishes aromatic and lifts the taste even in small quantity — the working spice of an Indian kitchen, packed at a kilogram.",
    attributes: ["100% natural ground spice", "No preservatives", "Arabic + English pack"],
    packSizes: ["1 kg"],
    image: "/products/coriander-powder.png",
    imageAlt: "91 Telangana Gold coriander powder pouch, 1 kg",
    verified: "pack",
  },
  {
    slug: "chilli-powder",
    name: "Chilli Powder",
    brand: "91 Telangana Gold",
    category: "spices",
    summary: "Best-quality red chillies, ground to a consistent heat.",
    description:
      "Made with best-quality red chillies and ground to perfection, pitched at the heat level most kitchens actually cook to. Suitable across the range of dishes, packed at a kilogram.",
    attributes: ["100% natural ground spice", "No preservatives", "Arabic + English pack"],
    packSizes: ["1 kg"],
    image: "/products/chilli-powder.png",
    imageAlt: "91 Telangana Gold chilli powder pouch, 1 kg",
    verified: "pack",
  },

  // ── Pulses ──────────────────────────────────────────────────────────────
  // Named on the official site as part of the range but never given pages or
  // photographs of their own. Listed here so they are actually findable.
  {
    slug: "chickpeas",
    name: "Chickpeas",
    category: "pulses",
    summary: "Processed and packaged chickpeas for retail and food service.",
    description:
      "Part of the pulses range TFS processes and packages for the retail, industrial and food-service trade. Pack sizes and grades are quoted on enquiry.",
    attributes: ["Processed & packaged", "Retail and food service"],
    packSizes: [],
    image: null,
    imageAlt: "",
    verified: "site",
  },
  {
    slug: "white-beans",
    name: "White Beans",
    category: "pulses",
    summary: "Processed and packaged white beans for retail and food service.",
    description:
      "Part of the pulses range TFS processes and packages for the retail, industrial and food-service trade. Pack sizes and grades are quoted on enquiry.",
    attributes: ["Processed & packaged", "Retail and food service"],
    packSizes: [],
    image: null,
    imageAlt: "",
    verified: "site",
  },
  {
    slug: "green-gram",
    name: "Green Gram",
    category: "pulses",
    summary: "Processed and packaged green gram for retail and food service.",
    description:
      "Part of the pulses range TFS processes and packages for the retail, industrial and food-service trade. Pack sizes and grades are quoted on enquiry.",
    attributes: ["Processed & packaged", "Retail and food service"],
    packSizes: [],
    image: null,
    imageAlt: "",
    verified: "site",
  },
  {
    slug: "kidney-beans",
    name: "Kidney Beans",
    category: "pulses",
    summary: "Processed and packaged kidney beans for retail and food service.",
    description:
      "Part of the pulses range TFS processes and packages for the retail, industrial and food-service trade. Pack sizes and grades are quoted on enquiry.",
    attributes: ["Processed & packaged", "Retail and food service"],
    packSizes: [],
    image: null,
    imageAlt: "",
    verified: "site",
  },

  // ── Sugar ───────────────────────────────────────────────────────────────
  {
    slug: "sugar",
    name: "Sugar",
    category: "sugar",
    summary: "Fine-grain sugar, packaged in its purest form.",
    description:
      "A staple of dessert preparation and of every commercial kitchen, packaged in its purest form. TFS processing holds the grain characteristics steady, and the product is available in different forms and packaging.",
    attributes: ["Fine grain", "Multiple formats"],
    packSizes: [],
    image: "/products/sugar.png",
    imageAlt: "Bowl of fine white sugar",
    verified: "site",
  },
] as const;

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getProductsByCategory(slug: CategorySlug): readonly Product[] {
  return products.filter((product) => product.category === slug);
}

export function getProduct(
  category: string,
  slug: string,
): Product | undefined {
  return products.find(
    (product) => product.category === category && product.slug === slug,
  );
}

export function getFeaturedRice(): readonly Product[] {
  return products.filter((product) => product.category === "rice");
}

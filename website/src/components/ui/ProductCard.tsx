import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/content/products";

type ProductCardProps = {
  product: Product;
  index: number;
  tone?: "light" | "dark";
};

/**
 * One card for every product grid on the site. Handles the case the old site
 * could not: a SKU with no pack photograph yet renders as a typographic card
 * rather than borrowing an unrelated stock image.
 */
export function ProductCard({ product, index, tone = "light" }: ProductCardProps) {
  const isDark = tone === "dark";

  return (
    <article className="group">
      <Link
        href={`/products/${product.category}/${product.slug}`}
        data-cursor-label="VIEW PRODUCT"
        className="flex h-full flex-col"
      >
        <div
          className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden p-8 ${
            isDark ? "bg-forest-deep/40" : "border border-sand bg-paper"
          }`}
        >
          <span
            className={`t-index t-meta absolute left-5 top-5 ${
              isDark ? "text-gold-soft" : "text-gold"
            }`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              width={1000}
              height={1000}
              sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 24vw"
              className="h-full w-auto object-contain transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-center">
              <span
                aria-hidden="true"
                className={`t-index select-none text-[5rem] leading-none ${
                  isDark ? "text-ivory/15" : "text-sand"
                }`}
              >
                91
              </span>
              <span
                className={`t-meta mt-4 ${isDark ? "text-ivory/45" : "text-muted"}`}
              >
                Pack photography to follow
              </span>
            </div>
          )}
        </div>

        <div className="hairline mt-5 flex items-baseline justify-between gap-3 pt-4">
          <h3
            className={`t-title text-[1.4rem] ${isDark ? "text-ivory" : "text-forest"}`}
          >
            {product.name}
          </h3>
          {product.packSizes.length > 0 ? (
            <span
              className={`t-meta shrink-0 ${isDark ? "text-gold-soft" : "text-gold"}`}
            >
              {product.packSizes.join(" · ")}
            </span>
          ) : null}
        </div>

        <p
          className={`mt-2.5 text-sm leading-relaxed ${
            isDark ? "text-ivory/60" : "text-muted"
          }`}
        >
          {product.summary}
        </p>
      </Link>
    </article>
  );
}

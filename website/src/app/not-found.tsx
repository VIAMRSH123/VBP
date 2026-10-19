import Link from "next/link";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { NinetyOneMark } from "@/components/ui/NinetyOneMark";
import { categories } from "@/content/products";

export default function NotFound() {
  return (
    <section className="grain relative flex min-h-[72svh] items-center overflow-hidden bg-ivory pt-[72px]">
      <NinetyOneMark className="-right-8 top-1/4" size="lg" tone="light" />
      <div className="shell relative py-20">
        <p className="t-meta text-gold">Error 404</p>
        <h1 className="t-hero mt-6 max-w-[16ch] text-forest">
          That page isn&rsquo;t on the shelf.
        </h1>
        <p className="t-lead mt-7 max-w-[46ch] text-charcoal/75">
          The link may be from the old site. The portfolio is all here — rice,
          spices, pulses and sugar.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <MagneticButton href="/products" cursorLabel="VIEW">
            View the portfolio
          </MagneticButton>
          <MagneticButton
            href="/contact"
            variant="outline"
            className="text-forest"
          >
            Contact us
          </MagneticButton>
        </div>

        <ul className="hairline mt-14 flex flex-wrap gap-x-8 gap-y-3 pt-5">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/products/${category.slug}`}
                className="t-meta link-underline text-muted hover:text-forest"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

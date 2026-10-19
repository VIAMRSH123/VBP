import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { ProductCard } from "@/components/ui/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { NinetyOneMark } from "@/components/ui/NinetyOneMark";
import {
  categories,
  getCategory,
  getProductsByCategory,
  type CategorySlug,
} from "@/content/products";

type Params = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: `${category.name} — ${category.tagline}`,
    description: category.description,
    alternates: { canonical: `/products/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const items = getProductsByCategory(category.slug as CategorySlug);
  const hasPhotography = items.some((product) => product.image);

  return (
    <>
      <PageHero
        eyebrow={category.name}
        lines={[category.tagline]}
        description={category.description}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/products", label: "Products" },
        ]}
      />

      <section
        aria-label={`${category.name} products`}
        className="section bg-ivory pt-0"
      >
        <div className="shell">
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product, index) => (
              <Reveal key={product.slug} delay={(index % 3) * 0.06}>
                <ProductCard product={product} index={index} />
              </Reveal>
            ))}
          </div>

          {!hasPhotography ? (
            <Reveal className="hairline mt-14 pt-5">
              <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
                We don&rsquo;t yet have our own photography for this range, so
                these lines are listed without pack images rather than shown
                with stock pictures of someone else&rsquo;s product. Pack sizes
                and grades are quoted on enquiry.
              </p>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="dark-section section relative overflow-hidden">
        <NinetyOneMark className="-bottom-16 right-[4%]" size="lg" tone="dark" />
        <div className="shell relative grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 className="t-display text-ivory">
              Buying {category.name.toLowerCase()} for the trade?
            </h2>
            <p className="t-lead mt-5 max-w-[46ch] text-ivory/70">
              Tell us the volume and how often you order. We&rsquo;ll come back
              with availability, pack options and terms.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MagneticButton
              href="/contact#enquiry"
              variant="outline"
              className="text-ivory"
              cursorLabel="ENQUIRE"
            >
              Start a trade enquiry
            </MagneticButton>
          </div>
        </div>
      </section>
    </>
  );
}

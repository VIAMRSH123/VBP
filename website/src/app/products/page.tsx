import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { ProductCard } from "@/components/ui/ProductCard";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { categories, getProductsByCategory } from "@/content/products";

export const metadata: Metadata = {
  title: "Products — Rice, Spices, Pulses & Sugar",
  description:
    "The full TF Suncons portfolio: seven rice varieties from 1121 basmati to sona masoori, ground spices at 1 kg, pulses and sugar — supplied across Qatar in trade pack sizes.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        lines={["Everything", "we supply."]}
        description="Four categories, fourteen lines. Rice is the core; spices, pulses and sugar travel the same route and are held to the same handling."
        crumbs={[{ href: "/", label: "Home" }]}
      />

      <nav
        aria-label="Product categories"
        className="sticky top-[72px] z-30 border-y border-sand bg-ivory/90 backdrop-blur-sm"
      >
        <div className="shell flex gap-7 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`#${category.slug}`}
              className="t-meta link-underline whitespace-nowrap text-muted hover:text-forest"
            >
              {category.name}
              <span className="ml-2 text-gold">
                {getProductsByCategory(category.slug).length}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {categories.map((category, categoryIndex) => {
        const items = getProductsByCategory(category.slug);
        const isDark = categoryIndex % 2 === 1;

        return (
          <section
            key={category.slug}
            id={category.slug}
            aria-labelledby={`${category.slug}-heading`}
            className={`section scroll-mt-32 ${isDark ? "dark-section" : "bg-ivory"}`}
          >
            <div className="shell">
              <div className="grid gap-8 md:grid-cols-12">
                <SectionHeading
                  index={String(categoryIndex + 1).padStart(2, "0")}
                  label={`${items.length} ${items.length === 1 ? "line" : "lines"}`}
                  id={`${category.slug}-heading`}
                  lines={[category.name]}
                  className="md:col-span-4"
                />
                <Reveal delay={0.08} className="md:col-span-7 md:col-start-6 md:self-end">
                  <p
                    className={`t-lead ${isDark ? "text-ivory/70" : "text-charcoal/75"}`}
                  >
                    {category.description}
                  </p>
                </Reveal>
              </div>

              <div className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((product, index) => (
                  <Reveal key={product.slug} delay={(index % 4) * 0.05}>
                    <ProductCard
                      product={product}
                      index={index}
                      tone={isDark ? "dark" : "light"}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="section bg-paper">
        <div className="shell grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 className="t-display text-forest">
              Need a pack size or grade that isn&rsquo;t listed?
            </h2>
            <p className="t-lead mt-5 max-w-[48ch] text-charcoal/75">
              Pack weights, grades and formats vary by order. Tell us what you
              buy and we&rsquo;ll come back with what we can supply.
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <MagneticButton href="/contact#enquiry" cursorLabel="ENQUIRE">
              Start a trade enquiry
            </MagneticButton>
          </div>
        </div>
      </section>
    </>
  );
}

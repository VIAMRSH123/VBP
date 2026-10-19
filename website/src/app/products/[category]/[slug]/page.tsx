import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { ProductCard } from "@/components/ui/ProductCard";
import { company } from "@/content/company";
import {
  getCategory,
  getProduct,
  getProductsByCategory,
  products,
} from "@/content/products";

type Params = { params: Promise<{ category: string; slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({
    category: product.category,
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, slug } = await params;
  const product = getProduct(category, slug);
  if (!product) return {};

  return {
    title: `${product.name}${product.brand ? ` — ${product.brand}` : ""}`,
    description: product.summary,
    alternates: { canonical: `/products/${product.category}/${product.slug}` },
    openGraph: product.image
      ? {
          images: [{ url: product.image, width: 1000, height: 1000, alt: product.imageAlt }],
        }
      : undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { category: categorySlug, slug } = await params;
  const product = getProduct(categorySlug, slug);
  if (!product) notFound();

  const category = getCategory(categorySlug);
  const related = getProductsByCategory(product.category)
    .filter((item) => item.slug !== product.slug)
    .slice(0, 3);

  /* Product schema with only verifiable fields — no price, no availability,
     no aggregate rating, because none of those are published anywhere. */
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: category?.name,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.image ? { image: `${company.siteUrl}${product.image}` } : {}),
    manufacturer: { "@type": "Organization", name: company.legalName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <article>
        <section className="grain relative overflow-hidden bg-ivory pt-[72px]">
          <div className="shell grid items-center gap-12 py-14 md:grid-cols-12 md:gap-10 md:py-20">
            <div className="md:col-span-5">
              <Reveal>
                <nav aria-label="Breadcrumb">
                  <ol className="t-meta flex flex-wrap items-center gap-2 text-muted">
                    <li className="flex items-center gap-2">
                      <Link href="/products" className="link-underline">
                        Products
                      </Link>
                      <span aria-hidden="true" className="opacity-40">/</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Link
                        href={`/products/${product.category}`}
                        className="link-underline"
                      >
                        {category?.name}
                      </Link>
                      <span aria-hidden="true" className="opacity-40">/</span>
                    </li>
                    <li aria-current="page" className="text-gold">
                      {product.name}
                    </li>
                  </ol>
                </nav>
              </Reveal>

              {product.brand ? (
                <Reveal delay={0.05}>
                  <p className="t-meta mt-8 text-gold">{product.brand}</p>
                </Reveal>
              ) : null}

              <TextReveal
                as="h1"
                immediate
                delay={0.12}
                lines={[product.name]}
                className="t-display mt-4 text-forest"
              />

              <Reveal delay={0.18}>
                <p className="t-lead mt-7 max-w-[46ch] text-charcoal/75">
                  {product.description}
                </p>
              </Reveal>

              <Reveal delay={0.22} className="mt-10">
                <MagneticButton href="/contact#enquiry" cursorLabel="ENQUIRE">
                  Enquire about {product.name}
                </MagneticButton>
              </Reveal>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <div className="relative flex aspect-square items-center justify-center bg-paper p-10 md:p-16">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.imageAlt}
                    width={1000}
                    height={1000}
                    priority
                    sizes="(max-width: 768px) 90vw, 45vw"
                    className="h-full w-auto object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span
                      aria-hidden="true"
                      className="t-index block select-none text-[8rem] leading-none text-sand"
                    >
                      91
                    </span>
                    <p className="t-meta mt-6 text-muted">
                      Pack photography to follow
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="spec-heading" className="dark-section section">
          <div className="shell grid gap-12 md:grid-cols-12">
            <div className="md:col-span-4">
              <h2 id="spec-heading" className="t-display text-ivory">
                On the pack
              </h2>
              <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-ivory/60">
                Everything below is printed on the packaging or published by
                TFS. Grades, moisture and broken-grain specifications are shared
                on enquiry rather than guessed at here.
              </p>
            </div>

            <dl className="grid gap-x-6 gap-y-10 sm:grid-cols-2 md:col-span-7 md:col-start-6">
              {product.packSizes.length > 0 ? (
                <div className="hairline pt-5">
                  <dt className="t-meta text-ivory/50">Pack size</dt>
                  <dd className="t-title mt-3 text-ivory">
                    {product.packSizes.join(" · ")}
                  </dd>
                </div>
              ) : null}

              <div className="hairline pt-5">
                <dt className="t-meta text-ivory/50">Category</dt>
                <dd className="t-title mt-3 text-ivory">{category?.name}</dd>
              </div>

              <div className="hairline pt-5 sm:col-span-2">
                <dt className="t-meta text-ivory/50">Characteristics</dt>
                <dd className="mt-4">
                  <ul className="flex flex-wrap gap-2.5">
                    {product.attributes.map((attribute) => (
                      <li
                        key={attribute}
                        className="t-meta border border-ivory/20 px-3.5 py-2 text-ivory/80"
                      >
                        {attribute}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="section bg-ivory">
            <div className="shell">
              <div className="hairline flex items-baseline justify-between gap-4 pt-4">
                <h2 id="related-heading" className="t-title text-forest">
                  Also in {category?.name.toLowerCase()}
                </h2>
                <Link
                  href={`/products/${product.category}`}
                  className="t-meta link-underline shrink-0 text-forest"
                >
                  See all →
                </Link>
              </div>

              <div className="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item, index) => (
                  <Reveal key={item.slug} delay={index * 0.06}>
                    <ProductCard product={item} index={index} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}

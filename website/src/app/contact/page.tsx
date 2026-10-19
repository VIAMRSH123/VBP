import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { company } from "@/content/company";

export const metadata: Metadata = {
  title: "Contact — Industrial Area, Doha",
  description:
    "Reach Suncons Trading & Contracting W.L.L. in Doha's Industrial Area: Building No 493, Zone 57, Street 43. Call +974 4455 0945 or email info@tfsuncons.com.qa.",
  alternates: { canonical: "/contact" },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: company.legalName,
  alternateName: company.tradingName,
  url: `${company.siteUrl}/contact`,
  image: `${company.siteUrl}/brand/tfs-logo.png`,
  email: company.email,
  telephone: company.phones[0].display,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${company.address.building}, ${company.address.zone}, ${company.address.street}`,
    addressLocality: company.address.area,
    addressRegion: company.address.city,
    addressCountry: "QA",
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />

      <PageHero
        eyebrow="Contact"
        lines={["Industrial Area,", "Doha."]}
        description="The office and the stock are in the same place. Call during business hours, or send an enquiry and we'll come back to you."
        crumbs={[{ href: "/", label: "Home" }]}
      />

      <section aria-labelledby="details-heading" className="bg-ivory pb-20">
        <div className="shell">
          <h2 id="details-heading" className="sr-only">
            Contact details
          </h2>

          <Reveal stagger className="grid gap-10 md:grid-cols-3">
            <address className="hairline not-italic pt-5">
              <p className="t-meta text-muted">Address</p>
              <p className="t-title mt-4 text-[1.35rem] leading-snug text-forest">
                {company.address.building},<br />
                {company.address.zone}, {company.address.street},<br />
                {company.address.area},<br />
                {company.address.city}, {company.address.country}
              </p>
            </address>

            <div className="hairline pt-5">
              <p className="t-meta text-muted">Telephone</p>
              <ul className="mt-4 space-y-3">
                {company.phones.map((phone) => (
                  <li key={phone.display}>
                    <a
                      href={phone.href}
                      data-cursor-label="CALL"
                      className="t-title link-underline text-[1.35rem] text-forest"
                    >
                      {phone.display}
                    </a>
                    <span className="t-meta ml-3 text-muted">{phone.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hairline pt-5">
              <p className="t-meta text-muted">Email</p>
              <p className="mt-4">
                <a
                  href={`mailto:${company.email}`}
                  data-cursor-label="EMAIL"
                  className="t-title link-underline break-words text-[1.35rem] text-forest"
                >
                  {company.email}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <EnquirySection />
    </>
  );
}

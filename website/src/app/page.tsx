import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { ProofStrip } from "@/components/sections/ProofStrip";
import { CompanyIntro } from "@/components/sections/CompanyIntro";
import { PortfolioGrid } from "@/components/sections/PortfolioGrid";
import { RiceIndex } from "@/components/sections/RiceIndex";
import { SpiceBand } from "@/components/sections/SpiceBand";
import { SupplyJourney } from "@/components/sections/SupplyJourney";
import { QualitySection } from "@/components/sections/QualitySection";
import { EnquirySection } from "@/components/sections/EnquirySection";
import { company } from "@/content/company";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Organization schema — only fields that are verified on the official site.
 * No founding date, no employee count, no ratings.
 */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: company.legalName,
  alternateName: company.tradingName,
  url: company.siteUrl,
  logo: `${company.siteUrl}/brand/tfs-logo.png`,
  description: company.descriptor,
  email: company.email,
  telephone: company.phones.map((phone) => phone.display),
  address: {
    "@type": "PostalAddress",
    streetAddress: `${company.address.building}, ${company.address.zone}, ${company.address.street}`,
    addressLocality: company.address.area,
    addressRegion: company.address.city,
    addressCountry: "QA",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Hero />
      <ProofStrip />
      <CompanyIntro />
      <PortfolioGrid />
      <RiceIndex />
      <SpiceBand />
      <SupplyJourney />
      <QualitySection />
      <EnquirySection />
    </>
  );
}

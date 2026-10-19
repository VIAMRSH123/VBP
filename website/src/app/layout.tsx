import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { company } from "@/content/company";
import "./globals.css";

/**
 * Fraunces ships optional SOFT and WONK axes. We pin both to 0 in CSS, so
 * requesting them only adds weight to the font file — the variable font drops
 * from ~118 kB to ~60 kB without them.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: {
    default: `${company.tradingName} — Rice, Spices & Pulses Supplier in Doha, Qatar`,
    template: `%s — ${company.tradingName}`,
  },
  description:
    "Suncons Trading & Contracting W.L.L. supplies Indian rice, spices, pulses and sugar to Qatar's retail, industrial and food-service trade. Basmati, sona masoori and ground spices in trade pack sizes.",
  keywords: [
    "rice supplier Qatar",
    "basmati rice Doha",
    "sona masoori Qatar",
    "foodstuff trading Doha",
    "spices wholesale Qatar",
    "pulses supplier Qatar",
    "TFS Suncons",
  ],
  authors: [{ name: company.legalName }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_QA",
    url: company.siteUrl,
    siteName: company.tradingName,
    title: `${company.tradingName} — Rice, Spices & Pulses Supplier in Doha`,
    description: company.descriptor,
    images: [
      {
        url: "/products/bharat-gate.png",
        width: 1000,
        height: 1000,
        alt: "Bharat Gate 1121 premium basmati rice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${company.tradingName} — Rice, Spices & Pulses Supplier in Doha`,
    description: company.descriptor,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#13301f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} js-motion`}>
      <head>
        {/* Scroll-revealed elements start hidden. Without scripting nothing
            would ever reveal them, so turn the whole system off there. */}
        <noscript>
          <style>{`.js-motion [data-reveal],.js-motion [data-reveal-line] [data-line-inner],.js-motion [data-reveal-mask]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>
      </head>
      <body className="antialiased">
        <SmoothScroll />
        <CustomCursor />
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

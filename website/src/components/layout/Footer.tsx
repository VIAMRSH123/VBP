import Image from "next/image";
import Link from "next/link";
import { company } from "@/content/company";
import { categories } from "@/content/products";

const siteLinks = [
  { href: "/products", label: "All products" },
  { href: "/about", label: "About TFS" },
  { href: "/contact", label: "Contact" },
  { href: "/contact#enquiry", label: "Trade enquiry" },
] as const;

export function Footer() {
  return (
    <footer className="dark-section relative overflow-hidden">
      <div className="shell py-20 md:py-28">
        <div className="grid gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            {/* The mark is green-on-light, so on the forest footer it sits on
                its own ivory plate rather than disappearing into the panel. */}
            <span className="inline-flex bg-ivory px-5 py-3">
              <Image
                src="/brand/tfs-logo-light.png"
                alt="TFS Suncons"
                width={496}
                height={296}
                className="h-12 w-auto"
              />
            </span>
            <p className="t-lead mt-7 max-w-sm text-ivory/70">
              {company.descriptor}
            </p>
            <p className="t-meta mt-8 text-gold-soft">{company.positioning}</p>
          </div>

          <div className="md:col-span-3">
            <h2 className="t-meta text-ivory/50">Portfolio</h2>
            <ul className="mt-6 space-y-3.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products/${category.slug}`}
                    className="link-underline text-ivory/85 hover:text-ivory"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h2 className="t-meta text-ivory/50">Site</h2>
            <ul className="mt-6 space-y-3.5">
              {siteLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="link-underline text-ivory/85 hover:text-ivory"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <address className="not-italic md:col-span-2">
            <h2 className="t-meta text-ivory/50">Doha</h2>
            <p className="mt-6 text-ivory/85">
              {company.address.building},<br />
              {company.address.zone}, {company.address.street},<br />
              {company.address.area},<br />
              {company.address.city}, {company.address.country}
            </p>
            <ul className="mt-6 space-y-2">
              {company.phones.map((phone) => (
                <li key={phone.display}>
                  <a
                    href={phone.href}
                    className="link-underline text-ivory/85 hover:text-ivory"
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${company.email}`}
                  className="link-underline text-ivory/85 hover:text-ivory"
                >
                  {company.email}
                </a>
              </li>
            </ul>
          </address>
        </div>

        <div className="hairline mt-16 flex flex-col gap-3 pt-7 text-ivory/50 md:flex-row md:items-center md:justify-between">
          <p className="t-meta">
            © {new Date().getFullYear()} {company.legalName}
          </p>
          <p className="t-meta">Doha · Qatar</p>
        </div>
      </div>
    </footer>
  );
}

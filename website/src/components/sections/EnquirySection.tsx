"use client";

import { useId, useState } from "react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { company } from "@/content/company";
import { categories, products } from "@/content/products";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "sent" }
  | { state: "error"; message: string };

const businessTypes = [
  { value: "wholesale", label: "Wholesale / distribution" },
  { value: "retail", label: "Supermarket / retail" },
  { value: "hospitality", label: "Hotel / restaurant" },
  { value: "catering", label: "Catering / food service" },
  { value: "supplier", label: "Supplier / partnership" },
  { value: "other", label: "Something else" },
] as const;

const fieldClass =
  "w-full border-b border-sand bg-transparent py-3 text-charcoal outline-none transition-colors placeholder:text-muted/60 focus:border-forest";

const errorMessages: Record<string, string> = {
  invalid: "Some details are missing or look wrong — please check and try again.",
  rate_limited: "That's several enquiries in a short time. Please try again shortly.",
  not_configured:
    "The enquiry inbox isn't connected yet, so this form can't deliver your message.",
  delivery_failed: "We couldn't deliver that just now.",
};

export function EnquirySection() {
  const formId = useId();
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus({ state: "submitting" });

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as { ok: boolean; code?: string };

      if (response.ok && body.ok) {
        setStatus({ state: "sent" });
        form.reset();
        return;
      }

      setStatus({
        state: "error",
        message:
          errorMessages[body.code ?? ""] ?? "Something went wrong sending that.",
      });
    } catch {
      setStatus({
        state: "error",
        message: "We couldn't reach the server — check your connection.",
      });
    }
  }

  const isSubmitting = status.state === "submitting";

  return (
    <section
      aria-labelledby="enquiry-heading"
      className="section bg-ivory"
      id="enquiry"
    >
      <div className="shell grid gap-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-5">
          <SectionHeading
            index="08"
            label="Partnerships"
            id="enquiry-heading"
            lines={["Let's build", "a dependable", "supply line."]}
          />

          <Reveal delay={0.08}>
            <p className="t-lead mt-7 max-w-[44ch] text-charcoal/75">
              Tell us what you buy and how often. We&rsquo;ll come back with
              what we can supply, in what pack size, and on what terms.
            </p>
          </Reveal>

          <Reveal delay={0.12} as="dl" stagger className="mt-12 space-y-7">
            <div className="hairline pt-4">
              <dt className="t-meta text-muted">Prefer to call</dt>
              <dd className="mt-2 space-y-1">
                {company.phones.map((phone) => (
                  <div key={phone.display}>
                    <a
                      href={phone.href}
                      className="link-underline text-charcoal"
                      data-cursor-label="CALL"
                    >
                      {phone.display}
                    </a>
                    <span className="ml-2 text-sm text-muted">{phone.label}</span>
                  </div>
                ))}
              </dd>
            </div>
            <div className="hairline pt-4">
              <dt className="t-meta text-muted">Or email</dt>
              <dd className="mt-2">
                <a
                  href={`mailto:${company.email}`}
                  className="link-underline text-charcoal"
                  data-cursor-label="EMAIL"
                >
                  {company.email}
                </a>
              </dd>
            </div>
          </Reveal>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <Reveal>
            <form onSubmit={handleSubmit} noValidate={false} className="space-y-7">
              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${formId}-name`} className="t-meta text-muted">
                    Your name *
                  </label>
                  <input
                    id={`${formId}-name`}
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-company`} className="t-meta text-muted">
                    Company *
                  </label>
                  <input
                    id={`${formId}-company`}
                    name="company"
                    required
                    minLength={2}
                    autoComplete="organization"
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-email`} className="t-meta text-muted">
                    Email *
                  </label>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-phone`} className="t-meta text-muted">
                    Phone
                  </label>
                  <input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-type`} className="t-meta text-muted">
                    Business type *
                  </label>
                  <select
                    id={`${formId}-type`}
                    name="businessType"
                    required
                    defaultValue="wholesale"
                    className={`${fieldClass} mt-2`}
                  >
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`${formId}-interest`}
                    className="t-meta text-muted"
                  >
                    Interested in *
                  </label>
                  <select
                    id={`${formId}-interest`}
                    name="interest"
                    required
                    defaultValue="Rice"
                    className={`${fieldClass} mt-2`}
                  >
                    {categories.map((category) => (
                      <optgroup key={category.slug} label={category.name}>
                        <option value={category.name}>
                          {category.name} — the whole range
                        </option>
                        {products
                          .filter((product) => product.category === category.slug)
                          .map((product) => (
                            <option key={product.slug} value={product.name}>
                              {product.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={`${formId}-country`} className="t-meta text-muted">
                  Country
                </label>
                <input
                  id={`${formId}-country`}
                  name="country"
                  defaultValue="Qatar"
                  autoComplete="country-name"
                  className={`${fieldClass} mt-2`}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-message`} className="t-meta text-muted">
                  What do you need? *
                </label>
                <textarea
                  id={`${formId}-message`}
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Volumes, pack sizes, how often you order, where it ships to."
                  className={`${fieldClass} mt-2 resize-y`}
                />
              </div>

              {/* Honeypot — hidden from people, irresistible to bots. */}
              <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden">
                <label htmlFor={`${formId}-website`}>Website</label>
                <input
                  id={`${formId}-website`}
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <MagneticButton
                  type="submit"
                  disabled={isSubmitting}
                  cursorLabel="SEND"
                >
                  {isSubmitting ? "Sending…" : "Send enquiry"}
                </MagneticButton>

                <p
                  role="status"
                  aria-live="polite"
                  className="max-w-[34ch] text-sm leading-relaxed"
                >
                  {status.state === "sent" ? (
                    <span className="text-leaf">
                      Thank you — your enquiry has been sent. We&rsquo;ll be in
                      touch.
                    </span>
                  ) : null}
                  {status.state === "error" ? (
                    <span className="text-clay">
                      {status.message} Please call{" "}
                      <a href={company.phones[0].href} className="underline">
                        {company.phones[0].display}
                      </a>{" "}
                      or email{" "}
                      <a href={`mailto:${company.email}`} className="underline">
                        {company.email}
                      </a>
                      .
                    </span>
                  ) : null}
                </p>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: z.email().trim().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  businessType: z.enum([
    "wholesale",
    "retail",
    "hospitality",
    "catering",
    "supplier",
    "other",
  ]),
  interest: z.string().trim().max(80),
  message: z.string().trim().min(10).max(4000),
  /**
   * Honeypot — a real person never fills this in. It accepts any string so
   * that the "silently accept, deliver nothing" branch below is reachable;
   * rejecting it in the schema would hand bots a 422 to learn from.
   */
  website: z.string().max(400).optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

/**
 * Per-instance rate limit. Enough to stop a bot hammering the form; it is not
 * a distributed limiter, so a multi-instance deployment needs a shared store.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

async function deliver(enquiry: EnquiryInput): Promise<"sent" | "unconfigured"> {
  const webhookUrl = process.env.ENQUIRY_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_TO_EMAIL;
  const from = process.env.ENQUIRY_FROM_EMAIL;

  // Option 1 — post straight into a lead pipeline (e.g. the VBP backend).
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.ENQUIRY_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${process.env.ENQUIRY_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ source: "website", ...enquiry }),
    });
    if (!response.ok) {
      throw new Error(`Webhook responded ${response.status}`);
    }
    return "sent";
  }

  // Option 2 — email it.
  if (resendKey && to && from) {
    const lines = [
      `Name: ${enquiry.name}`,
      `Company: ${enquiry.company}`,
      `Email: ${enquiry.email}`,
      `Phone: ${enquiry.phone || "—"}`,
      `Country: ${enquiry.country || "—"}`,
      `Business type: ${enquiry.businessType}`,
      `Interested in: ${enquiry.interest}`,
      "",
      enquiry.message,
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: enquiry.email,
        subject: `Trade enquiry — ${enquiry.company}`,
        text: lines,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend responded ${response.status}`);
    }
    return "sent";
  }

  // Option 3 — nothing is wired up. Say so rather than faking a success.
  return "unconfigured";
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
    return NextResponse.json(
      { ok: false, code: "rate_limited" },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Honeypot filled in → accept silently, deliver nothing.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await deliver(parsed.data);
    if (result === "unconfigured") {
      return NextResponse.json(
        { ok: false, code: "not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Deliberately no enquiry contents in the log.
    return NextResponse.json(
      { ok: false, code: "delivery_failed" },
      { status: 502 },
    );
  }
}

# TFS Lead Management — How to Use This System

*A plain-language guide for sales reps and anyone running the dashboard day to day. No technical
knowledge needed — if you can send a WhatsApp message, you can use this.*

---

## What this system actually does

Every sales rep already sends WhatsApp messages when they get a new customer lead. This system reads
those messages automatically, using AI to pull out the important details (company, contact, product,
etc.), checks the information, figures out which sales rep should handle it, and puts it on a live
dashboard — all within seconds, with no extra app to install and no extra work for the rep beyond
sending one WhatsApp text in the right format.

Think of it like this: **you text a lead the same way you always have, and the system does everything
else** — sorting, assigning, tracking, and reminding.

---

## Part 1 — Sending a New Lead via WhatsApp

### Step 1: Who to text

Send your lead message to this number:

> **`[FILL IN: the WhatsApp number linked in the Wasender dashboard]`**

Text it exactly like you'd text any other contact. Nothing to install, nothing to log into.

### Step 2: The message format

Copy this template and fill in the blanks. **Keep the labels (`Company:`, `Contact:`, etc.) exactly
as shown** — the system reads these labels to know which piece of information is which.

```
Company: <Customer's Company Name>
Contact: <Contact Person's Name>
Phone: <Their Phone Number, starting with +>
Product: <What They Want to Buy>
Quantity: <How Many>
```

### Step 3: A real example

Here's exactly what a rep would type after meeting a new customer:

```
Company: Al Fardan Construction
Contact: Omar Al Fardan
Phone: +97455123456
Product: Cement
Quantity: 200
```

That's it. Send it, and within a few seconds it appears on the dashboard, already sorted and assigned.

### The 5 rules to remember

1. **Company, Contact, and Product are always required.** If any of these three is missing, the
   system can't build a usable lead record.
2. **Always include a Phone number or an Email** — at least one of the two, so someone can actually
   follow up with the customer. Phone numbers should start with `+` and the country code
   (e.g. `+974...` for Qatar), not a local format like `05512345`.
3. **Quantity is optional** — leave it out if you don't know it yet, that's fine. If you do include
   it, it just needs to be a real number bigger than zero.
4. **One customer per message.** Don't combine two different leads into a single text — send them as
   two separate messages.
5. **Keep each field on its own line**, labeled exactly as shown in the template. Don't rename
   "Contact" to "Name," don't drop the colon, don't reorder things wildly — the system is reading
   for these exact words.

### What happens automatically after you hit send

You don't need to do anything else — but here's what's actually happening behind the scenes, so you
understand why it's reliable:

1. **Within seconds**, your message shows up on the **Engagement** tab of the dashboard.
2. The system's AI reads it and fills in extra useful details automatically: what industry the
   customer is in, roughly how big the deal might be, and a priority score — so managers can see at a
   glance which leads matter most.
3. It automatically **assigns the lead to the best sales rep** for the job, based on which product
   they sell, which territory they cover, and how busy they currently are — no manual handoff needed.
4. If you accidentally send the **same customer's phone number twice** (say, to correct a typo or add
   a detail you forgot), the system is smart enough to **update the existing lead instead of creating
   a confusing duplicate**. So don't worry about "messing it up" — just resend a corrected version.
5. If your message is **missing something required** (like the product), the system still creates the
   lead — it just marks it as a **Draft** instead of losing it. See Part 3 below for what that means.

---

## Part 2 — Updating an Existing Lead's Status

Once a lead is on the dashboard, it gets a **Lead ID** like `L-10005` (visible on the dashboard).
Reps can send a status update the same way — just WhatsApp it in this format:

```
LeadID: L-10005
Status: Quote Sent
Remarks: Follow-up scheduled for Friday
```

Use whichever status matches where the deal actually is: `Contacted`, `Qualified`, `Quote Requested`,
`Quote Sent`, `Negotiation`, `Won`, or `Lost`. The `Remarks` line is optional but helpful — it shows up
in the lead's activity history so managers can see what's going on without having to ask.

---

## Part 3 — Understanding "Draft" Leads

If you ever see a lead sitting with a status of **Draft** on the dashboard, it means:

- Someone sent a WhatsApp message about a lead
- But it was missing something required (usually the product, or both phone *and* email were left out)
- **Nothing was lost** — the system kept everything it could read and just flagged it as incomplete

**What to do about a Draft lead:** find out the missing piece of information (call the customer back
if needed, or ask whoever sent the message) and either edit it directly on the dashboard, or send a
follow-up WhatsApp message with the complete details and it'll fill in automatically.

A Draft lead is not a mistake or an error message — it's the system's way of saying "I kept what you
sent me, just need one more thing to finish the job."

---

## Part 4 — Using the Dashboard

### Logging in

Go to the dashboard URL (ask whoever manages the system for the current address and your personal
login — **don't use the shared demo login**, everyone should have their own account).

### What each tab means

| Tab | What it shows |
|---|---|
| **Overview** | The big picture — total leads, how many are active, revenue forecast, anything urgent needing attention. Good for a quick daily check. |
| **Engagement** | Leads that are new or actively being worked — this is where fresh WhatsApp leads land first. |
| **Won** | Deals that closed successfully. |
| **Lost** | Deals that didn't close — still useful to review, to spot patterns. |
| **Rep Performance** | How each sales rep is doing — how many leads, how fast they respond, how many they close. |

There's also a menu (usually a grid icon in the top corner) with more detailed pages — full lead
lists, marketing analytics, notifications, and admin settings — for anyone who needs to dig deeper.

### A simple daily habit

Each morning, a quick glance at **Overview** and **Engagement** tells you: what's new, what needs a
response, and whether anything is overdue. The system also sends automatic reminders if a lead sits
untouched too long, so nothing quietly falls through the cracks.

---

## Part 5 — Common Questions

**"I sent a message but it's not showing up on the dashboard — what do I do?"**
Wait a minute and check again — it's normally instant, but occasionally there's a short delay. If
it still hasn't shown up after a few minutes, contact whoever manages the system (see Part 6) rather
than re-sending it repeatedly, since the issue is more likely on the technical side, not something
you did wrong.

**"I made a typo in a lead I already sent — do I need to fix it manually?"**
Just send the corrected version with the same phone number — the system will recognize it as the
same customer and update the existing lead instead of creating a second one.

**"What if I don't know the quantity yet?"**
Leave that line out entirely — it's optional. Company, Contact, Product, and a Phone or Email are
the only things that must be there.

**"Can I text this number for anything else, like a question?"**
No — this WhatsApp number is specifically for submitting/updating leads in the format above. It's not
a general chat line, and it's a shared business tool, not a personal contact — don't share it outside
the sales team or with customers directly.

---

## Part 6 — Who to Contact

If a lead doesn't show up, looks wrong, or something on the dashboard is confusing, reach out to
whoever manages the system technically before assuming you did something wrong — most issues at this
stage are on the technical/setup side, not the message you sent.

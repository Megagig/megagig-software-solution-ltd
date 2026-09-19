# project-requirements.md — Megagig Software Solution Ltd — Corporate Website

> Reference site being replicated (structure/behavior, not brand assets or copy): **https://www.desishub.com/**
> Reference architecture: **Grit Framework — Triple mode** (Web + Admin + API) — https://gritframework.dev/docs/concepts/architecture-modes/triple
> This file is the anti-scope-creep contract. If a feature isn't listed here, it isn't built without updating this file first.
> This is the **canonical requirements reference** for the coding agent on this project — the same role `project-requirements.md` plays on the BusinessCopilot build. `project-overview.md` remains in the folder as the original working draft; where the two ever diverge, this file wins.

---

## 1. What the product is

The Megagig website is a **marketing + case-study + lead-generation site** for Megagig Software Solution Ltd, an engineering-led software studio. It exists to do three jobs:

1. **Convince** a visiting business owner / founder / procurement manager that Megagig can be trusted to build production software for them.
2. **Prove it** with real, verifiable shipped products (PharmacyCopilot, BusinessCopilot, and future products) presented as case studies.
3. **Convert** the visitor into a lead — a quote request, a WhatsApp message, or a booked consultation — with as little friction as possible.

It is **not** an app. It has no end-user accounts on the public side. The only "logged-in" surface is the **admin panel**, used internally by Megagig staff to manage case studies, blog posts, testimonials, pricing, and incoming leads without redeploying code.

## 2. Who it's for

| Audience | What they're looking for on the site |
|---|---|
| SME / startup founder in Nigeria (or wider Africa) who needs custom software | Proof of past work in their industry, a clear "start a project" path, transparent-ish pricing signals |
| Pharmacy owners specifically | The PharmacyCopilot case study / product page, since it's Megagig's flagship vertical product |
| Businesses wanting an internal ops platform (POS, inventory, accounting, CRM, HR) | The BusinessCopilot case study, framed as a QuickBooks/UltimatePOS-class alternative built for Nigerian workflows |
| Other developers / technical evaluators | The stack badges (Next.js, Node/Go, Expo, Wails, Electron, MongoDB/Postgres), the Grit Framework mention, GitHub links |
| Job seekers / interns | Careers and internship pages |
| Existing clients | Contact page, support channels |

## 3. The problem it solves

Nigerian SMEs default to WhatsApp-only sales and generic global SaaS (QuickBooks, Shopify) that don't map to local workflows (mobile money, offline-first retail, naira pricing, local compliance). Megagig's pitch, mirrored by this site, is: **"we build software teams like yours actually adopt, priced and engineered for how your business runs locally."** The site's job is to make that credible in under 60 seconds of scrolling, using real shipped products as evidence rather than stock-photo claims.

## 4. Full user flow (public visitor)

1. Visitor lands on **Home** (organic search, referral, ad, or word of mouth).
2. Hero states what Megagig does + social proof strip (logos of real clients: PharmacyCopilot, BusinessCopilot, plus any future named clients).
3. Visitor scrolls through **Services** (bento-style cards) to confirm Megagig covers their need (e.g. "I need a POS system" → Desktop & POS Apps card).
4. Visitor checks **Products** or **Case Studies** to see it's real, not just promises — clicks into a case study for depth (problem → build → result).
5. Visitor checks **Pricing** page for a sense of investment level (custom-quote model, not fixed price, but categorized).
6. Visitor reads **About / Team** to see who's behind it (founder bio, story, stats).
7. Visitor is nudged, at multiple scroll points, toward the primary CTA: **"Start a project" / "Get a free quote."**
8. Visitor fills the **quote/contact form** (or clicks WhatsApp / email / phone) — this is the conversion event.
9. Submission is stored via the API, triggers a notification email to the Megagig team (Resend) and a confirmation email to the visitor, and appears as a new lead in the **admin panel**.
10. Staff use the admin panel to triage leads, update case studies as new projects ship, and publish blog posts — none of which requires a code deploy.

## 5. Page-by-page functionality (apps/web — public site)

### 5.1 Home (`/`)
- Hero: headline, subhead, primary CTA ("Start a project"), secondary CTA ("See our work"), availability badge ("Available for new projects"), founding year / location strip.
- Rotating/auto-scrolling showcase of product screenshots (PharmacyCopilot desktop/web, BusinessCopilot web/admin, future products).
- **Featured clients** logo strip (static list, admin-editable).
- **Recent clients / case study preview cards** — pulled from the case-study resource, newest first, capped at N (configurable), each linking to `/case-study/[slug]`.
- **Tech stack strip** — icon + label pairs (Next.js, Node.js or Go, MongoDB/PostgreSQL, Electron, Expo, Wails, Tailwind) — static config, not admin-editable in v1.
- **Services** section — bento grid of service cards (see §6 ui-rules for card anatomy), each linking to its own `/services/[slug]` page.
- **Products** section — cards for Megagig's own shipped products (PharmacyCopilot, BusinessCopilot), each with a 3–4 bullet feature list and "Explore product" link to `/product/[slug]`.
- **Selected work** — full case-study grid, same cards as Home preview but exhaustive, anchor `#selected-work`.
- **Pricing** teaser — service-category cards with "Custom quote" + link to `/pricing` or straight to the quote form.
- **Quote CTA band** — headline, "Request a Quote" button (opens `/start-project` or in-page form), WhatsApp button, direct email/phone.
- **Testimonials** — carousel/slider of client quotes, each with founder name, company, and a "Visit [Company]" verification link. Sourced from the testimonial resource, admin-editable.
- **Founder spotlight** — photo, quote, 2–3 paragraph bio, links (portfolio, GitHub, LinkedIn).
- **Our story** section — founding year, mission statement, 2 stat callouts (e.g. "End-to-end product delivery", "In-house engineering team").
- **FAQ accordion** — 3–6 common questions ("How long does a typical project take?", "Do you offer post-launch support?", "Can you help with digital strategy?"). Admin-editable list.
- **Contact block** — email, phone, address, a compact contact form (name, email, message) that posts to the same lead endpoint as the quote form, tagged with a different `source`.
- **Closing CTA band** — repeat primary/secondary CTAs, plus 3 trust stats (track record, students trained / projects shipped, uptime %).
- **Footer** — sitemap (Products / Services / Resources / Company columns), social links, contact line, copyright, back-to-top control.

### 5.2 Services index (`/services`) and detail (`/services/[slug]`)
- Index lists every service card in a grid; detail page has: hero (service name + one-liner), what's included (bullet list), typical stack used, a relevant screenshot/illustration, and a quote CTA scoped to that service (pre-fills a "service interested in" field on the form).
- Initial service set (mirrors the reference site's coverage, adapted to Megagig's actual capability from `[[pharmacycopilot]]`/`[[business-platform-proposal]]` history): Web Design & Development, Custom Software / SaaS Platforms, Mobile App Development, Desktop & POS Apps, AI Automation, UI/UX Design, Tech Consultation & Architecture Review, IT Training & Internships.

### 5.3 Products index (`/products`) and detail (`/product/[slug]`)
- Products Megagig itself owns and operates (not client work): **PharmacyCopilot** (pharmacycopilot.com.ng — cross-platform pharmacy management SaaS: web, desktop, mobile, offline-first) and **BusinessCopilot** (businesscopilot.com.ng — unified POS/inventory/accounting/CRM/HR/BI platform for SMEs).
- Each detail page: what it is, who it's for, feature bullets, platforms supported, "Explore product" outbound link to the live product site, and (where relevant) a link to its docs site.

### 5.4 Case studies index (`/case-studies`) and detail (`/case-study/[slug]`)
- Index: full grid of every case study, filterable by category/industry (optional v2 filter chips: Fintech, Retail, Healthcare, Hospitality — deferred if time-boxed).
- Detail: client name, category tag(s), status badge ("Live in production"), hero image/screenshot, "The problem," "What we built," "The result," tech stack used, and (optional) an embedded testimonial quote if one exists for that client. Content is fully admin-managed — no code change needed to add a new case study.

### 5.5 Pricing (`/pricing`)
- Category cards (Web Design & Development, Mobile App Development, UI/UX Design, Desktop App Development, IT Training, AI Automation & Integration, Consultation) each showing "Custom quote" rather than fixed numbers, consistent with a bespoke-project business model.
- CTA band identical in behavior to Home's quote CTA.

### 5.6 Start a project / Get a quote (`/start-project` or `/get-quote`)
- The primary conversion form: name, email, phone, company, budget range (select), project type (select, matches service list), message/description, optional file attachment (future — flagged out of scope for v1, see §7).
- On submit: validated client-side with the shared Zod schema, POSTed to the API, stored as a `Lead`, triggers Resend emails (internal notification + visitor confirmation), and redirects to a `/thank-you` state or shows an inline success message.

### 5.7 Contact (`/contact-us`)
- Same lead form as §5.6 but tagged `source: contact`, plus direct-contact cards (email, phone, WhatsApp deep link, physical address if applicable) and an embedded map (optional, v2).

### 5.8 About (`/about-us`), Team (`/team`), Careers (`/careers`), Brand (`/brand`)
- About: founding story, mission, stats — **all admin-managed, nothing hard-coded** (decided 2026-09-19, overriding the earlier "static for v1" scope). Sections: hero (mission + "Since {founded year}"), founding story (optional), stats, values, timeline milestones, founder spotlight, how-we-work steps, and a products + case-study proof strip, then the quote CTA band. Every section renders only when it has published content. Home's Our Story / Founder spotlight / Closing CTA and `/pricing`'s stats row read the same data.
- Team: grid of team member cards (photo, name, role, socials) — admin-managed resource. Socials are GitHub, LinkedIn and X, each optional (a button renders only when set); the page shows a short empty state when no member is published.
- Careers: open roles list (admin-managed resource) + a "no open roles right now, but send your CV" fallback state. Roles expand in place (no per-role page); "Apply" goes to the role's own link or, when blank, the general CV email; "send your CV" is a `mailto:` to the Site Settings contact email (no upload — see §7). Includes an admin-managed values block and a link to the IT training & internships service.
- Brand: logo download links, color/usage guidelines (mirrors ui-tokens.md content in a public-friendly format) — static page, v2/nice-to-have.

### 5.9 Blog (`/blog`, `/blog/[slug]`)
- Standard blog index + post detail. Posts are an admin-managed resource with title, slug, cover image, excerpt, body (rich text/MDX), author, published date, tags. SEO metadata per post. The public pages are server-rendered: the index is paginated (9 per page) with a featured latest post and tag filtering via plain `?tag=` / `?page=` links; the detail page shows a byline (the assigned author, or the company when none is set), reading time, a sanitized body, share links (WhatsApp, X, LinkedIn, copy link), related posts by shared tags, and Open Graph / JSON-LD metadata from `seo_title` / `seo_description`. A post with no cover image gets a designed fallback tile.

### 5.10 Legal (`/privacy`, `/legal`)
- Static long-form content pages, admin-editable as a "page" resource or hard-coded MDX — either is acceptable; recommend hard-coded MDX for v1 since legal text changes rarely and should go through review, not a live-editable form.

### 5.11 Global chrome
- **Navbar** (marketing group layout): logo, Services, Solutions/Products, Case Studies, Pricing, Contact, theme toggle (light/dark), primary "Start a project" button. Sticky, condenses on scroll.
- **Footer**: as described in §5.1, present on every marketing page.
- **WhatsApp floating action button**: persistent, bottom-right, deep-links to `wa.me/<megagig-number>`.

## 6. apps/admin — internal scope

The admin panel is **internal-only** (Megagig staff), not client-facing. It exists purely so non-technical team members can keep the public site current without a developer.

Resources managed via `defineResource()` + generated DataTable/FormBuilder pages:
- **Leads** — every quote/contact submission: list, filter by status (New / Contacted / Quoted / Won / Lost), view detail, add internal notes, mark status. No public-facing edit surface.
- **CaseStudies** — client name, slug, category tags, status badge, hero image, problem/build/result rich text, tech stack tags, testimonial link, published flag, sort order.
- **Products** — Megagig's own products (name, slug, description, feature bullets, live URL, docs URL, screenshot(s), published flag).
- **Testimonials** — quote text, author name, author role, company name, company URL, avatar, linked case study (optional), published flag.
- **TeamMembers** — name, role, `photo_url` (a plain URL/path set through the admin image upload zone, not an `Upload` relation), optional LinkedIn/GitHub/X URLs, sort order, published flag.
- **JobOpenings** — title, department, location, employment type (Full-time / Part-time / Contract / Internship), description, optional apply link/email (blank = general CV email), open/closed flag (the publish switch).
- **BlogPosts** — full CMS fields as in §5.9, plus draft/published state and scheduled publish date (v2).
- **FAQs** — question, answer, sort order, published flag.
- **SiteSettings** — singleton resource: contact email/phone/WhatsApp number, social links, pricing-category blurbs, hero headline/subhead, plus the About & founder copy (mission statement, founded year, founding story, founder name/role/quote/bio/photo/links) so copy tweaks don't need a deploy.
- **Stats** — value, label, sort order, published flag. The single source for every trust-number strip (max 4 shown per section, ui-rules.md §10; Home's Our Story shows the first 2).
- **AboutItems** — one resource with `kind` = `value` | `milestone` | `step`, plus title, description, optional milestone `label`, sort order, published flag. Feeds the About page's Values, Timeline and How-we-work sections.

Admin dashboard (`app/page.tsx`): stats cards (new leads this week, total case studies published, total products), a simple leads-over-time chart widget, and an activity widget (latest 10 leads / latest 10 blog posts).

Admin auth: single role tier is enough for v1 (`admin`). Multi-role (`editor` vs `admin`) is a v2 nice-to-have, not required to launch.

## 7. Explicitly out of scope (v1)

To prevent scope creep, the following are **not** built in the initial build, even though the reference site or an eager agent might be tempted to add them:

- No end-user (visitor) accounts, login, or dashboard of any kind on the public site.
- No e-commerce / checkout / payment collection on the marketing site itself (PharmacyCopilot and BusinessCopilot handle payments in their own products — this site only links out to them).
- No live chat widget beyond the WhatsApp deep link (no in-house chat backend).
- No file uploads on the quote form in v1 (attach-a-brief can be a v2 addition using the existing `internal/storage` presigned-upload pattern).
- No multi-language / i18n (English only for v1).
- No case-study filter chips / tag search on `/case-studies` in v1 (ship as a flat newest-first grid first; filtering is additive later).
- No CMS-style visual page builder — content is structured fields (DataTable/FormBuilder), not drag-and-drop blocks.
- No blog comments.
- No analytics dashboard beyond the admin's basic stats widgets (use a third-party analytics tool for deep analytics, wired in later, not built from scratch).
- No client portal, invoicing, or project-management surface — that is a separate future product, not this website.

## 8. Success criteria

- A visitor can go from landing on `/` to submitting a qualified lead in under 3 clicks / 90 seconds.
- Every piece of "social proof" content (case studies, testimonials, team, FAQs, blog) is editable from the admin panel with zero code changes.
- Lighthouse/Core Web Vitals: green on Performance, Accessibility, Best Practices, SEO for the marketing pages (Next.js SSR/ISR on `apps/web`).
- Site is fully responsive and passes the same design-system checks defined in `ui-rules.md` and `ui-tokens.md`.

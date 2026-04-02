# Service Page Implementation Guide

## Summary

This guide explains how to implement the shared Rexford service-page layout for any service type using the current reusable template system.

The goal is to keep every service page consistent with the approved consultative landing-page pattern:

- advisor-led hero
- scenario-driven guidance
- practical process section
- executive-summary lender guidance
- markdown body for deeper advisory detail
- FAQ section
- related services
- sticky desktop form and mobile form near the top

The Commercial Real Estate page is the reference implementation. New and existing service pages should follow the same structure without reintroducing one-off template logic, duplicated loan-type labels, or legacy content blocks that fight the shared layout.

## Desired Outcome

When implementation is complete for a service page, the result should be:

1. The page uses [layouts/services/single.html](file:///Users/saiaj/Projects/rexford_cc_website/layouts/services/single.html) with no service-specific template fork.
2. The service identity is sourced from [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json), including its canonical `loanType`.
3. The form preselects the correct loan type automatically.
4. The page reads like an advisor-led financing guide, not a generic program description.
5. The markdown body complements the shared layout instead of duplicating the hero or intro sections.
6. Sticky bar behavior, contact attribution, and service-page analytics work without additional custom JavaScript.
7. The page passes `make ci` and looks correct on desktop and mobile.

## Source Of Truth

Before editing content, use these files as the canonical references:

- Shared service template: [layouts/services/single.html](file:///Users/saiaj/Projects/rexford_cc_website/layouts/services/single.html)
- Shared inline form: [layouts/partials/lead-form-inline.html](file:///Users/saiaj/Projects/rexford_cc_website/layouts/partials/lead-form-inline.html)
- Shared loan-type options: [layouts/partials/loan-type-options.html](file:///Users/saiaj/Projects/rexford_cc_website/layouts/partials/loan-type-options.html)
- Canonical service registry: [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json)
- Shared frontend behavior: [assets/js/main.js](file:///Users/saiaj/Projects/rexford_cc_website/assets/js/main.js)
- Shared service styling: [assets/css/main.css](file:///Users/saiaj/Projects/rexford_cc_website/assets/css/main.css)
- Global runtime/config values: [hugo.toml](file:///Users/saiaj/Projects/rexford_cc_website/hugo.toml)
- Reference content pattern: [content/services/commercial-real-estate.md](file:///Users/saiaj/Projects/rexford_cc_website/content/services/commercial-real-estate.md)

## Implementation Workflow

Follow these steps in order for each service page.

## Step 1: Confirm The Service Exists In The Shared Registry

Open [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json) and confirm the service has:

- `slug`
- `name`
- `loanType`
- `icon`
- `short`
- `category`

Rules:

1. `loanType` is the canonical value used by forms and analytics.
2. `name` is the user-facing service label used in cards and related-service UI.
3. If the service is new, add it here before touching templates.
4. Do not hardcode the loan type in a template or form.

Example:

```json
{
  "slug": "bridge-loans",
  "name": "Bridge Loans",
  "loanType": "Bridge Loans",
  "icon": "arrow-right",
  "short": "Short-term financing to bridge the gap between purchase and permanent financing.",
  "category": "real-estate"
}
```

## Step 2: Create Or Update The Service Markdown File

Each service page should live in `content/services/<slug>.md`.

If the file already exists, keep the existing slug and URL. Do not create a duplicate page.

Minimum required front matter:

```yaml
---
title: "Bridge Loans"
description: "Short-term bridge financing for time-sensitive real estate opportunities."
summary: "Bridge loans help you move quickly between acquisition, renovation, refinance, or sale milestones."
loanRange: "$100,000 – $20,000,000"
timeToClose: "5–20 days"
icon: "arrow-right"
useCases:
  - "Purchase before long-term financing is ready"
  - "Time-sensitive property acquisition"
eligibility:
  - "Clear exit strategy"
  - "Property valuation support"
faqs:
  - q: "When does a bridge loan make sense?"
    a: "Bridge financing is useful when speed matters and conventional timelines are too slow."
relatedServices:
  - "fix-and-flip"
  - "commercial-real-estate"
---
```

Recommended optional front matter for stronger pages:

- `heroBadge`
- `heroTitle`
- `heroIntro`
- `heroPoints`
- `reassurancePoints`
- `scenarioHeading`
- `scenarioLead`
- `scenarioCards`
- `processHeading`
- `processLead`
- `processSteps`
- `lenderHeading`
- `lenderLead`
- `lenderConsiderations`

Use the Commercial Real Estate page as the model for how much guidance to provide.

## Step 3: Write The Hero Inputs For A Semi-Warm Audience

The shared template can render a generic service page, but the strongest result comes from intentional front matter.

When writing hero content:

1. Lead with the borrower situation, not the product name.
2. Sound like a broker/advisor, not a direct lender.
3. Keep the copy crisp and practical.
4. Emphasize fit, timing, lender path, and decision-making clarity.
5. Avoid vague marketing phrases like “best rates” or “fast approvals” unless the claim is precise and defensible.

Good direction:

- “Need to move before permanent financing is ready?”
- “Comparing SBA and conventional options?”
- “Trying to refinance short-term debt without wasting time on the wrong lenders?”

Avoid:

- “We offer the best financing solutions for your business needs”
- “Apply now for fast approval”
- “We make loans for every situation”

## Step 4: Build The Scenario Section Around Real Conversations

If possible, use `scenarioCards` instead of relying only on `useCases`.

Each scenario card should describe:

1. The situation the prospect is in.
2. The financing decision they are trying to make.
3. The clarity Rexford helps provide.

Example shape:

```yaml
scenarioCards:
  - title: "Purchase before long-term financing is ready"
    body: "You need to move quickly now and want a realistic takeout plan before you commit."
  - title: "Refinance a maturing short-term loan"
    body: "You want to understand whether the current property, timing, and exit path support a cleaner structure."
```

If there are no strong scenarios yet, the template can fall back to `useCases`, but `scenarioCards` is the better pattern.

## Step 5: Make The Process Section Advisory, Not Administrative

The process section should describe how Rexford evaluates the deal, not a generic application funnel.

Good process steps:

- clarify the goal
- pressure-test the likely lending path
- match the deal to likely-fit lenders
- stay involved through underwriting and closing

Avoid process steps like:

- fill out form
- submit application
- wait for approval

The page should feel like guided deal evaluation, not lead-gen boilerplate.

## Step 6: Use The Executive Summary To Frame Lender Thinking

The executive-summary block on the left flow is populated by `lenderConsiderations` or, if omitted, `eligibility`.

Use short, decision-oriented bullets that reflect what lenders usually focus on first.

Best practices:

1. Keep each item concise.
2. Focus on underwriting reality, not promotional language.
3. Use this section to help the prospect self-qualify and understand lender fit.

Examples:

- available liquidity and down payment
- property cash flow and lease profile
- borrower experience and entity structure
- use of proceeds and timeline

## Step 7: Rewrite The Markdown Body To Support The Shared Layout

This step is critical for older service pages.

The markdown body should no longer start with legacy all-caps headings or a repeated service title. The shared template already provides the hero, scenario framing, process section, and lender summary.

Remove patterns like:

- `## BRIDGE LOANS`
- `### Bridge Loans`
- repeated title blocks
- introductory copy that duplicates the hero

Replace them with deeper advisory content, such as:

- when this financing tends to fit
- what lenders usually want clarified early
- tradeoffs between structures
- common constraints or timing issues
- how Rexford helps evaluate the path

Good body structure:

```md
Bridge financing is usually about timing. When a purchase, renovation plan, refinance, or payoff deadline moves faster than permanent financing, we help you size up the likely structure and exit path before the file gets heavy.

## When bridge financing tends to fit

- Purchase before long-term financing is ready
- Acquisition plus light or moderate improvements

## What lenders usually want clarified early

- The property, purchase price, and current value story
- The expected hold period and exit strategy

## How we help you pressure-test the exit

Bridge money can solve a real timing problem, but only if the takeout path is realistic.
```

## Step 8: Set Related Services Carefully

Each page should include `relatedServices` in front matter using service slugs from [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json).

Rules:

1. Use existing slugs only.
2. Pick services that are naturally adjacent in a real financing conversation.
3. Prefer two related services unless there is a reason for more.

Examples:

- Bridge Loans → Fix & Flip, Commercial Real Estate
- Business Line of Credit → Small Business Loans, Equipment Financing
- Rental Property Loans → Commercial Real Estate, Bridge Loans

## Step 9: Do Not Add Service-Specific Template Logic Unless The Pattern Truly Changes

If a service needs stronger messaging, handle that in content front matter first.

Only change [layouts/services/single.html](file:///Users/saiaj/Projects/rexford_cc_website/layouts/services/single.html) when:

1. the improvement benefits all service pages, or
2. the change introduces a clearly reusable pattern.

Do not:

- add a one-off conditional for a single service unless absolutely necessary
- hardcode a service-specific loan type in the template
- duplicate markup that the shared template already handles

## Step 10: Trust The Shared Form And Analytics Plumbing

The service-page pattern already supports:

- canonical loan-type preselection from [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json)
- mobile form near the top
- sticky desktop form
- sticky bottom bar on service pages
- service-page contact attribution
- service-page view tracking

That means you should not add per-service JavaScript for form behavior or CTA tracking unless a new shared requirement appears.

If the page is using the standard template and the service slug exists in the registry, the shared logic should already work.

## Step 11: Verify The Page Locally

After updating a service page, run:

```bash
make ci
```

Then manually check the page in `make serve`.

Desktop checks:

1. Hero reads clearly and matches the service.
2. Sticky sidebar form stays visible and preselects the correct loan type.
3. Executive summary appears in the left flow before the markdown body.
4. Related services render correctly.
5. Sticky bottom bar appears after the hero scrolls away.

Mobile checks:

1. Mobile form appears near the top.
2. Page sections stack cleanly.
3. CTA buttons remain readable and tappable.
4. FAQ and related services are easy to scan.

Content checks:

1. No duplicated title or intro block appears in the markdown body.
2. Tone stays concise, direct, and advisor-led.
3. Rexford is clearly positioned as a broker helping prospects find lenders, not a direct lender.

## Step 12: Final Pre-Publish Review

Before considering the page complete, confirm all of the following:

- service exists in [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json)
- `loanType` is correct and matches the intended form label
- front matter is complete enough for the shared template
- markdown body does not duplicate the hero structure
- related services use valid slugs
- `make ci` passes
- desktop and mobile layout both look correct

## Recommended Rollout Order For The Remaining Service Pages

If you are normalizing the full set, use this order:

1. Bridge Loans
2. Fix & Flip
3. Rental Property Loans
4. Business Line of Credit
5. Equipment Financing
6. Small Business Loans

Why this order:

1. The real-estate pages are closest to the Commercial Real Estate reference pattern.
2. They make it easier to confirm the shared structure works across closely related deal types first.
3. The business-financing pages can then be adjusted with the same content model once the pattern is stable.

## Common Mistakes To Avoid

- hardcoding loan-type labels in templates or form markup
- using singular and plural loan-type variants inconsistently
- leaving legacy all-caps headings in the markdown body
- writing hero copy like a generic lender ad
- turning the process section into an application funnel
- creating one-off CSS or JS for a single service when the shared pattern already handles it
- forgetting to update `relatedServices`

## Quick Implementation Checklist

Use this checklist for each page:

1. Confirm service entry in [data/services.json](file:///Users/saiaj/Projects/rexford_cc_website/data/services.json).
2. Open or create `content/services/<slug>.md`.
3. Add or refine front matter for hero, scenarios, process, lender guidance, FAQs, and related services.
4. Rewrite the markdown body so it starts with deeper advisory content, not a repeated heading block.
5. Run `make ci`.
6. Review locally on desktop and mobile.
7. Confirm form preselection, sticky bar behavior, and overall polish.

## Final Outcome

If this guide is followed, every Rexford service page should feel like part of the same intentional system:

- one reusable template
- one canonical service registry
- one shared form behavior model
- one consistent advisor-led page structure
- no naming drift across service labels, form selections, and analytics

That keeps future service launches faster, safer, and easier to maintain.

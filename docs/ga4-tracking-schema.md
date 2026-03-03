# GA4 Analytics Tracking Schema

**Measurement ID:** `G-8WDEYDE03M`
**Implementation:** `assets/js/main.js`
**Tag location:** `layouts/partials/head.html`

---

## Overview

The site uses Google Analytics 4 with custom event tracking. The gtag snippet
loads via the `ga4ID` param in `hugo.toml` and is conditionally rendered in
`head.html` (skipped when the value is the placeholder string).

All custom events are fired through a `trackEvent()` wrapper that guards against
`gtag` being undefined (ad blockers, slow connections).

---

## Automatic Events (GA4 Built-in)

These are collected automatically by the `gtag('config', ...)` call:

| Event | Description |
|---|---|
| `page_view` | Every navigation (page path, referrer, title) |
| `session_start` | New session begins |
| `first_visit` | First-time visitor |
| `user_engagement` | 10+ seconds on site |
| `scroll` | User scrolls 90% of the page (requires Enhanced Measurement) |

---

## Custom Events

### Conversion Events (mark as Key Events in GA4)

#### `phone_click`

Fires when a user taps or clicks any `tel:` link on the site.

| Parameter | Type | Values |
|---|---|---|
| `link_location` | string | `hero`, `header`, `cta_band`, `get_started`, `footer`, `other` |

**Trigger:** Delegated `click` listener on `a[href^="tel:"]`. Location is
determined by the closest semantic container (`.hero`, `.site-header`,
`.cta-band`, `.gs-sidebar`, `.site-footer`).

---

#### `form_submit`

Fires after a successful inquiry form submission (server returns 2xx).

| Parameter | Type | Example Values |
|---|---|---|
| `form_source` | string | `Homepage Hero Form`, `Get Started Page` |
| `loan_type` | string | `Commercial Real Estate`, `Fix & Flip`, `Bridge Loan`, etc. |
| `loan_amount` | string | `Under $100K`, `$100K-$250K`, `$500K-$1M`, etc. |

**Trigger:** Inside the existing form submit handler, after `response.ok` check.
Fires before the redirect to `/thank-you/`.

---

#### `email_click`

Fires when a user clicks any `mailto:` link on the site.

| Parameter | Type | Values |
|---|---|---|
| `link_location` | string | `cta_band`, `team`, `footer`, `other` |

**Trigger:** Delegated `click` listener on `a[href^="mailto:"]`.

---

### Engagement Events

#### `form_start`

Fires once per page load when a user focuses into any field on an inquiry form.
Used to measure form abandonment (`form_start` without `form_submit`).

| Parameter | Type | Example Values |
|---|---|---|
| `form_source` | string | `Homepage Hero Form`, `Get Started Page` |

**Trigger:** `focusin` listener on `.js-inquiry-form` elements. A `started`
flag prevents duplicate fires within the same page load.

---

#### `cta_click`

Fires when a user clicks a link that navigates to `/get-started/` (e.g., "Get
Started" button, "Tell Us What You Need" link).

| Parameter | Type | Example Values |
|---|---|---|
| `link_text` | string | `Get Started`, `Tell Us What You Need →`, `Start the Conversation →` |
| `link_location` | string | `header`, `hero`, `how_it_works`, `cta_band`, `other` |

**Trigger:** Delegated `click` listener on `a[href="/get-started/"]` and
`a[href*="get-started"]`.

---

#### `service_view`

Fires on page load when the current URL starts with `/services/`.

| Parameter | Type | Example Values |
|---|---|---|
| `service_name` | string | `bridge-loans`, `equipment-financing`, `commercial-real-estate` |

**Trigger:** Pathname check on `DOMContentLoaded`. The slug is extracted by
stripping `/services/` and trailing slashes.

---

### Exploration Events

#### `blog_read`

Fires once when a reader scrolls past 75% of a blog post's `.prose` content.

| Parameter | Type | Example Values |
|---|---|---|
| `post_title` | string | `SBA Loans vs. Conventional Business Loans: What's Right for You?` |

**Trigger:** An `IntersectionObserver` watches an invisible marker element
inserted at the 75% point of `.prose` children. The observer disconnects after
firing once.

---

#### `outbound_click`

Fires when a user clicks a link to an external domain (BBB seal, LinkedIn,
Facebook, etc.).

| Parameter | Type | Example Values |
|---|---|---|
| `link_url` | string | `https://www.bbb.org/...`, `https://www.linkedin.com/...` |
| `link_text` | string | First 50 characters of the link's text content |

**Trigger:** Delegated `click` listener on all `a[href]` elements. Filters to
links where `href` starts with `http` and `hostname` differs from the current
site.

---

### Debug Events

#### `form_error`

Fires when a form submission fails (network error or non-2xx server response).

| Parameter | Type | Example Values |
|---|---|---|
| `form_source` | string | `Homepage Hero Form`, `Get Started Page` |
| `error_message` | string | `Request failed with status 502`, `Failed to fetch` |

**Trigger:** Inside the `catch` block of the form submit handler.

---

## GA4 Custom Dimensions

Register these in **Admin → Custom definitions → Custom dimensions** so event
parameters appear in GA4 reports. All are event-scoped.

| Dimension Name | Event Parameter | Used By Events |
|---|---|---|
| Link Location | `link_location` | `phone_click`, `email_click`, `cta_click` |
| Loan Type | `loan_type` | `form_submit` |
| Loan Amount | `loan_amount` | `form_submit` |
| Form Source | `form_source` | `form_start`, `form_submit`, `form_error` |
| Service Name | `service_name` | `service_view` |
| Post Title | `post_title` | `blog_read` |
| Link Text | `link_text` | `cta_click`, `outbound_click` |

---

## Key Events (Conversions)

Mark these three events as **Key Events** in **Admin → Key events**:

1. `phone_click` — highest intent conversion
2. `form_submit` — direct lead capture
3. `email_click` — lowest friction conversion

---

## UTM Parameters for Cold Emails

All links in cold outreach emails should include UTM parameters so GA4 can
attribute traffic to specific campaigns:

```
https://rexfordcommercialcapital.com/get-started/?utm_source=cold_email&utm_medium=email&utm_campaign=<campaign_name>&utm_content=<loan_type>
```

| Parameter | Value | Notes |
|---|---|---|
| `utm_source` | `cold_email` | Always this value for outbound emails |
| `utm_medium` | `email` | GA4 standard channel grouping |
| `utm_campaign` | e.g., `q1_2026_capital_district` | Campaign identifier |
| `utm_content` | e.g., `bridge_loans`, `sba_loans` | Loan type or email variant |

---

## Implementation Notes

- The `trackEvent` wrapper (`assets/js/main.js`, line 2) checks
  `typeof gtag === "function"` before calling. This prevents errors when GA4
  is blocked or hasn't loaded.
- All click tracking uses **event delegation** on `document` to handle
  dynamically rendered links and minimize listener count.
- The `form_start` event uses a per-form `started` boolean to fire only once
  per page load, not once per field focus.
- The `blog_read` observer disconnects after firing to avoid duplicate events
  from scroll bouncing.
- GA4 free tier allows 50 custom dimensions and 50 custom metrics. This schema
  uses 7 dimensions and 0 custom metrics.

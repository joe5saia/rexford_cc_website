# Rexford Commercial Capital — Hugo Developer Specification
**Version**: 1.0  
**Prepared for**: Developer Handoff  
**Site**: rexfordcommercialcapital.com  
**Stack**: Hugo + Cloudflare Pages + Formspree  

---

## 1. Project Overview

Rexford Commercial Capital is a small commercial financing brokerage run by Sarah Joseph and Craig Saia, serving small businesses in the Capital District and Adirondacks region of New York. They connect borrowers with local banks for commercial real estate, fix & flip, rental property, bridge loans, equipment financing, business lines of credit, and small business loans.

This site serves as **step two in a cold email marketing funnel**. Visitors arrive having already received a cold outreach email. The site must immediately establish credibility and convert the visitor to one of three actions:

1. **Call** 518-791-9771 (highest intent)
2. **Fill out a lead capture form** (medium intent)
3. **Email** info@rexfordcc.com (lowest friction)

This is a **prototype / sample site** intended to be shown to the clients (Sarah and Craig) to collect feedback and confirm what real content they need to provide. All content involving people, deals, and testimonials uses realistic placeholder data. The final site will replace placeholders with real content.

---

## 2. Technical Stack & Hosting

| Component | Tool | Notes |
|---|---|---|
| Static Site Generator | Hugo (latest stable) | No specific theme — custom from scratch |
| Hosting | Cloudflare Pages | Deploy via GitHub CI/CD |
| Form Backend | Formspree | Free tier to start |
| Fonts | Google Fonts | Playfair Display + Source Sans 3 |
| CSS | Plain CSS with custom properties | No frameworks, no Tailwind |
| JavaScript | Vanilla JS | No build pipeline needed |
| Analytics | Google Analytics 4 | Via config param, not hardcoded |
| Version Control | GitHub | Cloudflare Pages connected to main branch |

**Hugo version**: Pin to latest stable. Use `.hugo_version` file in repo root.  
**No Hugo themes**. All templates are custom, written from scratch.  
**No npm, no webpack, no node**. Static CSS and JS files only.

---

## 3. Repository Structure

```
rexford-commercial-capital/
├── .hugo_version
├── .gitignore
├── README.md
├── hugo.toml
├── content/
│   ├── _index.md
│   ├── get-started.md
│   ├── thank-you.md
│   ├── services/
│   │   ├── _index.md
│   │   ├── commercial-real-estate.md
│   │   ├── fix-and-flip.md
│   │   ├── rental-property-loans.md
│   │   ├── bridge-loans.md
│   │   ├── equipment-financing.md
│   │   ├── business-line-of-credit.md
│   │   └── small-business-loans.md
│   └── blog/
│       ├── _index.md
│       └── (4 initial posts — see Section 8)
├── layouts/
│   ├── _default/
│   │   ├── baseof.html
│   │   ├── single.html
│   │   └── list.html
│   ├── index.html
│   ├── partials/
│   │   ├── head.html
│   │   ├── header.html
│   │   ├── footer.html
│   │   ├── hero.html
│   │   ├── trust-bar.html
│   │   ├── services-grid.html
│   │   ├── how-it-works.html
│   │   ├── team.html
│   │   ├── recently-funded.html
│   │   ├── cta-band.html
│   │   ├── lead-form-inline.html
│   │   └── schema.html
│   ├── services/
│   │   ├── list.html
│   │   └── single.html
│   └── blog/
│       ├── list.html
│       └── single.html
├── static/
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   └── main.js
│   └── images/
│       ├── logo.svg
│       ├── logo-white.svg
│       ├── og-image.jpg       ← 1200x630px
│       ├── hero-bg.jpg        ← Adirondack/Capital District landscape, dark-toned
│       ├── sarah-smith.jpg    ← PLACEHOLDER: ui-avatars or similar
│       └── craig-saia.jpg     ← PLACEHOLDER: ui-avatars or similar
└── data/
    ├── services.json
    ├── team.json
    ├── funded-deals.json
    └── site-config.json
```

---

## 4. Configuration

### 4.1 hugo.toml

```toml
baseURL = "https://rexfordcommercialcapital.com/"
languageCode = "en-us"
title = "Rexford Commercial Capital"
enableRobotsTXT = true
canonifyURLs = false

[params]
  phone            = "518-791-9771"
  phoneRaw         = "15187919771"
  email            = "info@rexfordcc.com"
  region           = "Capital District & Adirondacks, NY"
  tagline          = "Local Financing Expertise for Capital District & Adirondack Small Businesses"
  description      = "Rexford Commercial Capital helps small businesses in the Capital District and Adirondacks secure commercial real estate, equipment, and working capital financing through local banks that know your community."
  formspreeID      = "REPLACE_WITH_FORMSPREE_ID"
  ga4ID            = "REPLACE_WITH_GA4_ID"
  bbbURL           = "https://www.bbb.org/us/ny/rexford/profile/commercial-real-estate/rexford-commercial-capital-0041-236017820"

[params.seo]
  ogImage = "/images/og-image.jpg"

[params.social]
  facebook = ""
  linkedin = ""

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = false

[outputs]
  home = ["HTML", "RSS"]
  section = ["HTML", "RSS"]
  page = ["HTML"]

[menu]
  [[menu.main]]
    name       = "Real Estate Financing"
    identifier = "real-estate"
    weight     = 10
  [[menu.main]]
    name   = "Fix & Flip"
    parent = "real-estate"
    url    = "/services/fix-and-flip/"
    weight = 1
  [[menu.main]]
    name   = "Rental Property Loans"
    parent = "real-estate"
    url    = "/services/rental-property-loans/"
    weight = 2
  [[menu.main]]
    name   = "Commercial Real Estate"
    parent = "real-estate"
    url    = "/services/commercial-real-estate/"
    weight = 3
  [[menu.main]]
    name   = "Bridge Loans"
    parent = "real-estate"
    url    = "/services/bridge-loans/"
    weight = 4
  [[menu.main]]
    name       = "Business Financing"
    identifier = "business"
    weight     = 20
  [[menu.main]]
    name   = "Equipment Financing"
    parent = "business"
    url    = "/services/equipment-financing/"
    weight = 1
  [[menu.main]]
    name   = "Business Line of Credit"
    parent = "business"
    url    = "/services/business-line-of-credit/"
    weight = 2
  [[menu.main]]
    name   = "Small Business Loans"
    parent = "business"
    url    = "/services/small-business-loans/"
    weight = 3
  [[menu.main]]
    name   = "Blog"
    url    = "/blog/"
    weight = 30
```

---

## 5. Design System

### 5.1 Color Palette

```css
:root {
  --color-primary:        #1B3A2D;   /* Deep forest green — primary brand */
  --color-primary-dark:   #122A1F;   /* Darker green — hover states */
  --color-mid:            #3D5A6C;   /* Warm slate — secondary accent */
  --color-accent:         #C9943A;   /* Adirondack gold — CTAs, highlights */
  --color-accent-hover:   #A8782D;   /* Darker gold — CTA hover */
  --color-bg:             #F7F4EF;   /* Cream — page background */
  --color-surface:        #FFFFFF;   /* White — cards, form backgrounds */
  --color-text:           #1A1A1A;   /* Near black — body text */
  --color-text-secondary: #5C5C5C;   /* Warm gray — secondary text */
  --color-border:         #DDD8D0;   /* Light warm gray — dividers, input borders */
  --color-overlay:        rgba(27, 58, 45, 0.82); /* Hero overlay */
}
```

### 5.2 Typography

Google Fonts import (in `head.html`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Source Sans 3', system-ui, sans-serif;

  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  2rem;       /* 32px */
  --text-4xl:  2.75rem;    /* 44px */
  --text-5xl:  3.5rem;     /* 56px */

  --leading-tight:  1.2;
  --leading-normal: 1.6;
  --leading-loose:  1.8;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text);
  background: var(--color-bg);
}

h1, h2, h3, h4 { font-family: var(--font-display); }
```

### 5.3 Spacing & Layout

```css
:root {
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  --max-width: 1200px;
  --container-px: clamp(1.5rem, 5vw, 4rem);
  --section-py: clamp(3rem, 8vw, 6rem);
  --radius-sm: 2px;
  --radius-md: 4px;
  --shadow-card: 0 2px 12px rgba(27, 58, 45, 0.08);
  --shadow-card-hover: 0 6px 24px rgba(27, 58, 45, 0.14);
  --transition: 0.2s ease;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding-inline: var(--container-px);
}
```

### 5.4 Buttons

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--text-base);
  padding: 0.875rem 1.75rem;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.btn-secondary:hover {
  background: var(--color-primary);
  color: #fff;
}

.btn-outline-white {
  background: transparent;
  color: #fff;
  border-color: rgba(255,255,255,0.6);
}
.btn-outline-white:hover {
  background: rgba(255,255,255,0.1);
  border-color: #fff;
}
```

### 5.5 Form Elements

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-control {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  width: 100%;
  transition: border-color var(--transition);
}
.form-control:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(201, 148, 58, 0.15);
}

select.form-control { appearance: none; }
```

---

## 6. Data Files

### 6.1 `data/site-config.json`
```json
{
  "phone": "518-791-9771",
  "phone_raw": "15187919771",
  "email": "info@rexfordcc.com",
  "region": "Capital District & Adirondacks, NY",
  "bbb_url": "https://www.bbb.org/us/ny/rexford/profile/commercial-real-estate/rexford-commercial-capital-0041-236017820"
}
```

### 6.2 `data/team.json`
```json
[
  {
    "name": "Sarah Joseph",
    "title": "Co-Founder & Financing Specialist",
    "photo": "/images/sarah-smith.jpg",
    "bio": "Sarah has spent over a decade building relationships with local lenders across the Capital District. She specializes in commercial real estate and SBA loans, and takes pride in guiding business owners through the financing process with clarity and patience. A lifelong resident of the region, she understands the unique challenges and opportunities facing local businesses.",
    "phone": "518-791-9771",
    "email": "info@rexfordcc.com"
  },
  {
    "name": "Craig Saia",
    "title": "Co-Founder & Financing Specialist",
    "photo": "/images/craig-saia.jpg",
    "bio": "Craig brings extensive experience in equipment financing, business lines of credit, and working capital solutions. He is known for finding creative financing structures when traditional paths fall short. Craig grew up in the Adirondack region and is committed to helping local businesses thrive through access to the capital they need to grow.",
    "phone": "518-791-9771",
    "email": "info@rexfordcc.com"
  }
]
```
> **PLACEHOLDER NOTE**: Photos should use `https://ui-avatars.com/api/?name=Sarah+Smith&size=400&background=1B3A2D&color=fff` and equivalent for Craig until real headshots are provided.

### 6.3 `data/services.json`
```json
[
  {
    "slug": "commercial-real-estate",
    "name": "Commercial Real Estate",
    "icon": "building",
    "short": "Purchase, refinance, or cash-out on commercial properties — from $75K to $50M.",
    "category": "real-estate"
  },
  {
    "slug": "fix-and-flip",
    "name": "Fix & Flip Financing",
    "icon": "hammer",
    "short": "Purchase and rehab financing with up to 100% of renovation costs covered.",
    "category": "real-estate"
  },
  {
    "slug": "rental-property-loans",
    "name": "Rental Property Loans",
    "icon": "home",
    "short": "Long-term and short-term rental property financing for investors.",
    "category": "real-estate"
  },
  {
    "slug": "bridge-loans",
    "name": "Bridge Loans",
    "icon": "arrow-right",
    "short": "Short-term financing to bridge the gap between purchase and permanent financing.",
    "category": "real-estate"
  },
  {
    "slug": "equipment-financing",
    "name": "Equipment Financing",
    "icon": "truck",
    "short": "Financing and leasing programs for equipment of all kinds.",
    "category": "business"
  },
  {
    "slug": "business-line-of-credit",
    "name": "Business Line of Credit",
    "icon": "credit-card",
    "short": "Flexible working capital access — draw when you need it, pay back as you go.",
    "category": "business"
  },
  {
    "slug": "small-business-loans",
    "name": "Small Business Loans",
    "icon": "briefcase",
    "short": "SBA and conventional loan options for business acquisition, expansion, and more.",
    "category": "business"
  }
]
```

### 6.4 `data/funded-deals.json`
```json
[
  {
    "type": "Commercial Real Estate",
    "category": "real-estate",
    "amount": "$1,250,000",
    "location": "Albany, NY",
    "description": "Refinance of a mixed-use retail and residential building. Secured conventional financing with a local community bank at a competitive fixed rate."
  },
  {
    "type": "Equipment Financing",
    "category": "business",
    "amount": "$185,000",
    "location": "Glens Falls, NY",
    "description": "Heavy equipment package for a regional excavating contractor. Structured as a 60-month lease with a purchase option."
  },
  {
    "type": "Fix & Flip",
    "category": "real-estate",
    "amount": "$320,000",
    "location": "Saratoga Springs, NY",
    "description": "Acquisition and full renovation of a historic single-family home. 100% of rehab costs covered. Closed in under 10 days."
  },
  {
    "type": "Business Line of Credit",
    "category": "business",
    "amount": "$250,000",
    "location": "Lake Placid, NY",
    "description": "Revolving line of credit for a regional hospitality business to manage seasonal cash flow fluctuations."
  },
  {
    "type": "Rental Property Loan",
    "category": "real-estate",
    "amount": "$475,000",
    "location": "Troy, NY",
    "description": "Long-term DSCR loan on a 6-unit multifamily property. Qualified on property income, not personal income."
  }
]
```

---

## 7. Page Specifications

### 7.1 Homepage (`layouts/index.html`)

The homepage assembles the following partials in order:

```
{{ partial "header.html" . }}
{{ partial "hero.html" . }}
{{ partial "trust-bar.html" . }}
{{ partial "services-grid.html" . }}
{{ partial "how-it-works.html" . }}
{{ partial "team.html" . }}
{{ partial "recently-funded.html" . }}
{{ partial "cta-band.html" . }}
{{ partial "footer.html" . }}
```

---

#### Partial: `header.html`

**Behavior:**
- Fixed to top of viewport (`position: fixed`)
- On page load over hero: background is transparent, logo is white version
- On scroll > 60px: background transitions to white, box-shadow appears, logo switches to color version
- The scroll behavior is handled via the `scroll` event in `main.js` adding a `.scrolled` class to `<header>`

**Structure:**
```
<header>
  <div class="container">
    <a href="/" class="logo">
      <img src="/images/logo.svg" class="logo-color" alt="Rexford Commercial Capital">
      <img src="/images/logo-white.svg" class="logo-white" alt="Rexford Commercial Capital">
    </a>
    <nav class="main-nav">
      <!-- Dropdown menus from site.Menus.main -->
    </nav>
    <div class="header-actions">
      <a href="tel:{{ site.Params.phoneRaw }}" class="header-phone">
        <!-- phone icon SVG -->
        {{ site.Params.phone }}
      </a>
      <a href="/get-started/" class="btn btn-primary">Get Started</a>
    </div>
    <button class="mobile-menu-toggle" aria-label="Menu"><!-- hamburger icon --></button>
  </div>
  <div class="mobile-nav"><!-- mobile navigation --></div>
</header>
```

**Notes:**
- Mobile breakpoint: `768px`. Below this, hide `main-nav` and `header-actions` (except phone icon), show hamburger.
- Mobile nav slides in from the top or right. Close on overlay click.
- Navigation items with children render as dropdowns on desktop, accordions on mobile.
- "Get Started" button is always gold.
- Phone number: desktop shows full number with icon; mobile shows icon only (click-to-call).

---

#### Partial: `hero.html`

**Visual:**
- Full viewport height (`min-height: 100vh`)
- Background: `hero-bg.jpg` with `--color-overlay` overlay
- Content centered vertically, offset slightly upward
- Desktop: 2-column grid — copy left (55%), form card right (40%), gap (5%)
- Mobile: stacked — copy, then form card below

**Left column content:**
```
[Gold badge] "Capital District & Adirondacks Small Business Financing"

[H1 — Playfair Display 700, white, ~3.5rem]
"Local Financing. Local Relationships."

[Subheadline — Source Sans 3 400, white 80% opacity, 1.25rem]
"We help small businesses in the Capital District and Adirondacks secure
commercial real estate, equipment, and working capital financing —
through local banks that know your community."

[CTA row]
[btn-primary]       "Call Sarah or Craig"     → tel:15187919771
[btn-outline-white] "Tell Us What You Need →" → /get-started/

[Trust badges row — small, white icons + text]
● BBB Accredited Business
● No Multiple Credit Pulls
● Capital District & Adirondacks
```

**Right column — Form card:**
```
[White card, border-radius: 4px, shadow-card]
[Card header — green background]
  "See What You Qualify For"
  "Free, no-obligation consultation"

[Form fields inside card:]
  Loan Type*       [select]
  Loan Amount*     [select]
  First Name*      [text]
  Last Name*       [text]
  Phone*           [tel]
  Email*           [email]

[Full-width gold submit button]
  "Get My Free Consultation"

[Below button — small gray text]
  "Or call us directly: 518-791-9771"
  "We never sell or share your information."
```

Form submissions use Formspree. See Section 9 for form implementation details.

---

#### Partial: `trust-bar.html`

Cream background (`--color-bg`), thin top and bottom border (`--color-border`).  
Horizontal flex row, 4 items, centered, `padding: 1.25rem 0`.

Items:
| Icon | Text |
|---|---|
| Shield check | BBB Accredited Business |
| Handshake | Deep Local Bank Relationships |
| Credit card | No Multiple Credit Pulls |
| Map pin | Capital District & Adirondacks |

Use inline SVG icons. On mobile, wrap to 2x2 grid.

---

#### Partial: `services-grid.html`

```
[H2 — centered] "Financing Solutions for Every Business Need"
[Subtext — centered] "Whether you need real estate financing or working capital, 
we match your scenario to the right local lender."

[Grid: 4 columns desktop, 2 tablet, 1 mobile]
[Iterate: range site.Data.services]
```

**Service card structure:**
```
[Card]
  [4px top border — color: var(--color-accent)]
  [Icon — 32px, var(--color-primary)]
  [Service Name — Playfair Display 600, 1.25rem]
  [Short description — Source Sans 3, var(--color-text-secondary)]
  ["Learn More →" — var(--color-accent), font-weight 600]
```

Cards: white background, 1px border (`--color-border`), `--shadow-card`. On hover: `--shadow-card-hover`, slight translateY(-2px).

Icons: Use inline SVG. Simple, outlined style. One icon per service (building, hammer, home, arrows, truck, credit-card, briefcase).

---

#### Partial: `how-it-works.html`

Background: `var(--color-primary)`. Text: white.

```
[H2 — centered, Playfair Display, white] "How It Works"
[Subtext — centered, white 70%] "We handle the complexity so you can focus on running your business."

[3-column grid desktop, vertical stack mobile]
```

**Step card (no background, just spacing):**
```
[Step number — large, Playfair Display italic, var(--color-accent), ~5rem, low opacity]
[Step title — Playfair Display 600, white, 1.25rem]
[Description — Source Sans 3, white 80%, 1rem]
```

Steps:
1. **Connect With Us** — "Tell us about your financing needs. No commitment, no pressure. We'll listen first."
2. **We Find the Right Fit** — "We match your scenario to the right local lender — protecting your credit score by avoiding multiple hard pulls."
3. **Get Funded** — "We guide you through the document process and stay with you through closing. You focus on your business."

Connector between steps: horizontal dashed line (desktop only), hidden on mobile.

CTA below: `[btn-outline-white] "Start the Conversation →"` → `/get-started/`, centered.

---

#### Partial: `team.html`

Background: `--color-bg`.

```
[H2 — centered] "You're Working With People, Not a Portal"
[Subtext — centered] "Sarah and Craig are based in the Capital District and 
personally handle every client relationship."
```

**Two-person layout:**
- Desktop: 2-column grid, full-width cards side by side
- Mobile: stacked

**Team member card:**
```
[Photo — 160px circle, centered above card on mobile; left-aligned on desktop]
[Name — Playfair Display 700, 1.5rem]
[Title — Source Sans 3 600, var(--color-accent), uppercase, text-sm]
[Bio — Source Sans 3 400, var(--color-text-secondary)]
[Contact row]
  [phone icon] 518-791-9771
  [email icon] info@rexfordcc.com
```

Cards: white, `--shadow-card`, 32px padding.

> **PLACEHOLDER NOTE**: Until real headshots are provided, use:  
> `https://ui-avatars.com/api/?name=Sarah+Smith&size=400&background=1B3A2D&color=fff&rounded=true`  
> `https://ui-avatars.com/api/?name=Craig+Saia&size=400&background=3D5A6C&color=fff&rounded=true`

---

#### Partial: `recently-funded.html`

Background: white.

```
[H2 — centered] "Recent Deals We've Closed"
[Subtext] "A sample of transactions we've recently facilitated for clients 
in the Capital District and Adirondacks."

[5-card grid: 3 desktop, 2 tablet, 1 mobile — or horizontal scroll on mobile]
[Iterate: range site.Data.funded_deals]
```

**Deal card:**
```
[Category badge — pill, colored by category]
  real-estate → var(--color-primary) background
  business → var(--color-mid) background
[Amount — Playfair Display 700, 1.5rem, var(--color-text)]
[Location — Source Sans 3, var(--color-text-secondary), small]
[Type — Source Sans 3 600, var(--color-text)]
[Description — Source Sans 3 400, var(--color-text-secondary), small]
```

Cards: white, `1px solid var(--color-border)`, `--shadow-card`.

---

#### Partial: `cta-band.html`

Background: `var(--color-primary)`.

```
[H2 — Playfair Display, white] "Ready to Talk Financing?"
[Subtext — white 70%] "Reach out however works best for you. 
We respond to all inquiries within one business day."

[3-column flex row, centered]
```

**Each option:**
```
[Large icon — white, 40px]
[Label — Playfair Display 600, white, 1.25rem]
[Detail — Source Sans 3, var(--color-accent)]
[CTA link]
```

Options:
| Icon | Label | Detail | Link |
|---|---|---|---|
| Phone | Call Us | 518-791-9771 | `tel:15187919771` |
| Mail | Email Us | info@rexfordcc.com | `mailto:info@rexfordcc.com` |
| Clipboard | Fill Out a Form | "Tell us what you need" | `/get-started/` |

On mobile: stack vertically, add dividers between.

---

#### Partial: `footer.html`

Background: `#0F2219` (darker than `--color-primary`). Text: white 70%.

**4-column grid (desktop), 2-column (tablet), 1-column (mobile):**

Column 1: Logo (white version) + tagline + BBB seal image  
Column 2: "Loan Programs" — links to all 7 service pages  
Column 3: "Company" — Home, Blog, Get Started, Privacy Policy  
Column 4: "Contact" — phone, email, address, social links (if populated)

Bottom bar: copyright line, Privacy Policy link. Full-width, border-top.

```
© {{ now.Year }} Rexford Commercial Capital. All rights reserved.
```

---

### 7.2 Get Started Page (`content/get-started.md`)

**Frontmatter:**
```yaml
---
title: "Get Started"
description: "Tell us about your financing needs. Sarah and Craig will reach out within one business day."
layout: "get-started"
---
```

Create `layouts/get-started/single.html` (or handle via front matter `layout` param).

**Page layout:**
- No hero. Simple page header with green background band: "Let's Talk Financing" + subtext.
- Below: 2-column layout
  - Left (60%): Full lead form (see Section 9)
  - Right (40%): sticky sidebar

**Sidebar content:**
```
[H3] "What Happens Next"
[Numbered list]
1. We review your submission (usually within hours)
2. Sarah or Craig calls you at your preferred time
3. We discuss your needs and explore options
4. No obligation, no hard credit pull at this stage

[Divider]

[H3] "Prefer to Reach Out Directly?"
[Phone — large, clickable] 518-791-9771
[Email] info@rexfordcc.com

[Team photos — small, side by side]
"Sarah Joseph & Craig Saia"
```

---

### 7.3 Thank You Page (`content/thank-you.md`)

**Frontmatter:**
```yaml
---
title: "Thank You"
description: "We received your request and will be in touch shortly."
layout: "thank-you"
robots: "noindex"
---
```

Simple centered layout, green header band.

```
[Checkmark icon — large, gold]
[H1] "We Got It — Thank You!"
[Body] "Sarah or Craig will reach out within one business day. 
If you need to connect sooner, call us directly:"
[Large phone link] 518-791-9771
[Body] "In the meantime, you might find these resources helpful:"
[3 service card links]
```

Add `<meta name="robots" content="noindex">` via front matter param in `head.html`.

---

### 7.4 Service Pages (`layouts/services/single.html`)

Each service page is driven by frontmatter. The template renders all sections from params — no hardcoded content in the template.

**Frontmatter schema** (all 7 service pages follow this structure):

```yaml
---
title: "Commercial Real Estate Financing"
description: "Secure commercial real estate financing for Capital District and Adirondack properties. From $75K to $50M — we match you to the right local lender."
summary: "Whether you need to purchase, refinance, or pull cash out of a commercial property, we work with local banks across the Capital District and Adirondacks to find the right fit for your deal."
loanRange: "$75,000 – $50,000,000"
timeToClose: "30–60 days"
icon: "building"
useCases:
  - "Owner-occupied commercial property purchase"
  - "Investment property acquisition or refinance"
  - "Mixed-use, retail, office, industrial, and multifamily"
  - "Cash-out refinance for business capital"
eligibility:
  - "Businesses operating in NY State"
  - "Minimum 680 credit score (varies by lender)"
  - "Property located in Capital District or Adirondack region"
  - "12+ months in business preferred"
faqs:
  - q: "What types of properties do you finance?"
    a: "We work with mixed-use, retail, office, industrial, and multifamily properties. If you have a specific property type in mind, reach out and we'll let you know what options are available."
  - q: "How long does approval take?"
    a: "Most conventional commercial loans close in 30–60 days from a complete application. We'll give you a realistic timeline based on your specific scenario."
  - q: "Do I need a large down payment?"
    a: "Typically 20–30% down for conventional commercial loans. SBA 504 programs can reduce this significantly. We'll walk through all available options with you."
relatedServices:
  - "bridge-loans"
  - "small-business-loans"
---
```

**Service page template sections:**
1. **Header band** (green): service name, summary, loan range badge, time-to-close badge, CTA button
2. **Use Cases** (2-column list, white bg): "Who This Is For" + bulleted use cases
3. **How It Works** (cream bg): 3-step condensed version specific to loan type
4. **Eligibility** (white bg): "What We Look For" + bulleted eligibility
5. **FAQ** (cream bg): accordion — each question/answer pair from frontmatter
6. **Related Services** (white bg): 2–3 service cards from `relatedServices` slugs
7. **CTA Band**: same as homepage `cta-band.html` partial

**FAQ Accordion**: CSS-only using `<details>`/`<summary>` elements. No JavaScript required.

---

### 7.5 Blog

**List page** (`layouts/blog/list.html`):
- Hero band (green): "Financing Resources for Capital District Small Businesses"
- Card grid: 3 columns desktop, 2 tablet, 1 mobile
- Each card: featured image (fallback to colored placeholder by category), title, date, excerpt (`.Summary`), "Read More →" link
- Pagination via Hugo built-in: `{{ template "_internal/pagination.html" . }}`

**Single post** (`layouts/blog/single.html`):
- Narrow editorial layout (700px max content width)
- Header: category badge, title, date, estimated read time
- Body: rich markdown content
- Sidebar (desktop): sticky "Ready to Get Funded?" card with phone and Get Started CTA
- Footer of post: author credit ("By Rexford Commercial Capital"), related posts (2 cards)

**Blog frontmatter schema:**
```yaml
---
title: "How to Get a Commercial Real Estate Loan in Albany, NY"
date: 2025-01-15
description: "A practical guide for Capital District business owners navigating commercial real estate financing."
category: "Commercial Real Estate"
readTime: "6 min read"
featured: true
---
```

---

## 8. Initial Blog Content (Placeholder Posts)

Create 4 posts under `content/blog/`. These are placeholder posts — real content to be written by client or copywriter before launch.

| Filename | Title | Category |
|---|---|---|
| `commercial-real-estate-loans-albany-ny.md` | How to Get a Commercial Real Estate Loan in Albany, NY | Commercial Real Estate |
| `sba-vs-conventional-loans.md` | SBA Loans vs. Conventional Business Loans: What's Right for You? | Small Business |
| `equipment-financing-small-business.md` | Equipment Financing for Small Businesses in the Adirondacks | Equipment Financing |
| `what-local-banks-look-for.md` | What Local Banks Look for in a Small Business Loan Application | Small Business |

Each post should have 300–400 words of realistic placeholder content relevant to the topic and region. Use `<!-- PLACEHOLDER: Replace with final copy before launch -->` comments at top of each file.

---

## 9. Forms

### 9.1 Formspree Setup

1. Create a Formspree account and create a new form
2. Copy the form endpoint ID into `hugo.toml` → `params.formspreeID`
3. Configure in Formspree dashboard:
   - Email notifications → `info@rexfordcc.com`
   - Auto-reply to submitter: "Thank you for reaching out to Rexford Commercial Capital. Sarah or Craig will contact you within one business day."
   - Redirect after submission → `https://rexfordcommercialcapital.com/thank-you/`
4. Use Formspree's spam filtering (enabled by default)

### 9.2 Inline Hero Form Fields

Minimal — 6 fields for quick entry:

| Field | Type | Required | Options |
|---|---|---|---|
| Loan Type | select | Yes | Commercial Real Estate / Fix & Flip / Rental Property Loan / Bridge Loan / Equipment Financing / Business Line of Credit / Small Business Loan / Other |
| Loan Amount | select | Yes | Under $100K / $100K–$250K / $250K–$500K / $500K–$1M / $1M–$5M / Over $5M |
| First Name | text | Yes | — |
| Last Name | text | Yes | — |
| Phone | tel | Yes | — |
| Email | email | Yes | — |

Hidden fields:
```html
<input type="hidden" name="_subject" value="New Lead — Rexford Commercial Capital (Homepage)">
<input type="hidden" name="Source" value="Homepage Hero Form">
```

### 9.3 Full Get Started Form Fields

| Field | Type | Required | Options |
|---|---|---|---|
| Loan Type | select | Yes | Same as above |
| Loan Amount | select | Yes | Same as above |
| Business Type | text | Yes | e.g. "Restaurant", "Construction Company" |
| Timeline | select | Yes | ASAP / Within 1–3 months / 3–6 months / Just exploring |
| First Name | text | Yes | — |
| Last Name | text | Yes | — |
| Email | email | Yes | — |
| Phone | tel | Yes | — |
| Best Time to Call | select | No | Morning (9am–12pm) / Afternoon (12pm–5pm) / Anytime |
| Tell us more | textarea | No | Placeholder: "Describe your project or financing need (optional)" |

Hidden fields:
```html
<input type="hidden" name="_subject" value="New Lead — Rexford Commercial Capital (Get Started)">
<input type="hidden" name="Source" value="Get Started Page">
```

### 9.4 Form HTML Pattern

Both forms follow this pattern (template partial):

```html
<form
  action="https://formspree.io/f/{{ site.Params.formspreeID }}"
  method="POST"
  class="lead-form"
  novalidate
>
  <!-- fields -->
  <button type="submit" class="btn btn-primary btn-full">
    Get My Free Consultation
  </button>
  <p class="form-privacy">We never sell or share your information.</p>
</form>
```

Client-side validation: use the `required` attribute + browser native validation. Optionally enhance with a small vanilla JS validator for better UX (inline error messages). Keep it lightweight — no libraries.

---

## 10. SEO

### 10.1 `head.html` Partial

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">

<title>
  {{ if .IsHome }}{{ site.Title }} — {{ site.Params.tagline }}
  {{ else }}{{ .Title }} | {{ site.Title }}{{ end }}
</title>

<meta name="description" content="{{ with .Description }}{{ . }}{{ else }}{{ site.Params.description }}{{ end }}">
<meta name="robots" content="{{ with .Params.robots }}{{ . }}{{ else }}index, follow{{ end }}">
<link rel="canonical" href="{{ .Permalink }}">

<!-- Open Graph -->
<meta property="og:type"        content="{{ if .IsHome }}website{{ else }}article{{ end }}">
<meta property="og:title"       content="{{ .Title }}">
<meta property="og:description" content="{{ with .Description }}{{ . }}{{ else }}{{ site.Params.description }}{{ end }}">
<meta property="og:image"       content="{{ site.Params.seo.ogImage | absURL }}">
<meta property="og:url"         content="{{ .Permalink }}">
<meta property="og:site_name"   content="{{ site.Title }}">

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/images/favicon.svg">

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">

<!-- CSS -->
<link rel="stylesheet" href="/css/main.css">

<!-- GA4 — only render if param set -->
{{ with site.Params.ga4ID }}
<script async src="https://www.googletagmanager.com/gtag/js?id={{ . }}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{ . }}');
</script>
{{ end }}
```

### 10.2 Local Business Schema (`partials/schema.html`)

Render only on homepage (`{{ if .IsHome }}`):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Rexford Commercial Capital",
  "url": "https://rexfordcommercialcapital.com",
  "telephone": "+15187919771",
  "email": "info@rexfordcc.com",
  "address": {
    "@type": "PostalAddress",
    "addressRegion": "NY",
    "addressCountry": "US"
  },
  "areaServed": [
    "Capital District, NY",
    "Albany, NY",
    "Saratoga Springs, NY",
    "Glens Falls, NY",
    "Troy, NY",
    "Schenectady, NY",
    "Adirondacks, NY",
    "Lake Placid, NY"
  ],
  "sameAs": [
    "{{ site.Params.bbbURL }}"
  ],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "09:00",
    "closes": "17:00"
  }
}
</script>
```

### 10.3 Target Keywords by Page

| Page | Primary Keyword | Secondary Keywords |
|---|---|---|
| Homepage | small business loans Capital District NY | commercial financing Albany NY, business loans Adirondacks NY |
| Commercial RE | commercial real estate loans Albany NY | commercial mortgage upstate NY, investment property loans NY |
| Fix & Flip | fix and flip loans upstate NY | rehab loans Capital District, hard money loans Albany |
| Rental Property | rental property loans Albany NY | DSCR loans upstate NY, landlord loans NY |
| Bridge Loans | bridge loans Albany NY | short-term commercial financing NY |
| Equipment | equipment financing small business NY | equipment loans Albany, heavy equipment financing upstate NY |
| Line of Credit | business line of credit Albany NY | working capital loans Capital District |
| Small Business | SBA loans Albany NY | small business loans Saratoga Springs, SBA 7a loans NY |

---

## 11. Cloudflare Pages Deployment

### 11.1 Build Settings (in Cloudflare Pages dashboard)

| Setting | Value |
|---|---|
| Framework preset | Hugo |
| Build command | `hugo --minify` |
| Build output directory | `public` |
| Root directory | `/` (repo root) |
| Environment variable | `HUGO_VERSION` = (match `.hugo_version` file) |

### 11.2 `_redirects` file (`static/_redirects`)

```
/home           /               301
/get-started    /get-started/   301
# Add any legacy URL redirects from old site here
```

### 11.3 `_headers` file (`static/_headers`)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/css/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable
```

---

## 12. JavaScript (`static/js/main.js`)

Keep minimal. Required behaviors:

1. **Header scroll state**: Add `.scrolled` class to `<header>` when `scrollY > 60`
2. **Mobile menu toggle**: Toggle `.open` class on `.mobile-nav` and `.mobile-menu-toggle`
3. **Mobile nav dropdown accordions**: Toggle `.expanded` on parent nav items with children
4. **Close mobile nav**: On overlay click or ESC key
5. **Smooth scroll**: For any `href="#..."` anchor links

No external libraries. No jQuery. Total JS should be under 3KB unminified.

```js
// Header scroll behavior
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Mobile menu
const toggle = document.querySelector('.mobile-menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
toggle?.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
  toggle.classList.toggle('open');
});
```

---

## 13. Placeholder Content Summary

The following items use placeholder content in this prototype. A checklist for the client:

### Client Must Provide Before Launch:
- [ ] **Professional headshots** — Sarah Joseph and Craig Saia (recommend 800x800px minimum, neutral background)
- [ ] **Logo files** — SVG preferred, both color and white versions
- [ ] **OG image** — 1200x630px branded image for social sharing
- [ ] **Hero background photo** — High-quality landscape photo of Capital District or Adirondacks (licensed)
- [ ] **Funded deals** — Confirm or replace the 5 placeholder deals with real transaction details (deal type, amount, location, brief description — no client names required)
- [ ] **Bios** — Review and approve or rewrite the Sarah and Craig bios in `data/team.json`
- [ ] **Testimonials** — If available, provide 2–4 client testimonials (quote, business name, business type, location)
- [ ] **Blog content** — Replace 4 placeholder blog posts with final copy
- [ ] **Formspree account** — Create account and provide form endpoint ID
- [ ] **GA4 property** — Create and provide measurement ID
- [ ] **Google Business Profile** — Create or claim at business.google.com
- [ ] **BBB profile URL** — Confirm current URL for seal link
- [ ] **Social profiles** — LinkedIn company page URL (recommended before launch)

---

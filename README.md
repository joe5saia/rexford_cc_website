# Rexford Commercial Capital Website

Hugo-based marketing site for Rexford Commercial Capital.

## Tech Stack
- Hugo `0.157.0` (pinned in `.hugo_version`)
- Plain CSS (`static/css/main.css`)
- Vanilla JS (`static/js/main.js`)
- Formspree for form handling
- Cloudflare Pages for hosting

## Project Structure
- `hugo.toml`: global site config, menus, params, SEO and integrations
- `content/`: page content (`services/`, `blog/`, and standalone pages)
- `layouts/`: templates and partials
- `data/`: structured content (`services.json`, `team.json`, `funded-deals.json`, `site-config.json`)
- `static/`: CSS, JS, images, `_headers`, `_redirects`
- `scripts/ci-local.sh`: local CI build check
- `.github/workflows/ci.yml`: GitHub CI

## Local Development

Prerequisite: install Hugo.

```bash
brew install hugo
```

Run locally:

```bash
make serve
```

Open: `http://localhost:1313`

## Build and Validation
- `make build`: production build (`hugo --minify`) to `public/`
- `make ci`: strict build check (`hugo --minify --panicOnWarning`)
- `make clean`: remove generated artifacts

## Configuration (`hugo.toml`)

### Core
- `baseURL`: production domain
- `languageCode`: site language
- `title`: site title
- `enableRobotsTXT`: generate `robots.txt`
- `canonifyURLs`: canonical URL behavior

### `params`
- `phone`: displayed phone number
- `phoneRaw`: `tel:` friendly digits-only phone
- `email`: displayed email
- `region`: region label text
- `tagline`: global brand tagline
- `description`: default SEO description
- `formspreeID`: Formspree endpoint id
- `ga4ID`: GA4 measurement id (tracking script only renders when not placeholder)
- `bbbURL`: BBB profile URL

### `params.address`
- `city`, `region`, `country`: used in structured data/footer context

### `params.seo`
- `ogImage`: Open Graph image path

### `params.social`
- `facebook`, `linkedin`: footer links when populated

### Menu (`menu.main`)
Dropdown navigation is fully config-driven. Edit/add items under `[[menu.main]]`.

## Adding Content

### New blog post
Create `content/blog/<slug>.md` with frontmatter:

```yaml
---
title: "Post Title"
date: 2026-03-02
description: "SEO description"
category: "Small Business"
readTime: "6 min read"
featured: false
---
```

### New service page
Create `content/services/<slug>.md` using existing files as schema examples. Required fields include:
- `title`, `description`, `summary`
- `loanRange`, `timeToClose`, `icon`
- `useCases` (list), `eligibility` (list)
- `faqs` (`q`/`a` pairs)
- `relatedServices` (service slugs)

### Update homepage cards/content
- Service cards: `data/services.json`
- Team section: `data/team.json`
- Recent deals: `data/funded-deals.json`

## Forms and Analytics
- Hero and Get Started forms post to Formspree via `params.formspreeID`
- Update placeholder IDs before launch:
  - `params.formspreeID`
  - `params.ga4ID`

## Deployment (Cloudflare Pages)
Use these settings:
- Build command: `hugo --minify`
- Output directory: `public`
- Root directory: `/`
- Env var: `HUGO_VERSION` matching `.hugo_version`

Cloudflare support files (already included):
- `static/_headers`
- `static/_redirects`

## GitHub Auto-Deploy (Wrangler)
This repo includes `.github/workflows/deploy-pages.yml` to deploy on every push to `main`.

Required repository secrets:
- `CLOUDFLARE_API_TOKEN`: token with Pages deploy permissions
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account id

Once secrets are set, pushes to `main` will automatically deploy to `rexford-cc-website.pages.dev`.

## Contributor Notes
See `AGENTS.md` for contribution conventions (style, QA, PR expectations).

## Production TODO
- [ ] Replace placeholder visual assets:
  - [ ] Final logo files (`logo.svg`, `logo-white.svg`, favicon)
  - [ ] Final hero background image (or approved solid/brand treatment)
  - [ ] Final OG image (`static/images/og-image.jpg`)
  - [ ] Professional headshots for Sarah Joseph and Craig Saia
- [ ] Replace placeholder content:
  - [ ] Validate all homepage/service copy with client
  - [ ] Replace placeholder blog posts with approved copy
  - [ ] Validate and finalize funded deals list (remove hypothetical entries if needed)
- [ ] Complete integrations:
  - [ ] Set real `params.formspreeID` in `hugo.toml`
  - [ ] Set real `params.ga4ID` in `hugo.toml`
  - [ ] Confirm Formspree redirect to `/thank-you/`
  - [ ] Validate GA4 events/pageviews in production
- [ ] Legal and trust:
  - [ ] Replace template privacy policy with finalized legal text
  - [ ] Confirm/validate BBB URL
  - [ ] Add terms/disclaimer pages if required
- [ ] Final SEO and metadata:
  - [ ] Review per-page titles/descriptions
  - [ ] Submit sitemap to Google Search Console
  - [ ] Verify `robots.txt` and canonical URLs on production domain
- [ ] Final QA before launch:
  - [ ] Cross-browser QA (Chrome, Safari, Firefox; mobile + desktop)
  - [ ] Form submission QA (happy path + validation errors)
  - [ ] Accessibility pass (keyboard nav, contrast, headings, link labels)
  - [ ] Lighthouse/performance pass and image optimization
- [ ] Domain and deployment:
  - [ ] Attach custom domain in Cloudflare Pages
  - [ ] Confirm SSL, redirects, and caching behavior (`_headers`, `_redirects`)
  - [ ] Verify GitHub auto-deploy on `main` remains green

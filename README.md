# Rexford Commercial Capital Website

Prototype Hugo marketing site for Rexford Commercial Capital.

## Stack

- Hugo `0.157.0` (pinned in `.hugo_version`)
- Plain CSS + vanilla JavaScript
- Formspree form endpoint (placeholder configured)
- Cloudflare Pages-ready static output

## Local Development

```bash
make serve
```

Open `http://localhost:1313`.

## Local CI

```bash
make ci
```

This runs:

- `hugo --minify --panicOnWarning`

## Production Build

```bash
make build
```

Output is generated in `public/`.

## Key Config

Update these in `hugo.toml` before launch:

- `params.formspreeID`
- `params.ga4ID`
- `params.social.linkedin`
- `params.social.facebook`

## Deployment (Cloudflare Pages)

Use:

- Build command: `hugo --minify`
- Build output directory: `public`
- Environment variable: `HUGO_VERSION` matching `.hugo_version`

Cloudflare support files are included:

- `static/_redirects`
- `static/_headers`

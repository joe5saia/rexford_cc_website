# Repository Guidelines

## Project Structure & Module Organization
- `hugo.toml`: main site configuration (menus, params, SEO IDs, contact info).
- `content/`: Markdown pages and sections (`services/`, `blog/`, `get-started.md`, `thank-you.md`).
- `layouts/`: Hugo templates and partials (`partials/` for reusable sections, section-specific templates under `blog/`, `services/`, etc.).
- `data/`: JSON content sources (`services.json`, `team.json`, `funded-deals.json`).
- `static/`: unprocessed assets (`css/main.css`, `js/main.js`, `images/`, `_headers`, `_redirects`).
- `scripts/ci-local.sh`: local CI build check used by `make ci`.
- `.github/workflows/ci.yml`: CI workflow aligned with local checks and Cloudflare build output.

## Build, Test, and Development Commands
- `make serve`: run local dev server with drafts at `http://localhost:1313`.
- `make build`: production build (`hugo --minify`) into `public/`.
- `make ci`: strict validation (`hugo --minify --panicOnWarning`).
- `make clean`: remove generated artifacts (`public/`, Hugo lock/generated resources).

## Coding Style & Naming Conventions
- Use idiomatic Hugo templates and semantic HTML; keep partials focused and reusable.
- CSS/JS are plain and minimal (no Node/Tailwind/framework pipeline).
- Indentation: 2 spaces in HTML/CSS/JS/TOML/Markdown.
- Use kebab-case for content and section slugs (example: `business-line-of-credit.md`).
- Keep data keys stable and explicit in `data/*.json`; prefer exact lookup for hyphenated files (example: `index site.Data "funded-deals"`).

## Testing Guidelines
- Primary check is static build success via `make ci`; treat warnings as failures.
- For UI changes, do manual visual QA on desktop and mobile for key routes:
  - `/`, `/get-started/`, `/services/<slug>/`, `/blog/`, `/thank-you/`.
- Verify no console errors and no broken links/assets before merging.

## Commit & Pull Request Guidelines
- Commit messages should be short, imperative, and scoped (example: `Fix funded deals data lookup`).
- PRs should include:
  - Summary of user-visible changes
  - Files/areas touched
  - Verification steps run (`make ci`, manual page checks)
  - Screenshots for layout or styling updates

## Security & Configuration Tips
- Do not commit real secrets or private IDs. Keep placeholders until production values are provided (`formspreeID`, `ga4ID`).
- Preserve Cloudflare compatibility: keep `_headers`, `_redirects`, and `.hugo_version` in sync with deployment settings.

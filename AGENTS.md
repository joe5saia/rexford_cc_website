# Repository Guidelines

## Project Structure & Module Organization
- `hugo.toml`: main site configuration (menus, params, SEO IDs, contact info).
- `worker/`: Cloudflare Worker for form ingestion (`src/index.ts`), D1 migrations (`migrations/`), and Wrangler config (`wrangler.toml`).
- `content/`: Markdown pages and sections (`services/`, `blog/`, `get-started.md`, `thank-you.md`).
- `layouts/`: Hugo templates and partials (`partials/` for reusable sections, section-specific templates under `blog/`, `services/`, etc.).
- `data/`: JSON content sources (`services.json`, `team.json`, `funded-deals.json`).
- `static/`: unprocessed assets (`css/main.css`, `js/main.js`, `images/`, `_headers`, `_redirects`).
- `scripts/ci-local.sh`: local CI build check used by `make ci`.
- `.github/workflows/ci.yml`: Hugo build checks.
- `.github/workflows/deploy-pages.yml`: Cloudflare Pages deploy.
- `.github/workflows/deploy-worker.yml`: Worker deploy + remote D1 migrations.

## Build, Test, and Development Commands
- `make serve`: run local dev server with drafts at `http://localhost:1313`.
- `make build`: production build (`hugo --minify`) into `public/`.
- `make ci`: strict validation (`hugo --minify --panicOnWarning`).
- `make clean`: remove generated artifacts (`public/`, Hugo lock/generated resources).
- `npm run dev:worker`: run Worker locally on `http://127.0.0.1:8787`.
- `npm run d1:migrate:local`: apply D1 migrations to local Worker DB.
- `npm run d1:migrate:remote`: apply D1 migrations to remote D1 DB.
- `npm run deploy:worker`: deploy Worker using `worker/wrangler.toml`.

## Coding Style & Naming Conventions
- Use idiomatic Hugo templates and semantic HTML; keep partials focused and reusable.
- CSS/JS are plain and minimal (no Node/Tailwind/framework pipeline).
- Indentation: 2 spaces in HTML/CSS/JS/TOML/Markdown.
- Use kebab-case for content and section slugs (example: `business-line-of-credit.md`).
- Keep data keys stable and explicit in `data/*.json`; prefer exact lookup for hyphenated files (example: `index site.Data "funded-deals"`).

## Testing Guidelines
- Primary check is static build success via `make ci`; treat warnings as failures.
- Worker/API checks:
  - `npm run d1:migrate:local` before local API testing.
  - Use a real `POST /inquiry` request and verify response status/body.
  - Confirm `email_status` in D1 when validating email delivery behavior.
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
- Do not commit secrets. Cloudflare credentials belong in environment variables/secrets, not source files.
- Worker form configuration lives in:
  - `hugo.toml` -> `params.formEndpoint`
  - `worker/wrangler.toml` -> `MAIL_TO`, `MAIL_FROM`, `ALLOWED_ORIGINS`, D1 binding
- If Worker deploy fails on custom domain routing, deploy on `workers.dev` temporarily and keep a TODO to restore `[[routes]]` once zone/DNS are ready.
- Email sending requires Cloudflare Email Routing on the sender domain (`MAIL_FROM`); without it, submissions save to D1 but return email failure.
- Preserve Cloudflare compatibility: keep `_headers`, `_redirects`, and `.hugo_version` in sync with deployment settings.

## Worker Notes
- Endpoint contract: `POST /inquiry` accepts JSON from site forms; required fields include `firstName`, `lastName`, `email`, `phone`, `loanType`, `loanAmount`.
- Server behavior:
  - Validates inputs and field lengths.
  - Writes all submissions to D1 (`inquiries` table) before attempting email.
  - Sends notification email with subject: `Website Inquiry: <First Name> <Last Name>`.
  - Returns `502` when DB save succeeds but email send fails (intentional for visibility).
- Keep Worker changes backward compatible with existing form field aliases when possible.

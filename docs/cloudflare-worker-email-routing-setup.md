# Cloudflare Worker + Email Routing Setup Guide

This guide fixes the current form failure and gets production routing ready.

## Current Status
- Form submissions reach the Worker and are saved to D1.
- Email delivery fails with:
  - `email from rexfordcommercialcapital.com not allowed because domain was not found`
- Worker is currently running in test mode on:
  - `https://rexford-inquiry-worker.joe5saia.workers.dev/inquiry`

## Goal
1. Keep testing working now (workers.dev).
2. Configure Cloudflare zone + Email Routing for `rexfordcommercialcapital.com`.
3. Switch Worker + site forms to `https://api.rexfordcommercialcapital.com/inquiry`.

## 1) Confirm Cloudflare Zone Ownership
In Cloudflare Dashboard:
1. Go to **Account Home** and confirm `rexfordcommercialcapital.com` exists as an active zone in the same account used by Wrangler.
2. If missing, add the zone and update registrar nameservers to Cloudflare nameservers.
3. Wait for zone status to show **Active**.

This step is required for both:
- Worker custom domain routing (`api.rexfordcommercialcapital.com`)
- Email Routing sender authorization for `@rexfordcommercialcapital.com`

## 2) Configure DNS for API Subdomain
In the `rexfordcommercialcapital.com` zone DNS:
1. Create `api` record (typically `CNAME api -> <workers.dev target>` or equivalent custom domain flow from Workers UI).
2. Ensure the record is **Proxied** (orange cloud).

## 3) Enable Cloudflare Email Routing
In Cloudflare Dashboard:
1. Open **Email > Email Routing** for `rexfordcommercialcapital.com`.
2. Enable Email Routing for the zone.
3. Add the DNS records Cloudflare asks for (MX/TXT/SPF records shown in UI).
4. Add destination mailbox: `joe5saia@gmail.com` (for testing).
5. Verify that destination inbox.
6. Create custom address route:
   - `website@rexfordcommercialcapital.com` -> `joe5saia@gmail.com`

After launch, change destination to `info@rexfordcc.com` (or your final mailbox).

## 4) Restore Worker Custom Domain Route
Edit [worker/wrangler.toml](/Users/saiaj/projects/rexford_cc_website/worker/wrangler.toml):
1. Uncomment:
```toml
[[routes]]
pattern = "api.rexfordcommercialcapital.com"
custom_domain = true
```
2. Keep:
```toml
MAIL_FROM = "website@rexfordcommercialcapital.com"
MAIL_TO = "joe5saia@gmail.com"
```

## 5) Point Forms to API Domain
Edit [hugo.toml](/Users/saiaj/projects/rexford_cc_website/hugo.toml):
```toml
formEndpoint = "https://api.rexfordcommercialcapital.com/inquiry"
```

## 6) Deploy Commands
Run from repo root:
```bash
npm run d1:migrate:remote
npm run deploy:worker
hugo --minify
```
If using CI, push to `main` after local validation.

## 7) End-to-End Verification
1. Submit from site UI (home hero form and `/get-started/`).
2. Confirm email arrives in `joe5saia@gmail.com`.
3. Confirm DB insert:
```bash
npx wrangler d1 execute rexford-inquiries --remote \
  --command "SELECT id, submitted_at, email_status, email_error FROM inquiries ORDER BY id DESC LIMIT 10;" \
  --config worker/wrangler.toml
```
Expected: `email_status = sent`, `email_error = null`.

## Troubleshooting
- `Could not find zone for api.rexfordcommercialcapital.com`
  - Zone is not active in this Cloudflare account, or DNS record not proxied.
- `domain was not found` (email error)
  - Email Routing not enabled for `rexfordcommercialcapital.com`, or required MX/TXT records missing.
- Browser sees submit failure with CORS/403
  - Check `ALLOWED_ORIGINS` in `worker/wrangler.toml`.
- Worker deploy fails with auth errors
  - API token needs Workers Scripts/Routes edit + D1 edit + Zone read/DNS edit permissions.

## Final Cutover Checklist
- [ ] `MAIL_TO` switched from test inbox to production inbox.
- [ ] `formEndpoint` points to `api.rexfordcommercialcapital.com/inquiry`.
- [ ] Worker route enabled in `worker/wrangler.toml`.
- [ ] Email Routing verified for production sender.
- [ ] Test submission recorded in D1 with `email_status = sent`.

# Rexford Commercial Capital Website

Simple Hugo starter repository for the Rexford Commercial Capital marketing website.

## Prerequisites

- Hugo (`brew install hugo`)

## Quick Start

```bash
make serve
```

Open `http://localhost:1313`.

## Local CI

Run the local CI checks:

```bash
make ci
```

This runs a strict Hugo production build (`hugo --minify --panicOnWarning`).

## Project Structure

- `content/`: Site content pages
- `layouts/`: HTML templates
- `static/`: Static assets
- `scripts/ci-local.sh`: Local CI script
- `.github/workflows/ci.yml`: Remote CI workflow matching local CI

## Next Phase

This scaffold is intentionally minimal and currently shows a hello-world homepage.

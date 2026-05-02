# OmniHex Lab Architecture Roadmap

## Current architecture

OmniHex Lab currently runs as a lightweight static content site:

- Cloudflare Pages front-end serves the public Astro site at `lab.omnihex.xyz`.
- GitHub Markdown content stores public articles under `src/content/posts`.
- Cloudflare Pages Functions API handles publishing and public content feed endpoints.
- Google Search Console is used for search verification and indexing visibility.

This setup keeps the first version low-cost, easy to deploy, and simple to audit. Content remains in Git, and the public site can be rebuilt from the repository.

## Near-term architecture

The near-term plan keeps the public site stable while preparing server-side services:

- `lab.omnihex.xyz` remains on Cloudflare Pages.
- `api.lab.omnihex.xyz` will point to a future VPS backend.
- `admin.lab.omnihex.xyz` will point to a future VPS admin app.
- NAS is used only for backup and cold storage.

The NAS should not be treated as the primary application server. It is a storage layer for archives, database backups, exports, and cold recovery copies.

## Publishing flow

Current publishing flow:

- Admin or automation calls the current content API.
- The API validates the payload and token.
- The API writes Markdown into the GitHub repository.
- Cloudflare Pages rebuilds and deploys the static site.

Future publishing flow:

- Admin writes draft and publishing data to a database.
- Backend services manage workflow state, localization, scoring, review, and publishing.
- The front-end consumes stable public APIs.
- GitHub remains the code repository, while content operations can move into the database.

## Migration principles

Migration should preserve portability and avoid infrastructure lock-in:

- Use environment variables for secrets, endpoints, tokens, and deployment-specific configuration.
- Avoid hardcoded server IPs in code, content, or client-side configuration.
- Use project-scoped subdomains for dynamic services: `api.lab.omnihex.xyz` and `admin.lab.omnihex.xyz`.
- Keep code in GitHub as the source of truth for application code and infrastructure notes.
- Backup database data on a regular schedule and test recovery procedures.
- Keep front-end and backend decoupled so `lab.omnihex.xyz` can stay static while APIs evolve.

## Future backend modules

Likely backend modules include:

- AI draft generation for outlines, first drafts, rewrites, and structured summaries.
- Localization workflows for translation groups, language variants, and regional style.
- Content scoring for relevance, evergreen value, quality checks, and publishing priority.
- Source inbox for URLs, notes, raw text, review status, and source metadata.
- User preferences for language, topic interests, subscriptions, and saved workflows.
- Paid features for premium content, advanced tools, usage limits, and account-based access.

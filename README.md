# OmniHex Lab

OmniHex Lab is an automated content site for AI news, tutorials, prompts, tools, multilingual technology briefs, Life OS guides, digital products, and application-focused book notes.

Production domain:

```text
https://lab.omnihex.xyz
```

Dynamic service domains:

```text
Frontend: https://lab.omnihex.xyz
API: https://api.lab.omnihex.xyz
Admin: https://admin.lab.omnihex.xyz
```

The current public front-end stays on Cloudflare Pages at `lab.omnihex.xyz`. Future dynamic services should use project-scoped subdomains under `lab.omnihex.xyz`.

## Stack

- Astro
- TypeScript
- Markdown content collections
- RSS feed
- Sitemap
- Cloudflare Pages
- Cloudflare Pages Functions for content publishing

The first version does not use a database or image storage. Articles are stored as Markdown files and can be created manually or through the content API.

## Content Structure

- `src/content/posts/` stores Markdown posts.
- `src/pages/[category]/index.astro` generates category pages.
- `src/pages/briefs/index.astro` groups brief posts by language.
- `src/pages/[category]/[...slug].astro` generates article pages at `/{category}/{slug}/`.
- `src/pages/products/90-day-life-reset/index.astro` is the first product landing page.
- `src/pages/rss.xml.js` generates the RSS feed.
- `public/robots.txt` points crawlers to the sitemap.

Supported frontmatter:

```yaml
title: "Post title"
description: "Post description"
pubDate: 2026-05-01
category: "books"
tags: ["Reading Lab", "Finance"]
language: "en"
source: "OmniHex Lab"
sourceUrl: "https://lab.omnihex.xyz"
bookTitle: "The Psychology of Money"
bookAuthor: "Morgan Housel"
bookCategory: "Finance"
draft: false
```

Supported categories:

- `ai`
- `news`
- `tutorials`
- `prompts`
- `tools`
- `briefs`
- `life`
- `guides`
- `products`
- `books`

Posts with `draft: true` are excluded from the homepage, category pages, RSS feed, and generated article routes. Posts with `draft: false` or no `draft` value are public.

## Modules

### AI Content Lab

Publishes AI news, tutorials, prompts, tools, and multilingual briefs. The `/briefs/` page groups brief posts by `language`.

### Life OS

Publishes multilingual life advice, self-improvement notes, action guides, AI self-coaching workflows, and digital product content.

Primary routes:

- `/life/`
- `/guides/`
- `/products/`
- `/products/90-day-life-reset/`

### Books / Reading Lab

Publishes application-focused book review articles for finance, money, relationships, self-growth, psychology, and decision-making.

Reading Lab turns useful books into practical notes, action plans, and multilingual guides. It does not reproduce books or publish full chapter summaries.

Copyright rules:

- Do not reproduce copyrighted books.
- Do not publish full chapter summaries.
- Use original commentary, practical applications, and limited short quotes only.

## Local Development

```sh
npm install
npm run dev
```

Default local URL:

```text
http://localhost:4321
```

Build locally:

```sh
npm run build
```

The production output is generated in `dist/`.

## OmniHex Admin Prototype

- This is an early AI editor workspace prototype.
- `/admin` is a private admin workspace entry point.
- `/admin/new` posts single-language drafts to `/api/posts`.
- `/admin/inbox` and `/admin/ideas` are UI-only placeholders.
- Future hosted admin service should use `https://admin.lab.omnihex.xyz`.
- It does not store tokens.
- AI generation, source collection, user personalization, and paid features will be added later.
- Current publishing boundary is `POST /api/posts`.

## Server-Side Admin MVP

The protected admin MVP is a separate Node.js service in `server/`. It does not change the Astro static site or the Cloudflare Pages deployment. Run it behind `admin.lab.omnihex.xyz` while keeping `lab.omnihex.xyz` on Cloudflare Pages.

Current scope:

- Token login with `ADMIN_TOKEN`
- Article editor for title, summary, category, language, Markdown body, tags, and draft status
- AI draft generation through a provider layer
- Publishing through either the existing `/api/posts` endpoint or the GitHub Contents API
- No payment flow, user database, or heavy CMS

Local server:

```sh
ADMIN_TOKEN=change-me npm run admin:start
```

Default admin URL:

```text
http://localhost:8787/admin
```

### Admin Environment Variables

Required:

```text
ADMIN_TOKEN=<private admin login token>
```

Recommended:

```text
SESSION_SECRET=<long random cookie signing secret>
COOKIE_SECURE=auto
```

Publishing through the existing Cloudflare Pages Function:

```text
PUBLISH_TARGET=content-api
CONTENT_API_URL=https://lab.omnihex.xyz/api/posts
CONTENT_API_TOKEN=<same token configured in Cloudflare Pages>
```

Publishing directly through GitHub:

```text
PUBLISH_TARGET=github
GITHUB_TOKEN=<GitHub fine-grained token with contents write access>
GITHUB_OWNER=zzz123hash
GITHUB_REPO=ai-news-lab
GITHUB_BRANCH=main
```

AI draft provider:

```text
AI_PROVIDER=mock
```

`mock` is the default provider and returns a structured placeholder draft without calling an external model. The provider layer is ready for OpenAI-compatible providers:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<key>
AI_MODEL=<current model name>
```

or:

```text
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<key>
AI_MODEL=<model name>
AI_HTTP_REFERER=https://admin.lab.omnihex.xyz
AI_APP_TITLE=OmniHex Lab Admin
```

For another compatible endpoint:

```text
AI_PROVIDER=openai-compatible
AI_API_BASE_URL=https://example.com/v1
AI_API_KEY=<key>
AI_MODEL=<model name>
```

### Docker Compose Deployment

Create a server-side `.env` file next to `docker-compose.yml`:

```text
ADMIN_TOKEN=replace-with-a-long-random-token
SESSION_SECRET=replace-with-another-long-random-secret
PUBLISH_TARGET=content-api
CONTENT_API_URL=https://lab.omnihex.xyz/api/posts
CONTENT_API_TOKEN=replace-with-content-api-token
AI_PROVIDER=mock
```

Start the admin service:

```sh
docker compose up -d --build
```

Check health:

```sh
curl http://127.0.0.1:8787/api/health
```

View logs:

```sh
docker compose logs -f admin
```

Upgrade after pulling new code:

```sh
docker compose up -d --build
```

### Nginx Reverse Proxy

Point `admin.lab.omnihex.xyz` at the server and proxy it to the local Compose port:

```nginx
server {
    listen 80;
    server_name admin.lab.omnihex.xyz;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use HTTPS in production, for example with Certbot. Keep the public Astro site deployed through Cloudflare Pages at `lab.omnihex.xyz`.

## Cloudflare Pages Deployment

Use these Cloudflare Pages settings:

- Framework preset: `Astro`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js version: `22` or newer

Cloudflare environment variables:

```text
CONTENT_API_TOKEN=<your private publishing token>
GITHUB_TOKEN=<GitHub fine-grained token with contents write access>
GITHUB_OWNER=zzz123hash
GITHUB_REPO=ai-news-lab
GITHUB_BRANCH=main
```

`GITHUB_BRANCH` defaults to `main` when omitted.

Future VPS-backed service environment variables should use project-scoped service URLs:

```text
PUBLIC_API_BASE_URL=https://api.lab.omnihex.xyz
PUBLIC_ADMIN_BASE_URL=https://admin.lab.omnihex.xyz
```

Do not use server IP addresses in front-end code or documentation examples. Keep the `lab.omnihex.xyz` Cloudflare Pages deployment unchanged while future dynamic services move behind `api.lab.omnihex.xyz` and `admin.lab.omnihex.xyz`.

## API

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "ok": true,
  "site": "OmniHex Lab"
}
```

### Create Or Update Post

```http
POST /api/posts
Authorization: Bearer <CONTENT_API_TOKEN>
Content-Type: application/json
```

Required fields:

- `title`
- `description`
- `category`
- `language`
- `content`

Optional fields:

- `tags`
- `source`
- `sourceUrl`
- `draft`
- `bookTitle`
- `bookAuthor`
- `bookCategory`

The API writes Markdown to:

```text
src/content/posts/YYYY-MM-DD-slug-language.md
```

For automation workflows, `draft: true` is recommended by default so generated content does not publish before review.

Example request:

```sh
curl -X POST "https://lab.omnihex.xyz/api/posts" \
  -H "Authorization: Bearer $CONTENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to Turn a Finance Book into a 7-Day Money Reset Plan",
    "description": "An application-focused Reading Lab note.",
    "category": "books",
    "language": "en",
    "tags": ["Reading Lab", "Finance"],
    "source": "OmniHex Lab",
    "sourceUrl": "https://lab.omnihex.xyz",
    "bookTitle": "The Psychology of Money",
    "bookAuthor": "Morgan Housel",
    "bookCategory": "Finance",
    "draft": true,
    "content": "## Practical note\n\nTurn one useful idea into one money action this week."
  }'
```

Successful response:

```json
{
  "ok": true,
  "path": "src/content/posts/2026-05-01-how-to-turn-a-finance-book-into-a-7-day-money-reset-plan-en.md",
  "slug": "how-to-turn-a-finance-book-into-a-7-day-money-reset-plan",
  "draft": true,
  "bookTitle": "The Psychology of Money",
  "bookAuthor": "Morgan Housel",
  "bookCategory": "Finance"
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Error message"
}
```

## n8n Example

Use an HTTP Request node:

- Method: `POST`
- URL: `https://lab.omnihex.xyz/api/posts`
- Authentication: Header Auth
- Header name: `Authorization`
- Header value: `Bearer <CONTENT_API_TOKEN>`
- Body content type: JSON

Recommended body:

```json
{
  "title": "Ringkasan Berita AI Mingguan",
  "description": "Ringkasan singkat berbahasa Indonesia.",
  "category": "briefs",
  "language": "id",
  "tags": ["AI", "News"],
  "source": "Example Source",
  "sourceUrl": "https://example.com",
  "draft": true,
  "content": "## Fokus minggu ini\n\nMarkdown body goes here."
}
```

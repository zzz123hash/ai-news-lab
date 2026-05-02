# NAS OpenClaw Workflow

OpenClaw runs on the NAS. It should not be deployed to the public server as the main crawling or AI task runner.

The Cloudflare-first architecture remains:

- Astro static site on Cloudflare Pages.
- Markdown content in GitHub under `src/content/posts`.
- Sveltia CMS manages Markdown through Git.
- Cloudflare Pages rebuilds after GitHub changes.
- R2 and D1 are reserved for later storage/data needs.

## Responsibilities

### NAS

The NAS owns OpenClaw execution:

- scheduled collection jobs
- source fetching
- raw source archiving
- local dedupe/scoring
- draft Markdown generation
- Git commit/push or pull request creation

### GitHub

GitHub remains the content handoff point:

- stores Markdown drafts
- provides branch history and review
- triggers Cloudflare Pages builds
- allows Sveltia CMS editing

### Server

The server is not the OpenClaw worker.

Allowed later roles:

- internal dashboard
- public relay endpoint
- webhook receiver
- lightweight admin utility

Not allowed:

- primary crawling
- full CMS backend
- payment system
- user login system

## Draft Generation Flow

1. OpenClaw runs on the NAS.
2. It writes a JSON digest file with source items.
3. NAS runs:

```sh
node scripts/digest-to-markdown.js /path/to/digest-items.json
```

4. The script writes a Markdown draft into:

```text
src/content/posts/
```

5. The draft includes:

```yaml
draft: true
access: "free"
category: "briefs"
language: "en"
```

6. NAS commits the draft to a branch.
7. NAS pushes to GitHub.
8. Editor reviews the draft in Sveltia CMS.
9. Editor publishes by setting `draft: false`.
10. Cloudflare Pages rebuilds the public static site.

## Recommended Git Workflow

Use a branch per OpenClaw run:

```text
ai-drafts/YYYY-MM-DD-topic
```

Suggested NAS commands:

```sh
git checkout main
git pull --ff-only
git checkout -b ai-drafts/2026-05-02-ai-digest
node scripts/digest-to-markdown.js /volume/openclaw/outputs/2026-05-02/items.json
git add src/content/posts
git commit -m "draft: add AI digest for 2026-05-02"
git push -u origin ai-drafts/2026-05-02-ai-digest
```

Then open a pull request or review the branch through the CMS/editor workflow.

## JSON Input Contract

The input JSON is an array of items:

```json
{
  "title": "Source title",
  "url": "https://example.com/source",
  "author": "Source author",
  "source_language": "en",
  "target_languages": ["en", "zh", "id"],
  "raw_text": "Extracted text or notes.",
  "topic": "AI search",
  "importance_score": 84
}
```

The first implementation does not call real AI. It uses deterministic summaries from `raw_text`.

## R2 Archive Flow Later

OpenClaw may also upload raw archives to R2:

```text
ai/raw/openclaw/YYYY/MM/DD/{job_id}/
```

This is optional for the first phase. If enabled, use scoped R2 credentials or a Worker upload endpoint. Do not expose raw archives publicly.

## Editorial Review Rules

AI/OpenClaw drafts are never auto-published.

Editors should verify:

- source URLs
- dates
- factual claims
- duplicate items
- title and description
- category and tags
- target language plan
- `draft` state

## Non-Goals

- Do not run OpenClaw main tasks on the server.
- Do not connect real AI keys in this phase.
- Do not connect payment.
- Do not connect D1.
- Do not turn `server/index.js` into the CMS.

# AI Pipeline

This document describes the first Ghost-oriented AI content pipeline for OmniHex Lab. It is a planning and tooling workflow only. It does not connect real AI keys, real crawling, payment, or the paused custom server backend.

## Goal

Turn source items into Ghost draft posts that a human editor can review before publication.

The pipeline should produce:

- structured source records
- deduplicated candidate items
- importance scores
- concise summaries
- translation plans
- Ghost draft posts
- an editorial review trail

## Pipeline Stages

### 1. 抓取

Input sources can later include RSS feeds, newsletters, APIs, official blogs, product changelogs, and curated links.

First phase:

- No real crawler.
- Use local JSON files such as `data/sample-digest-items.json`.
- Each item should include:
  - `title`
  - `url`
  - `author`
  - `source_language`
  - `target_languages`
  - `raw_text`
  - `topic`
  - `importance_score`

Later requirements:

- Store original source URL.
- Store retrieval timestamp.
- Keep raw text separate from generated summaries.
- Respect robots, licensing, and source terms.

### 2. 去重

The first dedupe pass should be deterministic:

- Normalize URLs by removing tracking parameters.
- Compare canonical URL host and pathname.
- Compare lowercase titles.
- Compare topic plus high-overlap source text.

MVP behavior:

- Drop exact duplicate URLs.
- Keep the highest `importance_score` if two items have the same normalized URL.
- Flag suspected duplicates for human review rather than deleting aggressively.

### 3. 评分

Scoring decides which items deserve editorial attention.

Current sample field:

- `importance_score`: number from 0 to 100.

Future scoring inputs:

- source reliability
- recency
- relevance to OmniHex Lab categories
- novelty compared with recent posts
- audience usefulness
- source availability
- multilingual potential

MVP rule:

- Sort by `importance_score` descending.
- Include the top items in the Ghost draft.
- Keep scores visible inside the draft for editor review.

### 4. 摘要

First phase:

- No real AI call.
- Use deterministic extractive summaries from `raw_text`.
- Keep source links visible.
- Mark the result as a draft requiring verification.

Future AI summary rules:

- Summarize only from provided source text.
- Do not invent facts, numbers, quotes, or links.
- Include uncertainty notes.
- Preserve source attribution.
- Separate factual summary from editorial angle.

### 5. 翻译

First phase:

- Do not call translation APIs.
- Store `target_languages` as an editorial plan.
- Publish one Ghost draft in the working language.

Future translation flow:

- Generate language-specific drafts after source verification.
- Use internal tags such as `#lang-en`, `#lang-zh`, `#lang-id`.
- Use an internal translation group tag such as `#translation-weekly-ai-digest-2026-05-02`.
- Add human review for localization, not only literal translation.

### 6. 生成 Ghost 草稿

Use Ghost Admin API to create draft posts.

Current local scripts:

- `scripts/publish-to-ghost.js`: creates one simple draft article.
- `scripts/digest-to-ghost.js`: reads `data/sample-digest-items.json`, builds a digest draft, and posts it to Ghost.

Draft conventions:

- `status: draft`
- `visibility: public`
- public tags: `AI Briefs`, `AI Digest`
- internal tags: `#digest`, `#ai-assisted`, `#needs-review`
- source links included in the body
- scores and target languages included for editor visibility

The script supports dry run:

```sh
GHOST_DRY_RUN=true node scripts/digest-to-ghost.js
```

Publishing to Ghost requires:

```sh
GHOST_ADMIN_API_URL=https://your-ghost-domain.com \
GHOST_ADMIN_API_KEY=<id>:<hex-secret> \
node scripts/digest-to-ghost.js
```

### 7. 人工审核

Human review is mandatory before publishing.

Editor checklist:

- Verify every source URL.
- Confirm dates and source credibility.
- Rewrite unclear summaries.
- Remove weak or duplicate items.
- Add original commentary.
- Confirm tags and language metadata.
- Confirm title, excerpt, meta title, and meta description.
- Decide whether the post should remain public, members-only, or paid later.

### 8. 发布

Publishing happens in Ghost Admin, not through an automated script in the first phase.

Rules:

- Automation creates drafts only.
- Human editors publish.
- Paid visibility is not used in this phase.
- If the post becomes multilingual, create separate language-specific posts and link them with internal translation tags.

## MVP Data Contract

`data/sample-digest-items.json` is the first local contract:

```json
{
  "title": "Source title",
  "url": "https://example.com/source",
  "author": "Source author",
  "source_language": "en",
  "target_languages": ["en", "zh", "id"],
  "raw_text": "Source notes or extracted article text.",
  "topic": "AI search",
  "importance_score": 84
}
```

## What This Pipeline Does Not Do Yet

- No real crawling.
- No real AI provider call.
- No real translation provider call.
- No payment.
- No custom user system.
- No use of the paused `server/index.js` backend.

## Next Implementation Steps

- Add deterministic dedupe helpers.
- Add a local digest preview artifact.
- Add optional source reliability fields.
- Add a Ghost sandbox publish test.
- Add import/export mapping for current Astro Markdown posts after the Ghost pilot is approved.

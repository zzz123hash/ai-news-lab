# CMS Usage

OmniHex Lab now has a first-stage Git-based CMS entry powered by Sveltia CMS with a Decap-compatible configuration.

This CMS edits Markdown files in:

```text
src/content/posts/*.md
```

It does not use a database, payment provider, real AI integration, or the paused custom `server/` admin as a CMS.

The old Astro `/admin/` prototype is deprecated and should not be used as the main CMS. It is left in the repo for now to avoid a broad route cleanup.

## Open the CMS

Production URL:

```text
https://lab.omnihex.xyz/cms/
```

`/cms/` is the Sveltia CMS entry. `/admin/` is the deprecated Astro prototype.

Local URL after starting Astro:

```sh
npm run dev
```

```text
http://localhost:4321/cms/
```

The CMS config is served from:

```text
/cms/config.yml
```

## GitHub Access

The CMS is configured for the GitHub repository:

```text
zzz123hash/ai-news-lab
```

First production use requires GitHub authentication support for Sveltia/Decap. If GitHub OAuth is not ready on Cloudflare Pages yet, use local backend or a small OAuth proxy/Worker rather than expanding `server/index.js`.

## Edit an Existing Article

1. Open `/cms/`.
2. Choose `Posts`.
3. Select an existing Markdown post.
4. Edit fields such as title, description, category, language, tags, draft, access, and body.
5. Save through the CMS.
6. Let GitHub and Cloudflare Pages rebuild the static site.

## Create a Draft

1. Open `/cms/`.
2. Choose `Posts`.
3. Click `New Post`.
4. Fill in:
   - `title`
   - `description`
   - `pubDate`
   - `category`
   - `language`
   - `tags`
   - `draft`
   - `access`
   - body Markdown
5. Keep `draft` enabled for unfinished work.
6. Save the entry.

Draft posts use:

```yaml
draft: true
```

Astro excludes drafts from article routes, category pages, homepage lists, RSS, and the public posts JSON.

## Publish an Article

To publish a reviewed article:

1. Open the post in CMS.
2. Verify title, description, category, language, tags, and body.
3. Set `draft` to false.
4. Keep `access` as `free` unless the post is only being marked for future Pro positioning.
5. Save.
6. Wait for Cloudflare Pages to rebuild.

The first stage does not hide Pro content. `access: pro` is only metadata for future commercial planning.

## Access Field

The CMS supports:

```yaml
access: free
```

or:

```yaml
access: pro
```

Use `free` for normal public articles. Use `pro` only for articles that should display Pro/waitlist positioning or later map into a paid/member layer.

## AI Draft Workflow

For now, AI pipeline output should become Markdown drafts, not direct production posts.

Recommended flow:

1. Generate a Markdown file under `src/content/posts`.
2. Include `draft: true`.
3. Include `access: free` by default.
4. Commit to GitHub or an editorial branch.
5. Review and edit in CMS.
6. Publish only after human review.

Do not connect real AI keys or automated publishing in this first CMS phase.

## What Not To Do

- Do not add database-backed CMS state.
- Do not add Stripe.
- Do not add Ghost integration here.
- Do not build CMS features into `server/index.js`.
- Do not use the CMS to bypass editorial review for AI-generated content.

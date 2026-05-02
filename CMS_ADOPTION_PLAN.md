# CMS Adoption Plan

This plan evaluates mature CMS options for OmniHex Lab with one constraint at the center: do not turn the paused custom `server/` admin into the main CMS. The current site should stay Astro + Markdown + GitHub + Cloudflare Pages until a CMS path clearly proves it is better.

## Current Project Fit

Current facts:

- Frontend: Astro static site.
- Content source: Markdown files in `src/content/posts`.
- Content schema: Astro content collection in `src/content.config.ts`.
- Repository: GitHub.
- Deployment: Cloudflare Pages static build.
- Publishing today:
  - existing Cloudflare Pages Function `POST /api/posts`
  - paused custom Node admin MVP in `server/`
  - Ghost draft scripts in `scripts/`
- Future needs:
  - AI source ingestion
  - dedupe, scoring, summarization, translation
  - multilingual content
  - SEO metadata
  - paid content and members
  - API output

The lowest-risk CMS path is therefore a Git-based CMS that writes the same Markdown files Astro already reads.

## Recommendation

Use **Sveltia CMS with a Decap-compatible configuration** as the first-stage CMS.

Keep **Decap CMS** as the fallback because the configuration model is compatible and more established. Keep **Ghost** as a later business-layer option for newsletters, members, and paid content, not the first-stage Markdown CMS. Do not adopt **Payload CMS** in the first phase because it introduces a database, a separate application runtime, and a much larger system boundary.

Recommended phase order:

1. Phase 1: Sveltia CMS / Decap-compatible Git CMS for Markdown editing.
2. Phase 2: AI pipeline writes draft Markdown into Git branches or draft files that appear in the CMS.
3. Phase 3: Decide whether Ghost should handle newsletters/members/paid posts.
4. Phase 4: Consider Payload only if the product becomes a custom app with database-heavy workflows.

## Why This Recommendation

Sveltia CMS / Decap-compatible Git CMS is the best immediate fit because:

- It keeps `src/content/posts` as the source of truth.
- It preserves the existing Astro content collection and route generation.
- It preserves Cloudflare Pages static deployment.
- It requires no database and no always-on CMS server.
- It can be added as a static `/admin/` UI plus config.
- It can work with GitHub as the backend.
- It gives editors a real CMS interface without asking us to build one.
- It can coexist with AI scripts that generate Markdown drafts.

Ghost is strong, but it is not Git-based. It should be used when the priority becomes memberships, newsletters, and paid subscriptions rather than Markdown-in-Git publishing.

Payload is powerful, but it is the wrong first move for this project. It turns the CMS decision into a custom Node/Next/database app decision, which is exactly the type of surface area this plan is trying to avoid.

## Option Comparison

| Option | Fit for current Astro Markdown repo | Git-based | Cloudflare Pages static compatibility | AI draft workflow | Paid/members | Main risk |
| --- | --- | --- | --- | --- | --- | --- |
| Keystatic | Medium | Yes | Medium | Good | None built in | Deployed admin needs server-side Node/API routes; may disturb static Pages unless hosted separately |
| TinaCMS | Medium | Yes | Medium | Good | None built in | More framework/tooling overhead; stronger fit for Tina Cloud/visual editing than this simple Astro Markdown site |
| Sveltia CMS / Decap CMS | High | Yes | High | Excellent | None built in | OAuth/GitHub auth setup and editorial workflow details |
| Ghost | Medium for CMS, high for business layer | No | Medium | Good through Admin API | Strong | Moves source of truth out of Git/Markdown |
| Payload CMS | Low for first phase | No | Low | Good through API | Custom-buildable | Requires app server, database, schema, auth, hosting, migrations |

## 1. Keystatic

### What It Is

Keystatic is a Git/file-backed CMS that can manage content locally or through GitHub. It has first-class Astro docs and can edit structured content using a typed config.

### Pros

- Works with Astro.
- Can read/write local files and GitHub-backed content.
- Strong schema-driven editing.
- Good developer experience for structured fields.
- Could map well to current frontmatter fields.

### Cons

- Deployed admin needs server-side behavior and Node APIs.
- Adding it directly to the production Astro site may require an Astro adapter and change the current static-only Cloudflare Pages assumptions.
- It is less ideal if the top priority is "no runtime CMS server".

### Fit Decision

Not recommended for first phase unless we are willing to host the admin separately or change the Astro deployment model. It is still a reasonable second choice if Sveltia/Decap auth becomes painful.

## 2. TinaCMS

### What It Is

TinaCMS is a Git-backed CMS focused on Markdown/MDX and visual editing. It works well for GitHub-based projects and stores content as flat files.

### Pros

- Git-backed content model.
- Markdown/MDX-friendly.
- Visual editing and structured schema.
- Good fit for teams that already work in GitHub.
- AI pipeline could write Markdown files that Tina indexes.

### Cons

- More dependency and generated-schema overhead than Sveltia/Decap.
- Visual editing is less important for the current article-heavy site.
- The strongest Tina path often involves TinaCloud or a more involved dev workflow.
- Not as minimal as a static CMS UI for this project.

### Fit Decision

Good but not minimal. Consider later if editors need visual editing, inline preview, or more controlled schema tooling.

## 3. Sveltia CMS / Decap CMS

### What It Is

Decap CMS is the long-running Git-based CMS lineage formerly known as Netlify CMS. Sveltia CMS is a modern Decap-compatible successor with stronger UX and i18n ambitions.

### Pros

- Best match for Astro + Markdown + GitHub.
- Static admin UI can be served from the existing site.
- No database.
- No custom CMS backend.
- No need to make Astro SSR.
- Config can map directly to `src/content/posts/*.md`.
- Drafts can be represented as `draft: true` Markdown files.
- AI pipeline can open a branch, commit draft Markdown, and let editors review through the CMS.
- Decap-compatible config gives a fallback path.

### Cons

- GitHub OAuth needs setup.
- If using editorial workflow, branch/PR behavior must be designed carefully.
- Sveltia is newer than Decap; Decap is more established but less modern.
- Paid content and members are not built in.

### Fit Decision

Recommended first-stage CMS. Use Sveltia CMS as the editor UI and keep the config Decap-compatible so switching back to Decap remains possible.

## 4. Ghost

### What It Is

Ghost is a mature publishing CMS with editor, drafts, posts, tags, authors, members, newsletters, paid tiers, and Admin API support.

### Pros

- Excellent editorial UX.
- Built-in drafts and scheduling.
- Built-in members, newsletters, and paid content.
- Admin API is good for AI-generated draft creation.
- Strong fit for commercial publishing if Ghost becomes the source of truth.

### Cons

- Not Git-based.
- Content moves out of `src/content/posts`.
- Existing Astro routes, RSS, sitemap, content schema, and Markdown workflow need migration.
- Multilingual grouping and current custom frontmatter metadata need conventions or extra mapping.
- Cloudflare Pages can remain only if Astro becomes headless frontend consuming Ghost, or if Ghost lives on a separate domain.

### Fit Decision

Do not use Ghost as the first-stage Markdown CMS. Keep it as a business-layer candidate for newsletters, members, paid posts, and API-powered AI draft publishing after Git-based CMS adoption is stable.

## 5. Payload CMS

### What It Is

Payload is a TypeScript-first headless CMS and application framework. It is code-first, extensible, and database-backed.

### Pros

- Very flexible.
- Strong custom admin and access-control possibilities.
- Built-in APIs.
- Can model complex multilingual, paid, resource, and workflow logic.
- Good if the project becomes a custom product platform rather than a static publication.

### Cons

- Not Git-based.
- Requires database hosting and migrations.
- Adds a separate app runtime.
- Much larger operational surface than needed now.
- Risks recreating the "build a CMS" problem with a larger framework.
- Overkill for editing Markdown articles in Astro.

### Fit Decision

Not recommended for this phase. Revisit only if OmniHex Lab becomes a database-backed product with complex accounts, resources, permissions, and custom APIs that Ghost/Sveltia cannot handle.

## Files That Would Need Changes

For the recommended Sveltia/Decap-compatible path:

- `public/admin/index.html`
  - Static admin entry that loads Sveltia CMS or Decap CMS.
- `public/admin/config.yml`
  - CMS collections and fields mapped to `src/content/posts`.
- `src/content.config.ts`
  - No immediate change if the CMS writes the same frontmatter fields.
  - Later add any missing fields only after the CMS config proves stable.
- `src/consts.ts`
  - Optional: centralize category labels if CMS config and site constants drift.
- `docs/AI_PIPELINE.md`
  - Add CMS-specific draft workflow once selected.
- `scripts/digest-to-ghost.js`
  - Eventually rename or supplement with `digest-to-markdown.js` for Git-based drafts.
- `functions/api/posts.js`
  - Keep for now; later deprecate if CMS + AI pipeline replaces it.
- `server/`
  - Do not expand as CMS.
  - Keep only as archived/prototype tooling unless deliberately removed later.

No first-stage changes should be required to:

- `astro.config.mjs`
- route files under `src/pages`
- Cloudflare Pages build command
- existing Markdown posts

## Migrating Existing Articles

First-stage migration is mostly configuration, not content conversion.

Steps:

1. Map current Astro frontmatter fields into CMS fields:
   - `title`: string
   - `description`: text
   - `pubDate`: date
   - `category`: select
   - `language`: select
   - `tags`: list
   - `draft`: boolean
   - `seoTitle`: optional string
   - `seoDescription`: optional text
   - `targetQuery`: optional string
   - `keywords`: list
   - `searchIntent`: optional string
   - `source`: optional string
   - `sourceUrl`: optional URL
   - `translationKey`: optional string
   - `canonicalLanguage`: select/string
   - `originalLanguage`: optional string
   - `bookTitle`, `bookAuthor`, `bookCategory`: optional strings
2. Configure the CMS collection path as `src/content/posts`.
3. Ensure body content maps to the Markdown body after frontmatter.
4. Open existing posts in CMS and verify:
   - frontmatter parses correctly
   - Markdown body is editable
   - arrays such as `tags` and `keywords` round-trip safely
   - dates are not rewritten unexpectedly
5. Run `npm run build`.
6. Only after a successful build, allow editors to create new drafts.

No bulk rewrite should happen in phase 1.

## Preserving Cloudflare Pages

The current Cloudflare Pages setup should remain:

- Build command: `npm run build`
- Output directory: `dist`
- Static Astro output
- Existing Cloudflare Pages Functions remain available

For Sveltia/Decap:

- Admin UI is static under `/admin/`.
- CMS commits Markdown changes to GitHub.
- GitHub push triggers Cloudflare Pages build.
- Published content appears after the static build finishes.

If GitHub OAuth needs a helper:

- Use a small OAuth proxy or Cloudflare Worker.
- Do not turn the Astro site into SSR just for CMS auth.
- Do not route CMS auth through the paused `server/` app.

## AI Pipeline Into CMS

The AI pipeline should target Git-based drafts first.

Recommended draft flow:

1. Fetch or receive source items.
2. Deduplicate and score.
3. Generate summary and translations.
4. Create Markdown files under `src/content/posts`.
5. Set `draft: true`.
6. Add metadata:
   - `source`
   - `sourceUrl`
   - `language`
   - `translationKey`
   - `tags`
   - `keywords`
   - `seoTitle`
   - `seoDescription`
7. Commit to a branch such as `ai-drafts/YYYY-MM-DD-topic`.
8. Open a pull request or push to an editorial workflow branch.
9. Editor opens the CMS, reviews the draft, revises content, and flips `draft` when ready.
10. Merge/publish through GitHub and Cloudflare Pages.

Do not make AI publish directly to production in phase 1.

Ghost-specific scripts can remain useful for later, but the Git CMS path should add a Markdown draft generator rather than making Ghost the required publishing target.

## Features Not To Build In-House

Do not write these as custom project code in the paused `server/` app:

- CMS editor UI.
- User management for editors.
- Git branch editing UI.
- Image/media library beyond what CMS provides.
- Editorial workflow UI.
- Paid subscriptions.
- Payment processing.
- Newsletter sending.
- Member portal.
- Role-based CMS permissions.
- Custom WYSIWYG editor.
- Custom translation management UI.

Use mature products:

- Sveltia/Decap for Markdown Git editing.
- GitHub for version history, branches, PRs, and auditability.
- Cloudflare Pages for static deploys.
- Ghost later for members, newsletters, and paid content if needed.
- Stripe only through Ghost or another mature platform, not custom payment code.

## First-Stage Minimal Landing Plan

### Step 1: Confirm CMS Choice

Choose Sveltia CMS as primary with Decap-compatible config.

Decision checkpoint:

- If GitHub auth works cleanly, continue with Sveltia.
- If Sveltia has blocking beta issues, swap UI to Decap using the same config.

### Step 2: Add Static CMS Files

Add:

- `public/admin/index.html`
- `public/admin/config.yml`

Do not modify Astro rendering yet.

### Step 3: Configure Collections

Create one collection:

- name: `posts`
- folder: `src/content/posts`
- extension: `md`
- frontmatter fields matching `src/content.config.ts`
- body field for Markdown content

### Step 4: Configure GitHub Backend

Use GitHub backend against:

- owner: `zzz123hash`
- repo: `ai-news-lab`
- branch: `main`

Prefer editorial branches or pull requests if available.

### Step 5: Test Existing Content

Open 3 representative posts:

- one multilingual brief
- one prompt article
- one book article

Save only a harmless draft test or use a branch.

### Step 6: Build Gate

Run:

- `npm run build`

The build must pass before editors use the CMS routinely.

### Step 7: AI Draft Adapter

Add a script later, not now in this plan:

- `scripts/digest-to-markdown.js`

It should generate `draft: true` Markdown, not publish directly.

### Step 8: Document Editor Workflow

Add docs for:

- creating a draft
- editing tags/categories/language
- reviewing AI-generated content
- publishing by flipping `draft`
- what not to edit

## Decision Summary

Recommended:

- **Primary CMS now:** Sveltia CMS with Decap-compatible config.
- **Fallback CMS:** Decap CMS.
- **Business layer later:** Ghost.
- **Do not use now:** Payload CMS.
- **Do not continue:** custom `server/` CMS expansion.

This path keeps the current Astro site stable, preserves GitHub as the content source of truth, lets Cloudflare Pages continue unchanged, and gives the AI pipeline a simple target: Markdown drafts reviewed by humans before publication.

## References

- Keystatic introduction: https://keystatic.com/docs/introduction
- Keystatic Astro integration: https://keystatic.com/docs/installation-astro
- Keystatic GitHub mode: https://keystatic.com/docs/github-mode
- TinaCMS overview: https://tina.io/tinadocs/docs/using-tinacms/what-is-tinacms
- Sveltia CMS intro: https://sveltiacms.app/en/docs/intro
- Sveltia CMS backends: https://sveltiacms.app/en/docs/backends
- Decap CMS backends: https://decapcms.org/docs/backends-overview/
- Decap CMS configuration: https://decapcms.org/docs/configure-decap-cms/
- Ghost Admin API: https://docs.ghost.org/admin-api
- Ghost Members: https://ghost.org/docs/members/
- Payload overview: https://payloadcms.com/docs/getting-started/what-is-payload
- Payload database overview: https://payloadcms.com/docs/database/overview

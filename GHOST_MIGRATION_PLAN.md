# Ghost Migration Plan

This plan evaluates Ghost as the main CMS for OmniHex Lab while preserving the current Astro static site and Cloudflare Pages deployment.

## Current Astro Site Analysis

### Runtime and deployment

- Framework: Astro static output.
- Production site: `https://lab.omnihex.xyz`.
- Current deployment: Cloudflare Pages with output in `dist/`.
- Integrations: `@astrojs/rss` and `@astrojs/sitemap`.
- Dynamic write boundary today: Cloudflare Pages Function `POST /api/posts`, which writes Markdown posts to GitHub.
- Existing static admin prototype: `src/pages/admin/*`. It is not a real CMS and should not be expanded if Ghost becomes the CMS.

### Pages and routes

- Home page: `src/pages/index.astro`.
  - Highlights representative posts from `briefs`, `prompts`, and `life/guides`.
  - Links to `/subscribe/` and `/rss.xml`.
- Category pages: `src/pages/[category]/index.astro`.
  - Generated from `CATEGORIES`.
  - Excludes `briefs`, because briefs have a custom grouped page.
- Article pages: `src/pages/[category]/[...slug].astro`.
  - Generated only for non-draft Markdown posts.
  - URL shape: `/{category}/{slug}/`.
- Briefs page: `src/pages/briefs/index.astro`.
  - Groups representative brief posts by language.
- Product landing page: `src/pages/products/90-day-life-reset/index.astro`.
  - Static placeholder for a future workbook.
- Subscribe page: `src/pages/subscribe.astro`.
  - Calls an external subscription endpoint at `https://data.lab.omnihex.xyz/subscribe`.
- Public API pages:
  - `src/pages/api/index.astro`
  - `src/pages/api/public/posts-data.json.js`
- Static legal/content pages:
  - `about`, `contact`, `privacy-policy`, `disclaimer`, `rss`.

### Content collection

Posts live in `src/content/posts/*.md` and use the Astro `posts` collection in `src/content.config.ts`.

Frontmatter fields:

- Required: `title`, `description`, `pubDate`, `category`
- Defaulted/optional: `tags`, `language`, `source`, `sourceUrl`, `draft`
- SEO fields: `seoTitle`, `seoDescription`, `targetQuery`, `keywords`, `searchIntent`
- Translation fields: `translationKey`, `canonicalLanguage`, `originalLanguage`
- Book fields: `bookTitle`, `bookAuthor`, `bookCategory`

Current content inventory from `src/content/posts`:

- Total posts: 34
- Categories in use: `life` 9, `briefs` 8, `prompts` 7, `books` 5, `guides` 2, `ai` 2, `news` 1
- Languages in use: `en` 8, `id` 8, `pt` 7, `es` 6, `zh-CN` 5
- Drafts: 0
- Posts with `translationKey`: 20
- Posts with book metadata: 5

Configured category slugs:

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

### RSS, SEO, and discovery

- `src/pages/rss.xml.js` emits RSS through `@astrojs/rss`.
- RSS uses representative posts, not every translation.
- `BaseHead.astro` provides:
  - canonical URLs
  - sitemap link
  - RSS alternate link
  - Google site verification
  - title and description meta
  - optional keywords meta
  - Open Graph and Twitter summary metadata
- `BlogPost.astro` adds:
  - article JSON-LD
  - `hreflang` links for translated groups
  - canonical URL based on `/{category}/{slug}/`
  - SEO title/description fallback logic
  - keyword fallback from `keywords` to `tags`
- `public/robots.txt` points crawlers to the sitemap.

## Ghost Fit

Ghost is a strong fit if the next priority is editorial production instead of custom backend engineering:

- Built-in editor, drafts, scheduled publishing, authors, tags, canonical URLs, RSS, sitemap, members, newsletters, and paid tiers.
- Native Admin API can create draft posts from server-side scripts.
- Built-in members and Stripe-backed paid tiers reduce custom user/payment work.

Main tradeoffs:

- Ghost is no longer a flat Markdown-in-Git source of truth.
- Some current custom metadata has no direct Ghost field and should move into tags, internal tags, excerpts, code injection, or a sidecar mapping.
- Existing Astro URL shape and multilingual grouping need deliberate migration or a headless setup.
- Ghost themes and routing may need customization to match current `/category/slug/` behavior.

## Proposed Ghost Content Model

### Posts

Use Ghost posts for all editorial articles:

| Astro field | Ghost mapping |
| --- | --- |
| `title` | `title` |
| Markdown body | `html` via `POST /posts/?source=html`, or native Lexical later |
| `description` | `custom_excerpt` and fallback `meta_description` |
| `seoTitle` | `meta_title` |
| `seoDescription` | `meta_description` |
| `pubDate` | `published_at` for imported published content |
| `draft` | `status: draft` or `status: published` |
| `category` | primary public tag, e.g. `AI`, `Briefs`, `Life OS` |
| `tags` | Ghost public tags |
| `language` | internal tag such as `#lang-en` |
| `translationKey` | internal tag such as `#translation-{key}` or external mapping |
| `canonicalLanguage` | internal tag or external mapping |
| `source`, `sourceUrl` | source block in content, canonical URL, or internal metadata mapping |
| `bookTitle`, `bookAuthor`, `bookCategory` | public/internal tags plus a standard content block |

Recommended first-pass Ghost post conventions:

- Public primary tag as section: `AI`, `News`, `Tutorials`, `Prompts`, `Tools`, `Briefs`, `Life OS`, `Guides`, `Products`, `Books`.
- Internal language tag: `#lang-en`, `#lang-zh`, `#lang-id`, `#lang-pt`, `#lang-es`.
- Internal type tags: `#brief`, `#book-note`, `#resource`, `#ai-generated`.
- Keep source attribution in the body until a stronger metadata strategy is needed.

### Tags

Use tags for both navigation and metadata:

- Public tags:
  - The current 10 categories become public tags or collections.
  - Existing frontmatter `tags` remain public tags.
- Internal tags:
  - Language: `#lang-en`
  - Translation group: `#translation-simple-multilingual-ai-brief-workflow`
  - Workflow state: `#ai-draft`, `#needs-review`
  - Resource type: `#resource-template`, `#resource-workbook`

Ghost supports linking tags during post creation using short names or long form tag objects.

### Authors

Use Ghost staff users as authors:

- Default author: `OmniHex Lab`.
- Optional editorial authors: `AI Editor`, `Reading Lab`, or real staff accounts.
- API publishing can attach authors by email when the author exists in Ghost.
- Do not model authors as plain tags unless the author is not a real Ghost staff user.

### Members

Use Ghost Members for the subscriber layer:

- Map current `/subscribe/` intent into Ghost member signup later.
- Member fields should map to Ghost's native model: `email`, `name`, `status`, `labels`, newsletters.
- Use labels for interests: `AI news`, `Prompts`, `Life OS`, `Automation`, `API`.
- Use newsletters for delivery lanes once editorial cadence is clear.

### Paid Posts

Do not implement paid content in the first Ghost pilot.

Later model:

- Free public articles: `visibility: public`
- Free subscriber-only articles: `visibility: members`
- Paid articles: `visibility: paid`
- Premium plans: Ghost tiers
- Payments: Ghost's Stripe integration

This replaces any need for custom payments in the near term.

### Resources

Use a light resource model before building a custom database:

- Resource articles: Ghost posts tagged `Resources` and internal resource type tags.
- Evergreen resource pages: Ghost pages for static landing pages.
- Products/workbooks: Ghost pages first; paid resources later can become member/paid posts or tier-gated pages.
- Downloads and file storage should wait until Ghost asset handling and payment strategy are confirmed.

## 内容栏目设计

Ghost 作为主站 CMS 后，栏目应该先服务三个目标：稳定发布、清晰导航、方便后续商业化。第一阶段不追求复杂信息架构，优先把现有 Astro 的 10 个 category 收敛成可运营的 Ghost tags 和 collections。

### 主栏目

- `AI Briefs`
  - 对应当前 `briefs` 和一部分 `news`。
  - 形态：每日或每周 AI 资讯摘要。
  - Ghost 标记：public tag `AI Briefs`，internal tags `#digest`, `#needs-review`, `#lang-en` 等。
- `Prompt Library`
  - 对应当前 `prompts`。
  - 形态：可复用 prompt、工作流模板、写作模板。
  - 适合长期 SEO 和后续会员资源沉淀。
- `AI Tools`
  - 对应当前 `tools`。
  - 形态：工具介绍、对比、实操场景、自动化方法。
  - 第一阶段先做内容栏目，不做工具数据库。
- `Life OS`
  - 对应当前 `life` 和 `guides`。
  - 形态：个人系统、习惯、计划、AI self-coaching。
  - 可承接未来会员 newsletter 和产品转化。
- `Reading Lab`
  - 对应当前 `books`。
  - 形态：应用型读书笔记、行动指南、主题书单。
  - 继续遵守不复刻书籍、不做完整章节摘要的版权边界。
- `Products`
  - 对应当前 `products`。
  - 形态：产品页、workbook 介绍、资源入口。
  - 第一阶段只做页面和 waitlist，不接支付。

### 辅助栏目

- `Tutorials`
  - 作为 `AI Tools` 和 `Prompt Library` 的教程型内容入口。
  - 可以用 public tag 保留，不一定放进顶部导航。
- `News`
  - 不建议作为独立长期主栏目，避免泛新闻压力。
  - 资讯内容优先进入 `AI Briefs`，深度解读再进入 `AI Tools` 或 `AI Briefs`。
- `Resources`
  - 作为资源中心标签，不急于做独立数据库。
  - 示例：checklist、template、prompt pack、workbook preview。

### 多语言栏目规则

- 每篇文章只选择一个主栏目 public tag。
- 语言用 internal tag 表示：`#lang-en`, `#lang-zh`, `#lang-id`, `#lang-pt`, `#lang-es`。
- 翻译组用 internal tag 表示：`#translation-{stable-key}`。
- Ghost 首期不强行实现完整 hreflang 自动化，先保证编辑和发布流程稳定。
- 如果 Ghost theme 无法优雅表达多语言切换，后期考虑 headless Ghost + Astro 前端。

### 首页推荐结构

Ghost 主题首页建议先展示：

- Latest AI Briefs
- Prompt Library
- Life OS Guides
- Reading Lab
- Resources
- Subscribe / Members CTA

这与现有 Astro 首页的内容重心接近，迁移时更容易维持用户认知和 SEO 连续性。

## 商业化路径

商业化应分阶段推进，不在 Ghost pilot 阶段接支付。先验证内容生产和订阅关系，再启用 Ghost members 与 paid tiers。

### 阶段 1：免费内容和邮件订阅

- Ghost 负责主站内容、草稿、编辑、RSS、newsletter。
- 所有文章先保持 `visibility: public`。
- 目标是形成稳定内容节奏：
  - AI Briefs：高频轻量资讯。
  - Prompt Library：中频 SEO 长尾内容。
  - Life OS / Reading Lab：低频高信任内容。
- CTA 只引导免费订阅，不做付费承诺。

### 阶段 2：会员关系和分层内容

- 启用 Ghost Members。
- 用 labels 标记兴趣：
  - `AI news`
  - `Prompts`
  - `Life OS`
  - `Reading Lab`
  - `Resources`
- 部分内容可以设置为 `visibility: members`：
  - 每周 digest 完整版。
  - prompt pack preview。
  - workbook preview。
  - Reading Lab action checklist。
- 仍不需要自研用户系统。

### 阶段 3：轻量付费产品

- 在 Ghost 内容和订阅转化稳定后，再评估 paid tiers。
- 候选产品：
  - premium AI digest。
  - prompt pack。
  - 90-Day Life Reset workbook。
  - Reading Lab action templates。
- 先使用 Ghost tiers 和 Stripe 集成，避免自研支付。
- 付费内容优先用 `visibility: paid`，下载交付方案后期再定。

### 阶段 4：资源库和自动化

- 当资源数量足够多，再考虑资源库。
- 初期资源仍然可以是 Ghost posts/pages + tags。
- 后期才考虑：
  - 独立资源索引。
  - 会员下载权限。
  - Webhook 触发自动化。
  - API 化内容分发。

### 暂不做

- 不做自研支付。
- 不做复杂用户系统。
- 不做多租户 CMS。
- 不把暂停中的自研 server 作为主系统。

## Ghost Admin API Draft Creation

Official behavior to rely on:

- Admin API base URL: `https://{admin_domain}/ghost/api/admin/`
- Requests use JSON wrappers such as `{ "posts": [{ ... }] }`
- Admin API keys are `id:secret` and are used to create short-lived JWTs.
- JWT header uses `alg: HS256`, `typ: JWT`, and `kid` from the key id.
- JWT payload uses `iat`, `exp`, and `aud: "/admin/"`; expiration must be short-lived.
- Auth header format: `Authorization: Ghost <token>`.
- Create post endpoint: `POST /ghost/api/admin/posts/`.
- Required field for creating a post is `title`.
- To send HTML content instead of Lexical, call `POST /ghost/api/admin/posts/?source=html` and include `html`.
- Set `status: "draft"` to create a draft.

The example script added in `scripts/publish-to-ghost.js` follows this flow without adding dependencies.

Example usage:

```sh
GHOST_ADMIN_API_URL=https://your-ghost-domain.com \
GHOST_ADMIN_API_KEY=<id>:<hex-secret> \
GHOST_POST_TITLE="AI Generated Draft" \
GHOST_POST_TAGS="AI, Draft, Workflow" \
node scripts/publish-to-ghost.js
```

## Migration Strategy

### Keep for now

- Current Astro site on Cloudflare Pages.
- Existing Markdown content in `src/content/posts`.
- Current `/rss.xml`, sitemap, public API JSON, and static pages.
- Existing `/api/posts` until Ghost pilot proves it can replace the publishing flow.
- The static product landing and subscribe page until Ghost members/tiers are configured.

### Migrate first

- Create a Ghost sandbox instance.
- Define tags for the 10 current categories.
- Create default author/staff user.
- Use `scripts/publish-to-ghost.js` to publish one AI-generated draft.
- Import a small sample set:
  - one brief translation group
  - one prompt article
  - one Life OS guide
  - one Reading Lab/book article
- Validate:
  - draft editing
  - tag navigation
  - RSS output
  - canonical URLs
  - SEO metadata
  - multilingual grouping workaround

### Migrate later

- Full Markdown import with URL redirect mapping.
- Custom Ghost theme or headless Astro frontend.
- Members and newsletters.
- Paid posts and tiers.
- Product/resource delivery.
- Webhooks to trigger search indexing or downstream automation.
- Image upload pipeline and source attribution policy.

### Do not do now

- Do not expand `server/index.js`.
- Do not replace the Astro Cloudflare Pages deployment yet.
- Do not introduce payments before Ghost tiers and content access are validated.
- Do not build a parallel custom CMS around Ghost.

## Recommended Decision Gate

Run a Ghost pilot with 5-10 representative articles. Ghost is viable as the main CMS if:

- Draft creation through Admin API is reliable.
- The editor flow is faster than Markdown PR-style publishing.
- Current category and SEO needs can be reproduced with tags, theme routing, and post metadata.
- Multilingual groups can be represented well enough for users and search engines.
- Members/newsletters reduce custom backend scope instead of creating new complexity.

If the pilot fails mainly on presentation or routing, consider headless Ghost with Astro as the frontend. If it fails on content metadata or multilingual management, keep Astro Markdown as source of truth and use Ghost only for newsletters/members.

## References

- Ghost Admin API overview: https://docs.ghost.org/admin-api
- Ghost Admin API creating a post: https://docs.ghost.org/admin-api/posts/creating-a-post
- Ghost Admin API posts overview: https://docs.ghost.org/admin-api/posts/overview
- Ghost Members concept: https://docs.ghost.org/members/
- Ghost Admin API members: https://docs.ghost.org/admin-api/members/overview
- Ghost Admin API tiers: https://docs.ghost.org/admin-api/tiers/overview

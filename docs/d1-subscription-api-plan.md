# D1 Subscription and API Key Plan

## Goals

The first D1-backed service should validate a small, useful user loop without adding account complexity:

- Email subscription for OmniHex Lab updates.
- API Key creation and status checks for lightweight API consumers.
- Topic and language follows for user preferences.
- Personalized feed retrieval based on follows and public notifications.
- Future membership support reserved through simple plan and status fields.

## Non-goals

The first version should not become a full account platform:

- No complex membership system.
- No payment integration.
- No full OAuth account system.
- No social graph, comments, likes, or community features.
- No migration of the existing static front-end or VPS AI API into D1.

## Architecture

OmniHex Lab should keep three clearly separated runtime surfaces:

- `lab.omnihex.xyz`: Cloudflare Pages static front-end for the public Astro site, SEO pages, and subscription UI.
- `api.lab.omnihex.xyz`: VPS AI and dynamic API surface for AI-generated or compute-heavy features.
- `data.lab.omnihex.xyz`: Cloudflare Worker + D1 service for subscriptions, API Keys, preferences, lightweight membership state, usage counters, and feed metadata.

The static front-end calls `data.lab.omnihex.xyz` for user data flows. The VPS API remains responsible for dynamic AI work. If the data service is unavailable, the public site should remain usable as a static site.

## D1 Tables

### users

Canonical lightweight identity record. Version 1 can create a user from an email subscription without password or OAuth.

| Column | Purpose |
| --- | --- |
| `id` | Stable user id. |
| `email` | Normalized email address. |
| `plan` | Reserved membership plan: `free` by default, future `pro`. |
| `status` | `active`, `unverified`, `unsubscribed`, `suspended`, or `deleted`. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |
| `verified_at` | Optional email verification timestamp. |

Suggested constraints:

- Unique `email`.
- Default `plan = free`.
- Default `status = unverified` until the email flow is confirmed.

### subscribers

Subscription state and consent tracking. This table keeps mailing preferences separate from the canonical user record.

| Column | Purpose |
| --- | --- |
| `id` | Subscription id. |
| `user_id` | Linked user id. |
| `email` | Denormalized normalized email for simple lookups. |
| `status` | `subscribed`, `unsubscribed`, `bounced`, or `complained`. |
| `source` | Signup source such as `home`, `article`, or `api`. |
| `unsubscribe_token_hash` | Hash of the unsubscribe token. |
| `consent_at` | Subscription consent timestamp. |
| `unsubscribed_at` | Unsubscribe timestamp. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Suggested constraints:

- Unique `email`.
- Never store the raw unsubscribe token after issuing it.

### api_keys

API Key metadata. Raw keys are shown only once and never stored in D1.

| Column | Purpose |
| --- | --- |
| `id` | API Key id. |
| `user_id` | Owner user id. |
| `key_hash` | Hash of the full API Key. |
| `key_prefix` | Safe display prefix, for example the first 8 to 12 characters. |
| `name` | User-facing key label. |
| `daily_limit` | Per-day request limit. |
| `status` | `active`, `revoked`, `suspended`, or `expired`. |
| `last_used_at` | Last successful use timestamp. |
| `created_at` | Creation timestamp. |
| `expires_at` | Optional expiry timestamp. |

Suggested constraints:

- Unique `key_hash`.
- Index `key_prefix` for support and dashboard lookups.
- Default `daily_limit` should be generous for free users but easy to tune.

### follows

User topic, category, and language preferences.

| Column | Purpose |
| --- | --- |
| `id` | Follow id. |
| `user_id` | Linked user id. |
| `follow_type` | `topic`, `category`, `language`, `product`, or future feed type. |
| `follow_key` | Stable key such as `ai-agents`, `prompts`, `en`, or `zh`. |
| `created_at` | Creation timestamp. |

Suggested constraints:

- Unique pair of `user_id` and `follow_type + follow_key`.
- Free plan can allow enough follows for a useful first experience.

### api_usage_daily

Daily API usage counter for rate limiting and product analytics.

| Column | Purpose |
| --- | --- |
| `id` | Usage row id. |
| `api_key_id` | Linked API Key id. |
| `usage_date` | UTC date bucket. |
| `endpoint_group` | Logical route group such as `feed`, `signals`, or `status`. |
| `request_count` | Total requests for the bucket. |
| `success_count` | Successful requests. |
| `error_count` | Failed requests. |
| `updated_at` | Last counter update timestamp. |

Suggested constraints:

- Unique `api_key_id + usage_date + endpoint_group`.
- Keep writes small and predictable because D1 has free-tier limits.

### notifications

Feed items that can be public, personalized by follows, or reserved for future paid plans.

| Column | Purpose |
| --- | --- |
| `id` | Notification id. |
| `kind` | `post`, `signal`, `release`, `tool`, or future item kind. |
| `title` | Feed title. |
| `summary` | Short feed summary. |
| `url` | Canonical URL or API URL. |
| `category` | Content category. |
| `language` | Content language. |
| `topic_key` | Optional topic key for matching follows. |
| `plan_visibility` | `free`, `pro`, or `internal`. |
| `status` | `draft`, `published`, or `archived`. |
| `published_at` | Feed publication timestamp. |
| `expires_at` | Optional expiry timestamp. |
| `payload_json` | Small optional metadata payload. |
| `created_at` | Creation timestamp. |

Suggested constraints:

- Index `status + published_at`.
- Index `category`, `language`, and `topic_key` for feed filtering.

## Version 1 API

All routes live under `https://data.lab.omnihex.xyz`. Responses should use JSON except for simple redirect-based unsubscribe flows.

### `POST /subscribe`

Creates or updates a subscriber and ensures a lightweight user exists.

Request fields:

- `email`
- `topics`, optional array of topic or category keys.
- `languages`, optional array of language keys.
- `source`, optional signup source.

Behavior:

- Normalize and validate the email.
- Upsert `users` and `subscribers`.
- Store follows when provided.
- Issue an unsubscribe token and store only its hash.
- Optionally issue an API Key in the response if the first version wants a single-step onboarding flow.

### `GET /unsubscribe`

Unsubscribes an email using a token.

Query fields:

- `email`
- `token`

Behavior:

- Hash the provided token and compare it to `unsubscribe_token_hash`.
- Mark the subscriber as `unsubscribed`.
- Keep the user record for API Key and preference continuity unless deletion is requested later.
- Return a simple confirmation page or redirect back to `lab.omnihex.xyz`.

### `GET /feed`

Returns public or personalized feed items.

Auth options:

- API Key through an `Authorization: Bearer ...` header.
- Optional email/token flow later for subscribers without API Keys.

Query fields:

- `category`
- `language`
- `topic`
- `limit`

Behavior:

- Without a key, return public published notifications.
- With a valid key, apply the user's follows and plan visibility.
- Count usage in `api_usage_daily`.
- Keep the response small and cacheable where possible.

### `GET /key/status`

Returns status for the current API Key.

Auth:

- API Key through an `Authorization: Bearer ...` header.

Response should include:

- `key_prefix`
- `status`
- `plan`
- `daily_limit`
- Current daily usage.
- Remaining daily requests.

### `GET /public/options`

Returns public signup and follow options for the static front-end.

Response should include:

- Available topics.
- Available categories.
- Available languages.
- Free plan limits.
- Public product copy for subscription UI.

## API Key Design

API Keys should be treated as secrets from the first version:

- Generate high-entropy keys server-side in the Worker.
- Show the raw key only once at creation time.
- Store only `key_hash` in D1.
- Store `key_prefix` for display, support, and dashboard use.
- Check `status` before serving authenticated routes.
- Enforce `daily_limit` with `api_usage_daily`.
- Provide revocation by setting `status = revoked`.
- Avoid sending raw keys through query strings.

Recommended key shape:

- Prefix format: `ohx_live_...`
- Display prefix: `ohx_live_abcd1234`
- Raw key body: random, long, URL-safe string.

## Free and Pro Plan Shape

Version 1 should make the free tier useful enough to validate demand:

- Free users get email subscription, API Key access, public feed access, and enough follows for normal use.
- Free limits should be generous for personal use and small prototypes.
- Pro is only reserved in the schema through `users.plan`.

Future Pro benefits:

- No ads or promotional placements.
- Higher API daily limits.
- More followed topics, languages, or saved feed filters.
- Earlier access to Skill, Agent, or MCP feeds.
- Better export and automation options.

No payment system should be added in version 1.

## Future Extensions

The plan intentionally leaves room for:

- Google login.
- GitHub login.
- Resend for email delivery, verification, and unsubscribe messages.
- Lemon Squeezy or Stripe for paid plans.
- Skill feed, Agent feed, and MCP feed item types.
- Account dashboard for keys, follows, usage, and subscription state.
- Worker-to-VPS calls where D1 preferences can personalize VPS AI features.

## Risks and Guardrails

### D1 free-tier limits

D1 is a good fit for lightweight subscriptions and feed metadata, but usage counters can become write-heavy. Keep counters coarse, batch when possible, and avoid per-event logging in the first version.

### Worker and VPS responsibilities

The Worker should own user state, API Keys, preferences, and lightweight feed metadata. The VPS should own AI generation, long-running tasks, and dynamic compute-heavy APIs. Avoid duplicating business logic across both runtimes.

### Privacy and unsubscribe handling

Email storage, consent timestamps, and unsubscribe behavior must be easy to audit. Raw unsubscribe tokens should not be stored. A later deletion flow should be possible without breaking aggregate product analytics.

### API Key leakage and rate limiting

Keys may be copied into client code or leaked through logs. The first version needs revocation, status checks, hash-only storage, and daily limits before the key is useful outside private testing.

## Implementation Boundary

This document is a design plan only. It does not change runtime code, existing Cloudflare Pages behavior, VPS API behavior, or the static SEO content pipeline.

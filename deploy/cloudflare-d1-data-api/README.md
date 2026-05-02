# OmniHex D1 Data API

Minimal Cloudflare Worker + D1 service for `data.lab.omnihex.xyz`.

This MVP covers:

- Email subscription.
- API Key creation and status checks.
- Topic and language follows.
- Public and authenticated feed reads.
- Daily API usage tracking.

It does not include payments, Google login, GitHub login, OAuth, or email delivery.

## Runtime shape

- `lab.omnihex.xyz`: Cloudflare Pages static front-end.
- `api.lab.omnihex.xyz`: VPS AI and dynamic API.
- `data.lab.omnihex.xyz`: this Cloudflare Worker + D1 API.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Worker and D1 health check. |
| `GET` | `/public/options` | Public topics, categories, languages, and free limits. |
| `POST` | `/subscribe` | Subscribe an email, save follows, create an API Key. |
| `GET` | `/feed` | Return public feed or API Key-personalized feed. |
| `GET` | `/key/status` | Return API Key status and daily usage. |
| `GET` | `/unsubscribe` | Unsubscribe by email and token. |

## CORS

The Worker only sends CORS headers for:

- `https://lab.omnihex.xyz`
- `http://localhost:4321`

## Create the D1 database

Install dependencies first:

```bash
npm install
```

Log in to Cloudflare if needed:

```bash
npx wrangler login
```

Create the D1 database:

```bash
npx wrangler d1 create omnihex_data
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "omnihex_data"
database_id = "YOUR_DATABASE_ID"
```

## Apply the schema

For a local D1 database:

```bash
npx wrangler d1 execute omnihex_data --local --file=./schema.sql
```

For the remote production D1 database:

```bash
npx wrangler d1 execute omnihex_data --remote --file=./schema.sql
```

## Run locally

```bash
npm run dev
```

Wrangler will print the local Worker URL, usually `http://localhost:8787`.

## Deploy

```bash
npm run deploy
```

## Bind `data.lab.omnihex.xyz`

Recommended production setup:

1. Deploy the Worker.
2. Open the Cloudflare dashboard for the zone that owns `omnihex.xyz`.
3. Go to Workers and Pages.
4. Select `omnihex-d1-data-api`.
5. Add a custom domain for `data.lab.omnihex.xyz`.
6. Confirm DNS is proxied by Cloudflare.

If the account uses Wrangler routes instead of dashboard custom domains, replace the commented route in `wrangler.toml` with the account's preferred route config.

## Test the API

Health:

```bash
curl http://localhost:8787/health
```

Public options:

```bash
curl http://localhost:8787/public/options
```

Subscribe:

```bash
curl -X POST http://localhost:8787/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reader@example.com",
    "topics": ["ai-agents", "prompts"],
    "languages": ["en"],
    "source": "local-test"
  }'
```

The response includes an API Key. The raw key is only returned once. D1 stores only the hash.

Check key status:

```bash
curl http://localhost:8787/key/status \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Read public feed:

```bash
curl http://localhost:8787/feed
```

Read authenticated feed:

```bash
curl http://localhost:8787/feed \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Unsubscribe:

```bash
curl "http://localhost:8787/unsubscribe?email=reader@example.com&token=YOUR_UNSUBSCRIBE_TOKEN"
```

## Add a test notification

The schema does not seed notifications. Add one manually when testing feed behavior:

```bash
npx wrangler d1 execute omnihex_data --local --command "INSERT INTO notifications (id, kind, title, summary, url, category, language, topic_key, plan_visibility, status, published_at, created_at) VALUES ('test-notification-1', 'signal', 'Test signal', 'A local D1 feed item.', 'https://lab.omnihex.xyz/', 'briefs', 'en', 'ai-agents', 'free', 'published', datetime('now'), datetime('now'));"
```

## Notes

- API Keys use the `ohx_live_` prefix.
- Raw API Keys and unsubscribe tokens are never stored.
- `/feed` increments `api_usage_daily` for authenticated requests.
- Pro is schema-reserved through `users.plan`, but payment is intentionally out of scope.

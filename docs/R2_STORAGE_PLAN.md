# R2 Storage Plan

This plan reserves Cloudflare R2 object storage for images, private reports, paid resources, and AI raw source archives.

No code is connected to R2 yet. OpenClaw runs on the NAS, not on the server. The server may later act as an internal admin surface or public relay, but it should not own the OpenClaw main workload.

## Bucket Strategy

Recommended buckets:

- `omnihex-public-assets`
  - public images and static downloadable assets that can be cached globally.
- `omnihex-private-assets`
  - private reports, paid resources, and AI raw archives.

Using two buckets keeps public cache policy and private authorization policy separate.

## Directory Layout

### 1. Public Images

Bucket:

```text
omnihex-public-assets
```

Object keys:

```text
images/posts/YYYY/MM/{slug}/{asset-name}.{ext}
images/covers/YYYY/MM/{slug}.{ext}
images/brands/{asset-name}.{ext}
images/social/YYYY/MM/{slug}-{variant}.{ext}
```

Access:

- Public read through a custom domain such as `assets.lab.omnihex.xyz`.
- Long-lived cache headers for immutable hashed filenames.
- Use in Astro Markdown frontmatter or body after editorial review.

Examples:

```text
images/posts/2026/05/ai-digest/open-model-cover.webp
images/social/2026/05/ai-digest-og.webp
```

### 2. Private Reports

Bucket:

```text
omnihex-private-assets
```

Object keys:

```text
reports/private/{user_id}/{report_id}/report.pdf
reports/private/{user_id}/{report_id}/report.html
reports/private/{user_id}/{report_id}/metadata.json
reports/pro/YYYY/MM/{report_id}/report.pdf
```

Access:

- Never public bucket access.
- Worker checks user/session/API-key entitlement.
- Worker returns a short-lived signed URL or streams the object.
- D1 `reports.r2_object_key` stores the canonical object key.
- D1 `report_access_logs` records view/download attempts.

### 3. Paid Resources

Bucket:

```text
omnihex-private-assets
```

Object keys:

```text
resources/paid/{resource_id}/v{version}/resource.pdf
resources/paid/{resource_id}/v{version}/resource.zip
resources/paid/{resource_id}/v{version}/preview.pdf
resources/paid/{resource_id}/v{version}/manifest.json
resources/free/{resource_id}/v{version}/resource.pdf
```

Access:

- Free previews can be copied to the public bucket or served through Worker.
- Paid files require Worker authorization.
- Payment/member checks should come from Ghost/Stripe/D1 later, not from file paths alone.
- `manifest.json` should list file names, sizes, hashes, version, and required access level.

### 4. AI Raw Source Archives

Bucket:

```text
omnihex-private-assets
```

Object keys:

```text
ai/raw/openclaw/YYYY/MM/DD/{job_id}/input.json
ai/raw/openclaw/YYYY/MM/DD/{job_id}/items.json
ai/raw/openclaw/YYYY/MM/DD/{job_id}/pages/{source_hash}.html
ai/raw/openclaw/YYYY/MM/DD/{job_id}/screenshots/{source_hash}.png
ai/raw/openclaw/YYYY/MM/DD/{job_id}/logs/run.log
ai/processed/YYYY/MM/DD/{job_id}/digest.json
ai/processed/YYYY/MM/DD/{job_id}/draft.md
```

Access:

- Private only.
- OpenClaw on NAS can upload archives using scoped R2 credentials or a Worker upload endpoint.
- Editors can access selected raw archives through internal tools only.
- Do not expose raw scraped content publicly.
- Apply retention rules once compliance and storage costs are clearer.

## Signed URL / Worker Auth Strategy

Use a Cloudflare Worker as the access gate for private assets.

Recommended flow:

1. Client requests `/assets/private/{report_id}` or `/resources/{resource_id}/download`.
2. Worker authenticates the request.
3. Worker checks D1:
   - user status
   - subscription/access level
   - report/resource ownership
   - API key scope if API access is used
4. Worker records access in `report_access_logs` or a resource access log table later.
5. Worker either:
   - generates a short-lived signed URL, or
   - streams the R2 object directly.

Signed URL guidance:

- Keep expiry short, such as 5-15 minutes.
- Include object key, expiry, and access scope in the signature payload.
- Do not expose raw R2 credentials to browsers.
- Recheck entitlement when generating each signed URL.
- Prefer Worker streaming for highly sensitive reports.

## NAS / OpenClaw Upload Strategy

OpenClaw runs on the NAS.

Allowed NAS outputs:

- Commit Markdown drafts to GitHub.
- Upload raw source archives to R2.
- Upload processed digest JSON to R2.

Not allowed:

- Do not deploy OpenClaw main tasks to the server.
- Do not make the server the primary crawler.
- Do not expose raw source archives publicly.

Credential strategy:

- Use a dedicated R2 token scoped to the private bucket and required prefixes, or upload through a Worker endpoint.
- Rotate NAS credentials periodically.
- Keep job IDs in both R2 object keys and generated Markdown frontmatter where useful.

## Lifecycle and Retention

Suggested defaults:

- Public images: retain indefinitely unless replaced.
- Private reports: retain while user/account/report policy requires.
- Paid resources: retain all published versions unless explicitly deprecated.
- AI raw archives: retain 30-180 days depending on review needs and legal/storage policy.
- AI processed digest JSON: retain longer than raw HTML because it is smaller and useful for audit.

## Deferred Decisions

- Exact bucket names and custom domains.
- Whether to use signed URLs or Worker streaming by default.
- Retention rules for raw scraped content.
- Malware scanning for uploaded resource packs.
- Whether private reports need per-user encryption before upload.

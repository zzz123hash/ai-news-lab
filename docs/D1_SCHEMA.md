# D1 Schema Plan

This document reserves a later Cloudflare D1 data model for membership, subscriptions, API keys, email preferences, payments, reports, and report access logs.

No application code is connected to this schema yet. Do not add Stripe, Ghost, login, or database integration in the current phase.

## Design Goals

- Keep Astro + Markdown as the public content layer for now.
- Use D1 later for account-adjacent state that does not belong in Markdown.
- Keep payment records as external-provider references, not as the source of truth for billing.
- Keep API key usage separate from article access.
- Support future personalized reports and audit logs.

## Entity Overview

- `users`: canonical identity/contact record.
- `subscriptions`: current and historical membership/API plan records.
- `api_keys`: hashed API keys and limits.
- `api_usage_daily`: per-key daily usage counters.
- `email_subscriptions`: topic/language email preferences.
- `payments`: payment provider event snapshots and reconciliation status.
- `reports`: generated report metadata.
- `report_access_logs`: audit trail for report views/downloads.

## SQL Schema

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'blocked', 'deleted')),
  source TEXT NOT NULL DEFAULT 'site',
  locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'api', 'team')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  provider TEXT NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('manual', 'ghost', 'stripe', 'cloudflare')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0
    CHECK (cancel_at_period_end IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked', 'expired')),
  scopes_json TEXT NOT NULL DEFAULT '["read:public"]',
  daily_limit INTEGER NOT NULL DEFAULT 1000,
  monthly_limit INTEGER,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);

CREATE TABLE api_usage_daily (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  cached_count INTEGER NOT NULL DEFAULT 0,
  bytes_out INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (api_key_id, usage_date, endpoint),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_usage_daily_date ON api_usage_daily(usage_date);
CREATE INDEX idx_api_usage_daily_key_date ON api_usage_daily(api_key_id, usage_date);

CREATE TABLE email_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  topics_json TEXT NOT NULL DEFAULT '[]',
  languages_json TEXT NOT NULL DEFAULT '["en"]',
  cadence TEXT NOT NULL DEFAULT 'weekly'
    CHECK (cadence IN ('daily', 'weekly', 'monthly', 'product_only', 'paused')),
  source TEXT NOT NULL DEFAULT 'subscribe-page',
  unsubscribe_token_hash TEXT NOT NULL UNIQUE,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_subscriptions_user_id ON email_subscriptions(user_id);
CREATE INDEX idx_email_subscriptions_status ON email_subscriptions(status);
CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subscription_id TEXT,
  provider TEXT NOT NULL
    CHECK (provider IN ('stripe', 'ghost', 'manual')),
  provider_event_id TEXT UNIQUE,
  provider_payment_id TEXT,
  provider_customer_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'disputed')),
  paid_at TEXT,
  raw_event_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_payment_id ON payments(provider_payment_id);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL DEFAULT 'briefing'
    CHECK (report_type IN ('briefing', 'digest', 'research', 'resource_pack', 'api_export')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'archived', 'deleted')),
  access TEXT NOT NULL DEFAULT 'free'
    CHECK (access IN ('free', 'pro', 'private')),
  language TEXT NOT NULL DEFAULT 'en',
  topics_json TEXT NOT NULL DEFAULT '[]',
  r2_object_key TEXT,
  public_url TEXT,
  source_job_id TEXT,
  generated_at TEXT,
  published_at TEXT,
  expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_access ON reports(access);
CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_published_at ON reports(published_at);

CREATE TABLE report_access_logs (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  user_id TEXT,
  api_key_id TEXT,
  action TEXT NOT NULL
    CHECK (action IN ('view', 'download', 'signed_url', 'api_read')),
  access_result TEXT NOT NULL
    CHECK (access_result IN ('allowed', 'denied')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  country TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_report_access_logs_report_id ON report_access_logs(report_id);
CREATE INDEX idx_report_access_logs_user_id ON report_access_logs(user_id);
CREATE INDEX idx_report_access_logs_api_key_id ON report_access_logs(api_key_id);
CREATE INDEX idx_report_access_logs_created_at ON report_access_logs(created_at);
```

## Table Notes

### users

Stores identity and contact state. Email should be normalized to lowercase before insertion. `status=deleted` can be used for soft deletion while preserving payment/report audit records.

### subscriptions

Tracks membership or API plan state. `provider` allows future Ghost/Stripe/manual transitions without committing now. Store provider IDs for reconciliation only.

### api_keys

Store only key hashes, never raw API keys. Show raw keys only once at creation. `key_prefix` supports debugging and user-facing identification.

### api_usage_daily

Aggregates usage by key, day, and endpoint. This keeps reads cheap for rate limits and billing/reporting dashboards.

### email_subscriptions

Stores preferences independently from paid status. A free subscriber can receive public digests; a future Pro subscriber can receive paid briefings.

### payments

Reserved for later provider events. This table is not a payment processor and must not be treated as the billing authority.

### reports

Stores generated report metadata. Large files should live in R2, with D1 storing `r2_object_key` and access metadata.

### report_access_logs

Audit trail for private/pro report access. Store hashed IP/user-agent values when possible to reduce sensitive data retention.

## Deferred Decisions

- Exact ID format: UUID, ULID, or Workers-generated random IDs.
- Provider webhook verification strategy.
- Retention windows for raw access logs.
- Whether Ghost remains the membership source of truth or D1 becomes the API product source of truth.

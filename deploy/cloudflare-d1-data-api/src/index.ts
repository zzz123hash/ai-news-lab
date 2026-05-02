import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
	DB: D1Database;
};

type AppEnv = {
	Bindings: Env;
};

type UserRecord = {
	id: string;
	email: string;
	plan: 'free' | 'pro';
	status: string;
};

type ApiKeyRecord = {
	id: string;
	user_id: string;
	key_prefix: string;
	daily_limit: number;
	status: string;
	plan: 'free' | 'pro';
	user_status: string;
};

type FollowRecord = {
	follow_type: 'topic' | 'category' | 'language' | 'product';
	follow_key: string;
};

type NotificationRow = {
	id: string;
	kind: string;
	title: string;
	summary: string;
	url: string | null;
	category: string | null;
	language: string | null;
	topic_key: string | null;
	plan_visibility: string;
	published_at: string | null;
	payload_json: string | null;
};

type UsageRow = {
	used: number | null;
};

type SubscribeBody = {
	email?: unknown;
	topics?: unknown;
	languages?: unknown;
	source?: unknown;
};

const ALLOWED_ORIGINS = ['https://lab.omnihex.xyz', 'http://localhost:4321'];
const API_KEY_PREFIX = 'ohx_live_';
const DEFAULT_DAILY_LIMIT = 1000;

const TOPICS = [
	{ key: 'ai-agents', label: 'AI Agents' },
	{ key: 'ai-news', label: 'AI News' },
	{ key: 'prompts', label: 'Prompt Systems' },
	{ key: 'life-os', label: 'Life OS' },
	{ key: 'productivity', label: 'Productivity' },
	{ key: 'automation', label: 'Automation' },
	{ key: 'api', label: 'APIs' },
];

const CATEGORIES = [
	{ key: 'briefs', label: 'Briefs' },
	{ key: 'prompts', label: 'Prompts' },
	{ key: 'guides', label: 'Guides' },
	{ key: 'life', label: 'Life OS' },
	{ key: 'ai', label: 'AI' },
	{ key: 'tools', label: 'Tools' },
];

const LANGUAGES = [
	{ key: 'en', label: 'English' },
	{ key: 'zh', label: 'Chinese' },
	{ key: 'es', label: 'Spanish' },
	{ key: 'pt', label: 'Portuguese' },
	{ key: 'id', label: 'Indonesian' },
];

const FREE_LIMITS = {
	dailyApiRequests: DEFAULT_DAILY_LIMIT,
	maxTopics: 6,
	maxLanguages: 3,
};

const topicKeys = new Set(TOPICS.map((topic) => topic.key));
const languageKeys = new Set(LANGUAGES.map((language) => language.key));
const categoryKeys = new Set(CATEGORIES.map((category) => category.key));

const app = new Hono<AppEnv>();

app.use(
	'*',
	cors({
		origin: ALLOWED_ORIGINS,
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86400,
	})
);

app.get('/health', async (c) => {
	const row = await c.env.DB.prepare('SELECT 1 AS healthy').first<{ healthy: number }>();

	return c.json({
		ok: true,
		service: 'omnihex-d1-data-api',
		database: row?.healthy === 1 ? 'ok' : 'unknown',
	});
});

app.get('/public/options', (c) => {
	return c.json({
		ok: true,
		topics: TOPICS,
		categories: CATEGORIES,
		languages: LANGUAGES,
		plans: {
			free: {
				dailyLimit: FREE_LIMITS.dailyApiRequests,
				maxTopics: FREE_LIMITS.maxTopics,
				maxLanguages: FREE_LIMITS.maxLanguages,
			},
			pro: {
				reserved: true,
				message: 'Pro is reserved for higher limits and ad-free experiences. Payments are not enabled in this MVP.',
			},
		},
	});
});

app.post('/subscribe', async (c) => {
	const body = await readJsonBody(c.req.raw);
	const email = normalizeEmail(body?.email);

	if (!email) {
		return c.json({ ok: false, error: { code: 'invalid_email', message: 'A valid email is required.' } }, 400);
	}

	const topics = sanitizeKeys(body?.topics, topicKeys, FREE_LIMITS.maxTopics);
	const languages = sanitizeKeys(body?.languages, languageKeys, FREE_LIMITS.maxLanguages);
	const source = sanitizeSource(body?.source);
	const now = new Date().toISOString();
	const unsubscribeToken = randomSecret(24);
	const unsubscribeTokenHash = await sha256Hex(unsubscribeToken);
	const apiKey = `${API_KEY_PREFIX}${randomSecret(32)}`;
	const apiKeyHash = await sha256Hex(apiKey);
	const keyPrefix = apiKey.slice(0, API_KEY_PREFIX.length + 8);

	const user = await upsertUser(c.env.DB, email, now);

	await upsertSubscriber(c.env.DB, {
		userId: user.id,
		email,
		source,
		unsubscribeTokenHash,
		now,
	});

	await replaceFollows(c.env.DB, user.id, topics, languages, now);

	await c.env.DB.prepare(
		`
		INSERT INTO api_keys (
			id, user_id, key_hash, key_prefix, name, daily_limit, status, created_at
		)
		VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
		`
	)
		.bind(crypto.randomUUID(), user.id, apiKeyHash, keyPrefix, 'Default feed key', DEFAULT_DAILY_LIMIT, now)
		.run();

	const unsubscribeUrl = new URL('/unsubscribe', c.req.url);
	unsubscribeUrl.searchParams.set('email', email);
	unsubscribeUrl.searchParams.set('token', unsubscribeToken);

	return c.json(
		{
			ok: true,
			user: {
				id: user.id,
				email: user.email,
				plan: user.plan,
				status: user.status,
			},
			subscription: {
				status: 'subscribed',
				topics,
				languages,
				unsubscribeUrl: unsubscribeUrl.toString(),
			},
			apiKey: {
				value: apiKey,
				keyPrefix,
				dailyLimit: DEFAULT_DAILY_LIMIT,
				status: 'active',
				shownOnce: true,
			},
		},
		201
	);
});

app.get('/feed', async (c) => {
	const authorization = c.req.header('Authorization');
	const apiKey = getBearerToken(authorization);
	const query = c.req.query();
	const limit = parseLimit(query.limit);
	const filters = sanitizeFeedFilters(query);

	if (authorization && !apiKey) {
		return c.json({ ok: false, error: { code: 'invalid_authorization', message: 'Use Authorization: Bearer <apiKey>.' } }, 401);
	}

	if (!apiKey) {
		const feed = await listNotifications(c.env.DB, {
			limit,
			plan: 'free',
			filters,
		});

		return c.json({
			ok: true,
			authenticated: false,
			feed,
		});
	}

	const record = await findApiKey(c.env.DB, apiKey);

	if (!record) {
		return c.json({ ok: false, error: { code: 'invalid_api_key', message: 'API Key is invalid.' } }, 401);
	}

	if (record.status !== 'active' || record.user_status !== 'active') {
		await recordUsage(c.env.DB, record.id, 'feed', false);
		return c.json({ ok: false, error: { code: 'api_key_inactive', message: 'API Key is not active.' } }, 403);
	}

	const usedToday = await getUsedToday(c.env.DB, record.id);

	if (usedToday >= record.daily_limit) {
		await recordUsage(c.env.DB, record.id, 'feed', false);
		return c.json({ ok: false, error: { code: 'daily_limit_exceeded', message: 'Daily API limit exceeded.' } }, 429);
	}

	const follows = await listFollows(c.env.DB, record.user_id);
	const feed = await listNotifications(c.env.DB, {
		limit,
		plan: record.plan,
		filters,
		follows,
	});

	await recordUsage(c.env.DB, record.id, 'feed', true);
	await touchApiKey(c.env.DB, record.id);

	const updatedUsedToday = usedToday + 1;

	return c.json({
		ok: true,
		authenticated: true,
		feed,
		usage: {
			dailyLimit: record.daily_limit,
			usedToday: updatedUsedToday,
			remainingToday: Math.max(record.daily_limit - updatedUsedToday, 0),
		},
	});
});

app.get('/key/status', async (c) => {
	const apiKey = getBearerToken(c.req.header('Authorization'));

	if (!apiKey) {
		return c.json({ ok: false, error: { code: 'missing_api_key', message: 'Authorization bearer token is required.' } }, 401);
	}

	const record = await findApiKey(c.env.DB, apiKey);

	if (!record) {
		return c.json({ ok: false, error: { code: 'invalid_api_key', message: 'API Key is invalid.' } }, 401);
	}

	const usedToday = await getUsedToday(c.env.DB, record.id);

	return c.json({
		ok: true,
		keyPrefix: record.key_prefix,
		status: record.status,
		plan: record.plan,
		dailyLimit: record.daily_limit,
		usedToday,
		remainingToday: Math.max(record.daily_limit - usedToday, 0),
	});
});

app.get('/unsubscribe', async (c) => {
	const email = normalizeEmail(c.req.query('email'));
	const token = String(c.req.query('token') ?? '').trim();

	if (!email || !token) {
		return c.json({ ok: false, error: { code: 'invalid_unsubscribe_request', message: 'Email and token are required.' } }, 400);
	}

	const tokenHash = await sha256Hex(token);
	const subscriber = await c.env.DB.prepare(
		`
		SELECT id, unsubscribe_token_hash
		FROM subscribers
		WHERE email = ?
		LIMIT 1
		`
	)
		.bind(email)
		.first<{ id: string; unsubscribe_token_hash: string }>();

	if (!subscriber || subscriber.unsubscribe_token_hash !== tokenHash) {
		return c.json({ ok: false, error: { code: 'invalid_unsubscribe_token', message: 'Unsubscribe token is invalid.' } }, 400);
	}

	const now = new Date().toISOString();

	await c.env.DB.prepare(
		`
		UPDATE subscribers
		SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ?
		WHERE id = ?
		`
	)
		.bind(now, now, subscriber.id)
		.run();

	return c.json({
		ok: true,
		email,
		status: 'unsubscribed',
	});
});

app.notFound((c) => {
	return c.json({ ok: false, error: { code: 'not_found', message: 'Route not found.' } }, 404);
});

app.onError((error, c) => {
	console.error(error);

	return c.json({ ok: false, error: { code: 'internal_error', message: 'Internal server error.' } }, 500);
});

async function readJsonBody(request: Request): Promise<SubscribeBody | null> {
	try {
		const value = await request.json();

		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return null;
		}

		return value as SubscribeBody;
	} catch {
		return null;
	}
}

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const email = value.trim().toLowerCase();

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return null;
	}

	return email;
}

function sanitizeKeys(value: unknown, allowedKeys: Set<string>, limit: number): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const keys: string[] = [];
	const seen = new Set<string>();

	for (const item of value) {
		const key = String(item ?? '').trim().toLowerCase();

		if (!allowedKeys.has(key) || seen.has(key)) {
			continue;
		}

		seen.add(key);
		keys.push(key);

		if (keys.length >= limit) {
			break;
		}
	}

	return keys;
}

function sanitizeSource(value: unknown): string {
	if (typeof value !== 'string') {
		return 'api';
	}

	const source = value.trim().slice(0, 64).replace(/[^a-zA-Z0-9_.-]/g, '-');

	return source || 'api';
}

function sanitizeFeedFilters(query: Record<string, string>): { category?: string; language?: string; topic?: string } {
	const category = sanitizeOptionalKey(query.category, categoryKeys);
	const language = sanitizeOptionalKey(query.language, languageKeys);
	const topic = sanitizeOptionalKey(query.topic, topicKeys);

	return {
		...(category ? { category } : {}),
		...(language ? { language } : {}),
		...(topic ? { topic } : {}),
	};
}

function sanitizeOptionalKey(value: unknown, allowedKeys: Set<string>): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const key = value.trim().toLowerCase();

	return allowedKeys.has(key) ? key : undefined;
}

function parseLimit(value: string | undefined): number {
	const parsed = Number.parseInt(String(value ?? ''), 10);

	if (!Number.isFinite(parsed)) {
		return 20;
	}

	return Math.min(Math.max(parsed, 1), 50);
}

function getBearerToken(authorization: string | undefined): string | null {
	if (!authorization) {
		return null;
	}

	const match = authorization.match(/^Bearer\s+(.+)$/i);

	return match?.[1]?.trim() || null;
}

function randomSecret(byteLength: number): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);

	return toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', bytes);

	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function upsertUser(db: D1Database, email: string, now: string): Promise<UserRecord> {
	await db.prepare(
		`
		INSERT INTO users (id, email, plan, status, created_at, updated_at)
		VALUES (?, ?, 'free', 'active', ?, ?)
		ON CONFLICT(email) DO UPDATE SET
			status = 'active',
			updated_at = excluded.updated_at
		`
	)
		.bind(crypto.randomUUID(), email, now, now)
		.run();

	const user = await db.prepare('SELECT id, email, plan, status FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRecord>();

	if (!user) {
		throw new Error('Failed to upsert user.');
	}

	return user;
}

async function upsertSubscriber(
	db: D1Database,
	params: {
		userId: string;
		email: string;
		source: string;
		unsubscribeTokenHash: string;
		now: string;
	}
): Promise<void> {
	await db.prepare(
		`
		INSERT INTO subscribers (
			id, user_id, email, status, source, unsubscribe_token_hash, consent_at, created_at, updated_at
		)
		VALUES (?, ?, ?, 'subscribed', ?, ?, ?, ?, ?)
		ON CONFLICT(email) DO UPDATE SET
			user_id = excluded.user_id,
			status = 'subscribed',
			source = excluded.source,
			unsubscribe_token_hash = excluded.unsubscribe_token_hash,
			consent_at = excluded.consent_at,
			unsubscribed_at = NULL,
			updated_at = excluded.updated_at
		`
	)
		.bind(
			crypto.randomUUID(),
			params.userId,
			params.email,
			params.source,
			params.unsubscribeTokenHash,
			params.now,
			params.now,
			params.now
		)
		.run();
}

async function replaceFollows(db: D1Database, userId: string, topics: string[], languages: string[], now: string): Promise<void> {
	await db.prepare("DELETE FROM follows WHERE user_id = ? AND follow_type IN ('topic', 'language')").bind(userId).run();

	for (const topic of topics) {
		await db.prepare(
			`
			INSERT OR IGNORE INTO follows (id, user_id, follow_type, follow_key, created_at)
			VALUES (?, ?, 'topic', ?, ?)
			`
		)
			.bind(crypto.randomUUID(), userId, topic, now)
			.run();
	}

	for (const language of languages) {
		await db.prepare(
			`
			INSERT OR IGNORE INTO follows (id, user_id, follow_type, follow_key, created_at)
			VALUES (?, ?, 'language', ?, ?)
			`
		)
			.bind(crypto.randomUUID(), userId, language, now)
			.run();
	}
}

async function findApiKey(db: D1Database, apiKey: string): Promise<ApiKeyRecord | null> {
	const keyHash = await sha256Hex(apiKey);

	return db.prepare(
		`
		SELECT
			api_keys.id,
			api_keys.user_id,
			api_keys.key_prefix,
			api_keys.daily_limit,
			api_keys.status,
			users.plan,
			users.status AS user_status
		FROM api_keys
		INNER JOIN users ON users.id = api_keys.user_id
		WHERE api_keys.key_hash = ?
		LIMIT 1
		`
	)
		.bind(keyHash)
		.first<ApiKeyRecord>();
}

async function listFollows(db: D1Database, userId: string): Promise<FollowRecord[]> {
	const result = await db.prepare('SELECT follow_type, follow_key FROM follows WHERE user_id = ?').bind(userId).all<FollowRecord>();

	return result.results ?? [];
}

async function listNotifications(
	db: D1Database,
	params: {
		limit: number;
		plan: 'free' | 'pro';
		filters?: { category?: string; language?: string; topic?: string };
		follows?: FollowRecord[];
	}
): Promise<Array<Record<string, unknown>>> {
	const now = new Date().toISOString();
	const where = [
		"status = 'published'",
		'published_at IS NOT NULL',
		'published_at <= ?',
		'(expires_at IS NULL OR expires_at > ?)',
	];
	const bindings: Array<string | number> = [now, now];

	if (params.plan === 'pro') {
		where.push("plan_visibility IN ('free', 'pro')");
	} else {
		where.push("plan_visibility = 'free'");
	}

	if (params.filters?.category) {
		where.push('category = ?');
		bindings.push(params.filters.category);
	}

	if (params.filters?.language) {
		where.push('language = ?');
		bindings.push(params.filters.language);
	}

	if (params.filters?.topic) {
		where.push('topic_key = ?');
		bindings.push(params.filters.topic);
	}

	const followCondition = buildFollowCondition(params.follows ?? [], bindings);

	if (followCondition) {
		where.push(followCondition);
	}

	const result = await db.prepare(
		`
		SELECT
			id,
			kind,
			title,
			summary,
			url,
			category,
			language,
			topic_key,
			plan_visibility,
			published_at,
			payload_json
		FROM notifications
		WHERE ${where.join(' AND ')}
		ORDER BY published_at DESC, created_at DESC
		LIMIT ${params.limit}
		`
	)
		.bind(...bindings)
		.all<NotificationRow>();

	return (result.results ?? []).map((row) => ({
		id: row.id,
		kind: row.kind,
		title: row.title,
		summary: row.summary,
		url: row.url,
		category: row.category,
		language: row.language,
		topicKey: row.topic_key,
		planVisibility: row.plan_visibility,
		publishedAt: row.published_at,
		payload: parsePayload(row.payload_json),
	}));
}

function buildFollowCondition(follows: FollowRecord[], bindings: Array<string | number>): string | null {
	const topicFollows = follows.filter((follow) => follow.follow_type === 'topic').map((follow) => follow.follow_key);
	const languageFollows = follows.filter((follow) => follow.follow_type === 'language').map((follow) => follow.follow_key);
	const categoryFollows = follows.filter((follow) => follow.follow_type === 'category').map((follow) => follow.follow_key);
	const clauses: string[] = [];

	appendInClause(clauses, bindings, 'topic_key', topicFollows);
	appendInClause(clauses, bindings, 'language', languageFollows);
	appendInClause(clauses, bindings, 'category', categoryFollows);

	return clauses.length > 0 ? `(${clauses.join(' OR ')})` : null;
}

function appendInClause(clauses: string[], bindings: Array<string | number>, column: string, values: string[]): void {
	const uniqueValues = [...new Set(values)];

	if (uniqueValues.length === 0) {
		return;
	}

	clauses.push(`${column} IN (${uniqueValues.map(() => '?').join(', ')})`);
	bindings.push(...uniqueValues);
}

function parsePayload(value: string | null): unknown {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

async function getUsedToday(db: D1Database, apiKeyId: string): Promise<number> {
	const date = todayUtc();
	const row = await db.prepare(
		`
		SELECT COALESCE(SUM(request_count), 0) AS used
		FROM api_usage_daily
		WHERE api_key_id = ? AND usage_date = ?
		`
	)
		.bind(apiKeyId, date)
		.first<UsageRow>();

	return Number(row?.used ?? 0);
}

async function recordUsage(db: D1Database, apiKeyId: string, endpointGroup: string, success: boolean): Promise<void> {
	const now = new Date().toISOString();
	const date = todayUtc();

	await db.prepare(
		`
		INSERT INTO api_usage_daily (
			id, api_key_id, usage_date, endpoint_group, request_count, success_count, error_count, updated_at
		)
		VALUES (?, ?, ?, ?, 1, ?, ?, ?)
		ON CONFLICT(api_key_id, usage_date, endpoint_group) DO UPDATE SET
			request_count = request_count + 1,
			success_count = success_count + excluded.success_count,
			error_count = error_count + excluded.error_count,
			updated_at = excluded.updated_at
		`
	)
		.bind(crypto.randomUUID(), apiKeyId, date, endpointGroup, success ? 1 : 0, success ? 0 : 1, now)
		.run();
}

async function touchApiKey(db: D1Database, apiKeyId: string): Promise<void> {
	await db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(new Date().toISOString(), apiKeyId).run();
}

function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

export default app;

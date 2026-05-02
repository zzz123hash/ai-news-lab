import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.resolve(__dirname, '../data/sample-digest-items.json');

const {
	GHOST_ADMIN_API_URL,
	GHOST_ADMIN_API_KEY,
	GHOST_API_VERSION = 'v6.0',
	GHOST_DRY_RUN = 'false',
	DIGEST_INPUT = DEFAULT_INPUT,
	DIGEST_TITLE,
	DIGEST_EXCERPT = 'AI-assisted digest draft generated from curated sample source items. Requires human review before publishing.',
	DIGEST_TAGS = 'AI Briefs, AI Digest, #digest, #ai-assisted, #needs-review',
	DIGEST_AUTHOR_EMAIL,
	DIGEST_VISIBILITY = 'public',
} = process.env;

async function main() {
	const items = await readDigestItems(DIGEST_INPUT);
	const dedupedItems = dedupeItems(items).sort((a, b) => b.importance_score - a.importance_score);
	const post = buildGhostPost(dedupedItems);

	if (isDryRun()) {
		console.log(JSON.stringify({ ok: true, dryRun: true, post }, null, 2));
		return;
	}

	if (!GHOST_ADMIN_API_URL) {
		throw new Error('GHOST_ADMIN_API_URL is required unless GHOST_DRY_RUN=true');
	}

	if (!GHOST_ADMIN_API_KEY) {
		throw new Error('GHOST_ADMIN_API_KEY is required unless GHOST_DRY_RUN=true');
	}

	const result = await publishGhostDraft(post);

	console.log(JSON.stringify(result, null, 2));
}

async function readDigestItems(inputPath) {
	const absolutePath = path.resolve(inputPath);
	const text = await fs.readFile(absolutePath, 'utf8');
	const items = JSON.parse(text);

	if (!Array.isArray(items)) {
		throw new Error('Digest input must be a JSON array');
	}

	return items.map(validateItem);
}

function validateItem(item, index) {
	if (!item || typeof item !== 'object' || Array.isArray(item)) {
		throw new Error(`Digest item ${index + 1} must be an object`);
	}

	for (const field of ['title', 'url', 'author', 'source_language', 'raw_text', 'topic']) {
		if (typeof item[field] !== 'string' || item[field].trim().length === 0) {
			throw new Error(`Digest item ${index + 1} is missing ${field}`);
		}
	}

	if (!Array.isArray(item.target_languages) || item.target_languages.some((language) => typeof language !== 'string')) {
		throw new Error(`Digest item ${index + 1} target_languages must be an array of strings`);
	}

	if (typeof item.importance_score !== 'number' || item.importance_score < 0 || item.importance_score > 100) {
		throw new Error(`Digest item ${index + 1} importance_score must be a number from 0 to 100`);
	}

	return {
		title: item.title.trim(),
		url: normalizeUrl(item.url),
		author: item.author.trim(),
		source_language: item.source_language.trim(),
		target_languages: item.target_languages.map((language) => language.trim()).filter(Boolean),
		raw_text: item.raw_text.trim(),
		topic: item.topic.trim(),
		importance_score: item.importance_score,
	};
}

function dedupeItems(items) {
	const byUrl = new Map();

	for (const item of items) {
		const existing = byUrl.get(item.url);

		if (!existing || item.importance_score > existing.importance_score) {
			byUrl.set(item.url, item);
		}
	}

	return [...byUrl.values()];
}

function buildGhostPost(items) {
	const date = new Date().toISOString().slice(0, 10);
	const title = DIGEST_TITLE || `AI Digest Draft: ${date}`;
	const html = buildDigestHtml(items, date);

	const post = {
		title,
		html,
		status: 'draft',
		visibility: DIGEST_VISIBILITY,
		custom_excerpt: DIGEST_EXCERPT,
		tags: parseCsv(DIGEST_TAGS),
		meta_title: title,
		meta_description: DIGEST_EXCERPT,
	};

	if (DIGEST_AUTHOR_EMAIL) {
		post.authors = [DIGEST_AUTHOR_EMAIL.trim()];
	}

	return post;
}

function buildDigestHtml(items, date) {
	const averageScore = Math.round(items.reduce((sum, item) => sum + item.importance_score, 0) / items.length);
	const topics = [...new Set(items.map((item) => item.topic))];
	const languages = [...new Set(items.flatMap((item) => item.target_languages))];
	const sections = [
		`<p><strong>Editorial status:</strong> AI pipeline sample draft. No real AI model, crawler, or payment flow was used. Verify every item before publishing.</p>`,
		`<p><strong>Date:</strong> ${escapeHtml(date)}. <strong>Items:</strong> ${items.length}. <strong>Average importance:</strong> ${averageScore}.</p>`,
		`<p><strong>Topics:</strong> ${escapeHtml(topics.join(', '))}. <strong>Target languages:</strong> ${escapeHtml(languages.join(', '))}.</p>`,
		'<hr>',
	];

	items.forEach((item, index) => {
		sections.push(`<h2>${index + 1}. ${escapeHtml(item.title)}</h2>`);
		sections.push(`<p><strong>Topic:</strong> ${escapeHtml(item.topic)}. <strong>Importance:</strong> ${item.importance_score}/100.</p>`);
		sections.push(`<p><strong>Source:</strong> <a href="${escapeAttribute(item.url)}">${escapeHtml(item.author)}</a>. <strong>Source language:</strong> ${escapeHtml(item.source_language)}. <strong>Targets:</strong> ${escapeHtml(item.target_languages.join(', '))}.</p>`);
		sections.push(`<p>${escapeHtml(createExtractiveSummary(item.raw_text))}</p>`);
		sections.push(`<blockquote>${escapeHtml(item.raw_text)}</blockquote>`);
	});

	sections.push('<h2>Review checklist</h2>');
	sections.push(
		'<ul><li>Open every source URL and verify claims.</li><li>Remove duplicate or low-signal items.</li><li>Add original editorial context.</li><li>Decide final language versions.</li><li>Publish manually from Ghost Admin only after review.</li></ul>',
	);

	return sections.join('\n');
}

async function publishGhostDraft(post) {
	const adminApiUrl = normalizeAdminApiUrl(GHOST_ADMIN_API_URL);
	const endpoint = new URL('posts/?source=html', adminApiUrl);
	const token = createGhostAdminToken(GHOST_ADMIN_API_KEY);
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Ghost ${token}`,
			'Accept-Version': GHOST_API_VERSION,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ posts: [post] }),
	});
	const responseText = await response.text();
	const responseBody = parseJson(responseText);

	if (!response.ok) {
		const detail = responseBody?.errors?.[0]?.message || responseBody?.message || responseText || `HTTP ${response.status}`;
		throw new Error(`Ghost digest draft creation failed: ${detail}`);
	}

	const createdPost = responseBody?.posts?.[0];

	return {
		ok: true,
		id: createdPost?.id,
		title: createdPost?.title,
		slug: createdPost?.slug,
		status: createdPost?.status,
		visibility: createdPost?.visibility,
		url: createdPost?.url,
	};
}

function normalizeAdminApiUrl(rawUrl) {
	const url = new URL(rawUrl);
	let pathname = url.pathname.replace(/\/+$/, '');

	if (!pathname.endsWith('/ghost/api/admin')) {
		pathname = `${pathname}/ghost/api/admin`.replace(/\/{2,}/g, '/');
	}

	url.pathname = `${pathname}/`;
	url.search = '';
	url.hash = '';

	return url;
}

function createGhostAdminToken(adminApiKey) {
	const [id, secret] = adminApiKey.split(':');

	if (!id || !secret || !/^[a-f0-9]+$/i.test(secret)) {
		throw new Error('GHOST_ADMIN_API_KEY must look like <id>:<hex-secret>');
	}

	const now = Math.floor(Date.now() / 1000);
	const header = {
		alg: 'HS256',
		typ: 'JWT',
		kid: id,
	};
	const payload = {
		iat: now,
		exp: now + 5 * 60,
		aud: '/admin/',
	};
	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	const unsignedToken = `${encodedHeader}.${encodedPayload}`;
	const signature = crypto
		.createHmac('sha256', Buffer.from(secret, 'hex'))
		.update(unsignedToken)
		.digest('base64url');

	return `${unsignedToken}.${signature}`;
}

function createExtractiveSummary(text) {
	const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();

	if (firstSentence && firstSentence.length >= 80) {
		return firstSentence;
	}

	return text.length > 240 ? `${text.slice(0, 237).trim()}...` : text;
}

function normalizeUrl(value) {
	const url = new URL(value);

	for (const key of [...url.searchParams.keys()]) {
		if (key.toLowerCase().startsWith('utm_') || ['ref', 'fbclid', 'gclid'].includes(key.toLowerCase())) {
			url.searchParams.delete(key);
		}
	}

	url.hash = '';

	return url.toString();
}

function parseCsv(value) {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseJson(value) {
	try {
		return value ? JSON.parse(value) : null;
	} catch {
		return null;
	}
}

function base64UrlEncode(value) {
	return Buffer.from(value).toString('base64url');
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
	return escapeHtml(value);
}

function isDryRun() {
	return GHOST_DRY_RUN === 'true' || GHOST_DRY_RUN === '1';
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

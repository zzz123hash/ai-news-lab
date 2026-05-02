import { VALID_CATEGORIES } from '../config.js';

const VALID_CATEGORY_SET = new Set(VALID_CATEGORIES);

export class ValidationError extends Error {
	constructor(message, status = 400) {
		super(message);
		this.name = 'ValidationError';
		this.status = status;
	}
}

export function normalizePostPayload(body) {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new ValidationError('JSON body must be an object');
	}

	for (const field of ['title', 'description', 'category', 'language', 'content']) {
		if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
			throw new ValidationError(`${field} is required`);
		}
	}

	const category = body.category.trim();

	if (!VALID_CATEGORY_SET.has(category)) {
		throw new ValidationError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
	}

	return {
		title: body.title.trim(),
		description: body.description.trim(),
		category,
		language: body.language.trim(),
		tags: normalizeStringList(body.tags),
		source: optionalString(body.source),
		sourceUrl: optionalUrl(body.sourceUrl),
		draft: body.draft === undefined ? true : normalizeBoolean(body.draft, 'draft'),
		content: body.content.trim(),
	};
}

export function createPostFile(post, date = new Date().toISOString().slice(0, 10)) {
	const slug = createSlug(post.title);
	const languageSlug = createLanguageSlug(post.language);
	const filename = `${date}-${slug}-${languageSlug}.md`;
	const path = `src/content/posts/${filename}`;

	return {
		date,
		slug,
		filename,
		path,
		markdown: createMarkdown(post, date),
	};
}

export function createMarkdown(post, date) {
	const frontmatter = [
		`title: ${JSON.stringify(post.title)}`,
		`description: ${JSON.stringify(post.description)}`,
		`pubDate: ${date}`,
		`category: ${JSON.stringify(post.category)}`,
		`tags: ${JSON.stringify(post.tags)}`,
		`language: ${JSON.stringify(post.language)}`,
	];

	if (post.source) {
		frontmatter.push(`source: ${JSON.stringify(post.source)}`);
	}

	if (post.sourceUrl) {
		frontmatter.push(`sourceUrl: ${JSON.stringify(post.sourceUrl)}`);
	}

	frontmatter.push(`draft: ${post.draft}`);

	return `---\n${frontmatter.join('\n')}\n---\n\n${post.content}\n`;
}

export function normalizeStringList(value) {
	if (value === undefined || value === null || value === '') {
		return [];
	}

	if (typeof value === 'string') {
		return value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw new ValidationError('tags must be an array of strings or a comma-separated string');
	}

	return value.map((item) => item.trim()).filter(Boolean);
}

function optionalString(value) {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value !== 'string') {
		throw new ValidationError('optional text fields must be strings');
	}

	const trimmed = value.trim();

	return trimmed || undefined;
}

function optionalUrl(value) {
	const trimmed = optionalString(value);

	if (!trimmed) {
		return undefined;
	}

	try {
		new URL(trimmed);
	} catch {
		throw new ValidationError('sourceUrl must be a valid URL');
	}

	return trimmed;
}

function normalizeBoolean(value, field) {
	if (typeof value === 'boolean') {
		return value;
	}

	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	throw new ValidationError(`${field} must be a boolean`);
}

function createSlug(title) {
	const slug = title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || `post-${Date.now().toString(36)}`;
}

function createLanguageSlug(language) {
	const slug = language
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'und';
}

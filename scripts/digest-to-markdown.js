import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT = path.resolve(__dirname, '../data/sample-digest-items.json');
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../src/content/posts');

const {
	DIGEST_INPUT,
	DIGEST_OUTPUT_DIR,
	DIGEST_TITLE,
	DIGEST_DESCRIPTION = 'A draft AI briefing generated from curated source items for human editorial review.',
	DIGEST_CATEGORY = 'briefs',
	DIGEST_LANGUAGE = 'en',
	DIGEST_ACCESS = 'free',
	DIGEST_TAGS = 'AI Digest, OpenClaw, Draft',
	DIGEST_SOURCE = 'OpenClaw NAS Pipeline',
	DIGEST_DRY_RUN = 'false',
} = process.env;

async function main() {
	const inputPath = path.resolve(process.argv[2] || DIGEST_INPUT || DEFAULT_INPUT);
	const outputDir = path.resolve(DIGEST_OUTPUT_DIR || DEFAULT_OUTPUT_DIR);
	const items = await readDigestItems(inputPath);
	const dedupedItems = dedupeItems(items).sort((a, b) => b.importance_score - a.importance_score);
	const date = new Date().toISOString().slice(0, 10);
	const title = DIGEST_TITLE || `AI Digest Draft: ${date}`;
	const slug = createSlug(title);
	const filename = await createAvailableFilename(outputDir, `${date}-${slug}-${createLanguageSlug(DIGEST_LANGUAGE)}.md`);
	const post = buildMarkdownPost({
		items: dedupedItems,
		date,
		title,
		description: DIGEST_DESCRIPTION,
		category: DIGEST_CATEGORY,
		language: DIGEST_LANGUAGE,
		access: DIGEST_ACCESS,
		tags: parseCsv(DIGEST_TAGS),
		source: DIGEST_SOURCE,
	});
	const outputPath = path.join(outputDir, filename);

	if (isDryRun()) {
		console.log(
			JSON.stringify(
				{
					ok: true,
					dryRun: true,
					inputPath,
					outputPath,
					markdown: post,
				},
				null,
				2,
			),
		);
		return;
	}

	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(outputPath, post, 'utf8');

	console.log(
		JSON.stringify(
			{
				ok: true,
				inputPath,
				outputPath,
				items: dedupedItems.length,
				draft: true,
			},
			null,
			2,
		),
	);
}

async function readDigestItems(inputPath) {
	const text = await fs.readFile(inputPath, 'utf8');
	const items = JSON.parse(text);

	if (!Array.isArray(items)) {
		throw new Error('Digest input must be a JSON array');
	}

	if (items.length === 0) {
		throw new Error('Digest input must contain at least one item');
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

function buildMarkdownPost({ items, date, title, description, category, language, access, tags, source }) {
	const averageScore = Math.round(items.reduce((sum, item) => sum + item.importance_score, 0) / items.length);
	const topics = [...new Set(items.map((item) => item.topic))];
	const targetLanguages = [...new Set(items.flatMap((item) => item.target_languages))];
	const frontmatter = [
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(description)}`,
		`pubDate: ${date}`,
		`category: ${JSON.stringify(category)}`,
		`tags: ${JSON.stringify(tags)}`,
		`language: ${JSON.stringify(language)}`,
		`access: ${JSON.stringify(access)}`,
		`source: ${JSON.stringify(source)}`,
		'draft: true',
	];
	const body = [
		'## Editorial status',
		'',
		'This is an OpenClaw NAS pipeline draft. No real AI key, payment system, database, or automatic publishing flow was used. Verify every source before publishing.',
		'',
		'## Digest overview',
		'',
		`- Items: ${items.length}`,
		`- Average importance: ${averageScore}`,
		`- Topics: ${topics.join(', ')}`,
		`- Target languages: ${targetLanguages.join(', ')}`,
		'',
		'## Source items',
		'',
		...items.flatMap((item, index) => [
			`### ${index + 1}. ${item.title}`,
			'',
			`- Topic: ${item.topic}`,
			`- Importance: ${item.importance_score}/100`,
			`- Source: [${item.author}](${item.url})`,
			`- Source language: ${item.source_language}`,
			`- Target languages: ${item.target_languages.join(', ')}`,
			'',
			createExtractiveSummary(item.raw_text),
			'',
			'> ' + item.raw_text.replace(/\n+/g, ' '),
			'',
		]),
		'## Review checklist',
		'',
		'- Open every source URL.',
		'- Verify claims and publication context.',
		'- Remove weak or duplicate items.',
		'- Add original editorial analysis.',
		'- Keep `draft: true` until a human editor approves publication.',
		'',
	];

	return `---\n${frontmatter.join('\n')}\n---\n\n${body.join('\n')}`;
}

async function createAvailableFilename(outputDir, filename) {
	const parsed = path.parse(filename);
	let candidate = filename;
	let counter = 2;

	while (await fileExists(path.join(outputDir, candidate))) {
		candidate = `${parsed.name}-${counter}${parsed.ext}`;
		counter += 1;
	}

	return candidate;
}

async function fileExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
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

function createSlug(value) {
	const slug = value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || `digest-${Date.now().toString(36)}`;
}

function createLanguageSlug(language) {
	const slug = language
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'und';
}

function parseCsv(value) {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function isDryRun() {
	return DIGEST_DRY_RUN === 'true' || DIGEST_DRY_RUN === '1';
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

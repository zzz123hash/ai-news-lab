const VALID_CATEGORIES = new Set([
	'ai',
	'news',
	'tutorials',
	'prompts',
	'tools',
	'briefs',
	'life',
	'guides',
	'products',
	'books',
]);

export async function onRequestPost({ request, env }) {
	try {
		const authError = validateAuth(request, env);

		if (authError) {
			return json(authError.body, authError.status);
		}

		const body = await readJson(request);
		const validation = validatePostBody(body);

		if (!validation.ok) {
			return json({ ok: false, error: validation.error }, 400);
		}

		const post = validation.post;
		const date = new Date().toISOString().slice(0, 10);
		const slug = createSlug(post.title);
		const languageSlug = createLanguageSlug(post.language);
		const filename = `${date}-${slug}-${languageSlug}.md`;
		const path = `src/content/posts/${filename}`;
		const markdown = createMarkdown(post, date);
		const githubResult = await writeGithubFile({
			env,
			path,
			content: markdown,
			filename,
		});

		if (!githubResult.ok) {
			return json({ ok: false, error: githubResult.error }, githubResult.status);
		}

		return json({
			ok: true,
			path,
			slug,
			draft: post.draft,
			translationKey: post.translationKey ?? null,
			canonicalLanguage: post.canonicalLanguage,
			originalLanguage: post.originalLanguage ?? null,
			bookTitle: post.bookTitle ?? null,
			bookAuthor: post.bookAuthor ?? null,
			bookCategory: post.bookCategory ?? null,
		});
	} catch (error) {
		return json({ ok: false, error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
	}
}

async function readJson(request) {
	try {
		return await request.json();
	} catch {
		throw new Error('Request body must be valid JSON');
	}
}

function validateAuth(request, env) {
	if (!env.CONTENT_API_TOKEN) {
		return {
			status: 500,
			body: { ok: false, error: 'CONTENT_API_TOKEN is not configured' },
		};
	}

	const authorization = request.headers.get('Authorization') ?? '';
	const expected = `Bearer ${env.CONTENT_API_TOKEN}`;

	if (authorization !== expected) {
		return {
			status: 401,
			body: { ok: false, error: 'Unauthorized' },
		};
	}

	return null;
}

function validatePostBody(body) {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, error: 'JSON body must be an object' };
	}

	for (const field of ['title', 'description', 'category', 'language', 'content']) {
		if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
			return { ok: false, error: `${field} is required` };
		}
	}

	const category = body.category.trim();

	if (!VALID_CATEGORIES.has(category)) {
		return { ok: false, error: `category must be one of: ${[...VALID_CATEGORIES].join(', ')}` };
	}

	const tags = body.tags === undefined ? [] : body.tags;

	if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
		return { ok: false, error: 'tags must be an array of strings' };
	}

	if (body.source !== undefined && typeof body.source !== 'string') {
		return { ok: false, error: 'source must be a string' };
	}

	if (body.sourceUrl !== undefined) {
		if (typeof body.sourceUrl !== 'string') {
			return { ok: false, error: 'sourceUrl must be a string URL' };
		}

		try {
			new URL(body.sourceUrl);
		} catch {
			return { ok: false, error: 'sourceUrl must be a valid URL' };
		}
	}

	if (body.draft !== undefined && typeof body.draft !== 'boolean') {
		return { ok: false, error: 'draft must be a boolean' };
	}

	for (const field of [
		'translationKey',
		'canonicalLanguage',
		'originalLanguage',
		'bookTitle',
		'bookAuthor',
		'bookCategory',
	]) {
		if (body[field] !== undefined && typeof body[field] !== 'string') {
			return { ok: false, error: `${field} must be a string` };
		}
	}

	return {
		ok: true,
		post: {
			title: body.title.trim(),
			description: body.description.trim(),
			category,
			language: body.language.trim(),
			tags: tags.map((tag) => tag.trim()).filter(Boolean),
			source: body.source?.trim(),
			sourceUrl: body.sourceUrl?.trim(),
			translationKey: body.translationKey?.trim(),
			canonicalLanguage: body.canonicalLanguage?.trim() || 'en',
			originalLanguage: body.originalLanguage?.trim(),
			bookTitle: body.bookTitle?.trim(),
			bookAuthor: body.bookAuthor?.trim(),
			bookCategory: body.bookCategory?.trim(),
			draft: body.draft ?? true,
			content: body.content.trim(),
		},
	};
}

function createMarkdown(post, date) {
	const frontmatter = [
		`title: ${JSON.stringify(post.title)}`,
		`description: ${JSON.stringify(post.description)}`,
		`pubDate: ${date}`,
		`category: ${JSON.stringify(post.category)}`,
		`language: ${JSON.stringify(post.language)}`,
		`tags: ${JSON.stringify(post.tags)}`,
	];

	if (post.source) {
		frontmatter.push(`source: ${JSON.stringify(post.source)}`);
	}

	if (post.sourceUrl) {
		frontmatter.push(`sourceUrl: ${JSON.stringify(post.sourceUrl)}`);
	}

	if (post.translationKey) {
		frontmatter.push(`translationKey: ${JSON.stringify(post.translationKey)}`);
	}

	if (post.canonicalLanguage) {
		frontmatter.push(`canonicalLanguage: ${JSON.stringify(post.canonicalLanguage)}`);
	}

	if (post.originalLanguage) {
		frontmatter.push(`originalLanguage: ${JSON.stringify(post.originalLanguage)}`);
	}

	if (post.bookTitle) {
		frontmatter.push(`bookTitle: ${JSON.stringify(post.bookTitle)}`);
	}

	if (post.bookAuthor) {
		frontmatter.push(`bookAuthor: ${JSON.stringify(post.bookAuthor)}`);
	}

	if (post.bookCategory) {
		frontmatter.push(`bookCategory: ${JSON.stringify(post.bookCategory)}`);
	}

	frontmatter.push(`draft: ${post.draft}`);

	return `---\n${frontmatter.join('\n')}\n---\n\n${post.content}\n`;
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

async function writeGithubFile({ env, path, content, filename }) {
	for (const key of ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']) {
		if (!env[key]) {
			return { ok: false, status: 500, error: `${key} is not configured` };
		}
	}

	const branch = env.GITHUB_BRANCH || 'main';
	const encodedPath = path.split('/').map(encodeURIComponent).join('/');
	const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodedPath}`;
	const headers = {
		accept: 'application/vnd.github+json',
		authorization: `Bearer ${env.GITHUB_TOKEN}`,
		'user-agent': 'OmniHex-Lab-Content-API',
		'x-github-api-version': '2022-11-28',
	};
	const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
	let sha;

	if (existing.ok) {
		const data = await existing.json();
		sha = data.sha;
	} else if (existing.status !== 404) {
		return {
			ok: false,
			status: 502,
			error: await readGithubError(existing, 'Failed to read existing GitHub file'),
		};
	}

	const response = await fetch(url, {
		method: 'PUT',
		headers: {
			...headers,
			'content-type': 'application/json; charset=utf-8',
		},
		body: JSON.stringify({
			message: `content: publish ${filename}`,
			content: toBase64(content),
			branch,
			...(sha ? { sha } : {}),
		}),
	});

	if (!response.ok) {
		return {
			ok: false,
			status: 502,
			error: await readGithubError(response, 'Failed to write GitHub file'),
		};
	}

	return { ok: true };
}

async function readGithubError(response, fallback) {
	try {
		const data = await response.json();

		return data.message ? `${fallback}: ${data.message}` : fallback;
	} catch {
		return fallback;
	}
}

function toBase64(value) {
	const bytes = new TextEncoder().encode(value);
	let binary = '';
	const chunkSize = 0x8000;

	for (let index = 0; index < bytes.length; index += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
	}

	return btoa(binary);
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

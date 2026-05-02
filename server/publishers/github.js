import { createPostFile } from '../content/post.js';

export async function publishViaGithub(post, config) {
	for (const key of ['token', 'owner', 'repo']) {
		if (!config.github[key]) {
			throw publishError(`GITHUB_${key.toUpperCase()} is not configured`, 500);
		}
	}

	const file = createPostFile(post);
	const branch = config.github.branch || 'main';
	const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
	const url = `https://api.github.com/repos/${config.github.owner}/${config.github.repo}/contents/${encodedPath}`;
	const headers = {
		accept: 'application/vnd.github+json',
		authorization: `Bearer ${config.github.token}`,
		'user-agent': 'OmniHex-Lab-Admin',
		'x-github-api-version': '2022-11-28',
	};
	const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
	let sha;

	if (existing.ok) {
		const data = await existing.json();
		sha = data.sha;
	} else if (existing.status !== 404) {
		throw publishError(await readGithubError(existing, 'Failed to read existing GitHub file'), 502);
	}

	const response = await fetch(url, {
		method: 'PUT',
		headers: {
			...headers,
			'content-type': 'application/json; charset=utf-8',
		},
		body: JSON.stringify({
			message: `content: publish ${file.filename}`,
			content: Buffer.from(file.markdown, 'utf8').toString('base64'),
			branch,
			...(sha ? { sha } : {}),
		}),
	});

	if (!response.ok) {
		throw publishError(await readGithubError(response, 'Failed to write GitHub file'), 502);
	}

	return {
		ok: true,
		target: 'github',
		path: file.path,
		slug: file.slug,
		draft: post.draft,
		branch,
	};
}

async function readGithubError(response, fallback) {
	try {
		const data = await response.json();

		return data.message ? `${fallback}: ${data.message}` : fallback;
	} catch {
		return fallback;
	}
}

function publishError(message, status) {
	const error = new Error(message);
	error.status = status;

	return error;
}

const REPRESENTATIVE_LANGUAGE_PRIORITY = ['en', 'zh'];

export async function onRequestGet({ request, env }) {
	try {
		const url = new URL(request.url);
		const includeTranslations = url.searchParams.get('includeTranslations') === 'true';
		const posts = (await getPostsData(request, env)).filter((post) => post.draft !== true);
		const visiblePosts = includeTranslations ? posts : getPostRepresentatives(posts);

		return json({
			ok: true,
			includeTranslations,
			count: visiblePosts.length,
			posts: visiblePosts,
		});
	} catch (error) {
		return json({ ok: false, error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
	}
}

async function getPostsData(request, env) {
	const assetUrl = new URL('/api/public/posts-data.json', request.url);

	if (!env.ASSETS) {
		throw new Error('Static assets binding is not available');
	}

	const response = await env.ASSETS.fetch(new Request(assetUrl));

	if (!response.ok) {
		throw new Error(`Failed to read posts data asset: ${response.status}`);
	}

	return response.json();
}

function getPostRepresentatives(posts) {
	const groups = new Map();

	for (const post of posts) {
		const groupKey = post.translationKey || post.slug;
		const group = groups.get(groupKey) ?? [];

		group.push(post);
		groups.set(groupKey, group);
	}

	return [...groups.values()]
		.map(selectRepresentativePost)
		.sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf());
}

function selectRepresentativePost(posts) {
	return [...posts].sort((a, b) => {
		const languagePriority = getRepresentativeLanguagePriority(a.language) - getRepresentativeLanguagePriority(b.language);

		if (languagePriority !== 0) {
			return languagePriority;
		}

		return new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf();
	})[0];
}

function getRepresentativeLanguagePriority(language) {
	const normalizedLanguage = normalizeLanguage(language);
	const priority = REPRESENTATIVE_LANGUAGE_PRIORITY.indexOf(normalizedLanguage);

	return priority === -1 ? REPRESENTATIVE_LANGUAGE_PRIORITY.length : priority;
}

function normalizeLanguage(language) {
	return language.toLowerCase().split(/[-_]/)[0];
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

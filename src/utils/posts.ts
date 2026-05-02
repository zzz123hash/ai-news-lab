import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'posts'>;
export const LANGUAGE_SWITCHER_ORDER = ['en', 'zh', 'id', 'pt', 'es', 'vi'] as const;
const REPRESENTATIVE_LANGUAGE_PRIORITY = ['en', 'zh'] as const;

export async function getPublishedPosts() {
	const posts = await getCollection('posts', ({ data }) => !data.draft);

	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getRepresentativePosts() {
	return getPostRepresentatives(await getPublishedPosts());
}

export async function getRepresentativePostsByCategories(categories: string[]) {
	const categorySet = new Set(categories);
	const posts = (await getPublishedPosts()).filter((post) => categorySet.has(post.data.category));

	return getPostRepresentatives(posts);
}

export function getPostRepresentatives(posts: BlogPost[]) {
	const groups = new Map<string, BlogPost[]>();

	for (const post of posts) {
		const groupKey = getPostGroupKey(post);
		const group = groups.get(groupKey) ?? [];

		group.push(post);
		groups.set(groupKey, group);
	}

	return [...groups.values()]
		.map(selectRepresentativePost)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function getPostGroupKey(post: BlogPost) {
	return post.data.translationKey || post.id;
}

export function sortPostsByLanguageOrder(posts: BlogPost[]) {
	return [...posts].sort((a, b) => {
		const languageOrder = getLanguageSortOrder(a.data.language) - getLanguageSortOrder(b.data.language);

		if (languageOrder !== 0) {
			return languageOrder;
		}

		return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	});
}

export function selectRepresentativePost(posts: BlogPost[]) {
	return [...posts].sort((a, b) => {
		const languagePriority = getRepresentativeLanguagePriority(a.data.language) - getRepresentativeLanguagePriority(b.data.language);

		if (languagePriority !== 0) {
			return languagePriority;
		}

		return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	})[0];
}

export function getPostUrl(post: BlogPost) {
	return `/${post.data.category}/${post.id}/`;
}

function getRepresentativeLanguagePriority(language: string) {
	const normalizedLanguage = normalizeLanguage(language);
	const priority = REPRESENTATIVE_LANGUAGE_PRIORITY.indexOf(normalizedLanguage as (typeof REPRESENTATIVE_LANGUAGE_PRIORITY)[number]);

	return priority === -1 ? REPRESENTATIVE_LANGUAGE_PRIORITY.length : priority;
}

function getLanguageSortOrder(language: string) {
	const normalizedLanguage = normalizeLanguage(language);
	const order = LANGUAGE_SWITCHER_ORDER.indexOf(normalizedLanguage as (typeof LANGUAGE_SWITCHER_ORDER)[number]);

	return order === -1 ? LANGUAGE_SWITCHER_ORDER.length : order;
}

function normalizeLanguage(language: string) {
	return language.toLowerCase().split(/[-_]/)[0];
}

import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'posts'>;
const REPRESENTATIVE_LANGUAGE_PRIORITY = ['en', 'zh'];

export async function getPublishedPosts() {
	const posts = await getCollection('posts', ({ data }) => !data.draft);

	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getRepresentativePosts() {
	return getPostRepresentatives(await getPublishedPosts());
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
	const priority = REPRESENTATIVE_LANGUAGE_PRIORITY.indexOf(normalizedLanguage);

	return priority === -1 ? REPRESENTATIVE_LANGUAGE_PRIORITY.length : priority;
}

function normalizeLanguage(language: string) {
	return language.toLowerCase().split(/[-_]/)[0];
}

import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'posts'>;
export const LANGUAGE_SWITCHER_ORDER = ['en', 'zh', 'id', 'pt', 'es', 'vi'] as const;
const REPRESENTATIVE_LANGUAGE_PRIORITY = ['en', 'zh'] as const;

export interface AlternateLanguageLink {
	hreflang: string;
	href: string;
}

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

export function getPostCanonicalUrl(post: BlogPost, site: string | URL) {
	return new URL(getPostUrl(post), site).toString();
}

export function getPostSeoTitle(post: BlogPost) {
	return post.data.seoTitle?.trim() || post.data.title;
}

export function getPostSeoDescription(post: BlogPost) {
	return post.data.seoDescription?.trim() || post.data.description;
}

export function getPostKeywords(post: BlogPost) {
	return post.data.keywords.length > 0 ? post.data.keywords : post.data.tags;
}

export function getPostAlternateLanguageLinks(post: BlogPost, translations: BlogPost[], site: string | URL) {
	const relatedPosts = translations.length > 0 ? translations : [post];
	const links = sortPostsByLanguageOrder(relatedPosts).map((translation) => ({
		hreflang: translation.data.language,
		href: getPostCanonicalUrl(translation, site),
	}));
	const defaultPost =
		relatedPosts.find(
			(translation) => normalizeLanguage(translation.data.language) === normalizeLanguage(post.data.canonicalLanguage),
		) ?? relatedPosts[0];

	if (defaultPost) {
		links.push({
			hreflang: 'x-default',
			href: getPostCanonicalUrl(defaultPost, site),
		});
	}

	return links;
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

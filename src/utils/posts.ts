import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'posts'>;

export async function getPublishedPosts() {
	const posts = await getCollection('posts', ({ data }) => !data.draft);

	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function getPostUrl(post: BlogPost) {
	return `/${post.data.category}/${post.id}/`;
}

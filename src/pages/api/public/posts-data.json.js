import { getPublishedPosts, getPostUrl } from '../../../utils/posts';

export async function GET() {
	const posts = await getPublishedPosts();

	return new Response(
		JSON.stringify(
			posts.map((post) => ({
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.pubDate.toISOString().slice(0, 10),
				category: post.data.category,
				language: post.data.language,
				tags: post.data.tags,
				source: post.data.source ?? null,
				sourceUrl: post.data.sourceUrl ?? null,
				draft: post.data.draft,
				translationKey: post.data.translationKey ?? null,
				canonicalLanguage: post.data.canonicalLanguage,
				originalLanguage: post.data.originalLanguage ?? null,
				bookTitle: post.data.bookTitle ?? null,
				bookAuthor: post.data.bookAuthor ?? null,
				bookCategory: post.data.bookCategory ?? null,
				slug: post.id,
				url: getPostUrl(post),
			})),
		),
		{
			headers: {
				'content-type': 'application/json; charset=utf-8',
			},
		},
	);
}


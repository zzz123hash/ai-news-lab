import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPostSeoDescription, getPostSeoTitle, getRepresentativePosts } from '../utils/posts';

export async function GET(context) {
	const posts = await getRepresentativePosts();

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: getPostSeoTitle(post),
			description: getPostSeoDescription(post),
			pubDate: post.data.pubDate,
			categories: [post.data.category, ...post.data.tags],
			link: `/${post.data.category}/${post.id}/`,
		})),
	});
}

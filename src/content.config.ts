import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		category: z.enum([
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
		]),
		tags: z.array(z.string()).default([]),
		language: z.string().default('zh-CN'),
		source: z.string().optional(),
		sourceUrl: z.string().url().optional(),
		bookTitle: z.string().optional(),
		bookAuthor: z.string().optional(),
		bookCategory: z.string().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { posts };

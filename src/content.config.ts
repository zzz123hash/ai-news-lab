import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string().trim().min(1),
		description: z.string().trim().min(1),
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
		seoTitle: z.string().trim().min(1).optional(),
		seoDescription: z.string().trim().min(1).optional(),
		targetQuery: z.string().trim().min(1).optional(),
		keywords: z.array(z.string().trim().min(1)).default([]),
		searchIntent: z.string().trim().min(1).optional(),
		language: z.string().default('zh-CN'),
		source: z.string().optional(),
		sourceUrl: z.string().url().optional(),
		translationKey: z.string().optional(),
		canonicalLanguage: z.string().default('en'),
		originalLanguage: z.string().optional(),
		bookTitle: z.string().optional(),
		bookAuthor: z.string().optional(),
		bookCategory: z.string().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { posts };

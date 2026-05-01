import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		category: z.enum(['ai', 'news', 'tutorials', 'prompts', 'tools', 'briefs', 'rss']),
		tags: z.array(z.string()).default([]),
		language: z.string().default('zh-CN'),
		source: z.string().optional(),
		sourceUrl: z.string().url().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog };

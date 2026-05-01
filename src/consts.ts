export const SITE_TITLE = 'OmniHex Lab';
export const SITE_DESCRIPTION =
	'面向 AI 新闻、教程、提示词、工具与小语种科技快报的低成本内容站。';
export const SITE_URL = 'https://lab.omnihex.xyz';

export const CATEGORIES = [
	{
		slug: 'ai',
		name: 'AI',
		description: 'AI 概念、产品趋势、模型能力与关键术语解释。',
	},
	{
		slug: 'news',
		name: 'News',
		description: 'AI 新闻解释、行业动态和重要事件背景梳理。',
	},
	{
		slug: 'tutorials',
		name: 'Tutorials',
		description: '面向新手和内容团队的 AI 教程与实操流程。',
	},
	{
		slug: 'prompts',
		name: 'Prompts',
		description: '可复用、可改写的提示词模板和写法案例。',
	},
	{
		slug: 'tools',
		name: 'Tools',
		description: 'AI 工具、SEO 页面和内容站运营方法。',
	},
	{
		slug: 'briefs',
		name: 'Briefs',
		description: '多语种 AI 与科技快报，适合后续接入 RSS 和自动发文流程。',
	},
	{
		slug: 'rss',
		name: 'RSS',
		description: 'RSS、自动采集、自动投稿和内容流工作流记录。',
	},
] as const;

export const LANGUAGE_NAMES: Record<string, string> = {
	'zh-CN': '中文',
	en: 'English',
	id: 'Bahasa Indonesia',
	pt: 'Português',
};

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function getCategoryBySlug(slug: string) {
	return CATEGORIES.find((category) => category.slug === slug);
}

export function getLanguageName(language: string) {
	return LANGUAGE_NAMES[language] ?? language;
}

export const SITE_TITLE = 'OmniHex Lab';
export const SITE_DESCRIPTION =
	'Multilingual AI briefs, practical prompts, and life operating guides.';
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
		slug: 'life',
		name: 'Life OS',
		description: '小语种人生建议、自我提升、行动系统和数字生活方法。',
	},
	{
		slug: 'guides',
		name: 'Guides',
		description: '可执行的人生重启、习惯重建、目标规划和 AI 自我教练指南。',
	},
	{
		slug: 'products',
		name: 'Products',
		description: '围绕 Life OS 和 AI 工作流设计的数字产品、工作簿与模板。',
	},
	{
		slug: 'books',
		name: 'Books',
		description:
			'Reading Lab 将金融、理财、关系、自我成长、心理和决策类书籍转化为原创书评、行动建议和多语种应用指南。',
	},
] as const;

export const NAV_LINKS = [
	{ href: '/briefs/', label: 'Briefs' },
	{ href: '/prompts/', label: 'Prompts' },
	{ href: '/life/', label: 'Life OS' },
	{ href: '/subscribe', label: 'Subscribe' },
	{ href: '/api/', label: 'API' },
	{ href: '/about/', label: 'About' },
] as const;

export const LANGUAGE_NAMES: Record<string, string> = {
	'zh-CN': '中文',
	zh: '中文',
	en: 'English',
	id: 'Bahasa Indonesia',
	pt: 'Português',
	es: 'Español',
	vi: 'Tiếng Việt',
};

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function getCategoryBySlug(slug: string) {
	return CATEGORIES.find((category) => category.slug === slug);
}

export function getLanguageName(language: string) {
	return LANGUAGE_NAMES[language] ?? language;
}

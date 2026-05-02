export const VALID_CATEGORIES = [
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
];

export const DEFAULT_LANGUAGES = ['en', 'zh', 'id', 'pt', 'es', 'vi'];

export function readConfig(env = process.env) {
	const aiProvider = (env.AI_PROVIDER || 'mock').trim().toLowerCase();

	return {
		nodeEnv: env.NODE_ENV || 'development',
		host: env.HOST || '0.0.0.0',
		port: parsePort(env.PORT, 8787),
		adminToken: env.ADMIN_TOKEN || '',
		sessionSecret: env.SESSION_SECRET || env.ADMIN_TOKEN || '',
		sessionMaxAgeSeconds: parsePositiveInt(env.SESSION_MAX_AGE_SECONDS, 60 * 60 * 8),
		cookieSecure: env.COOKIE_SECURE || 'auto',
		publishTarget: (env.PUBLISH_TARGET || 'content-api').trim().toLowerCase(),
		contentApi: {
			url: env.CONTENT_API_URL || 'https://lab.omnihex.xyz/api/posts',
			token: env.CONTENT_API_TOKEN || '',
		},
		github: {
			token: env.GITHUB_TOKEN || '',
			owner: env.GITHUB_OWNER || '',
			repo: env.GITHUB_REPO || 'ai-news-lab',
			branch: env.GITHUB_BRANCH || 'main',
		},
		ai: {
			provider: aiProvider,
			apiBaseUrl: env.AI_API_BASE_URL || getDefaultAiBaseUrl(aiProvider),
			apiKey: env.AI_API_KEY || env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || '',
			model: env.AI_MODEL || '',
			httpReferer: env.AI_HTTP_REFERER || 'https://admin.lab.omnihex.xyz',
			appTitle: env.AI_APP_TITLE || 'OmniHex Lab Admin',
		},
	};
}

export function getPublicConfig(config) {
	return {
		categories: VALID_CATEGORIES,
		languages: DEFAULT_LANGUAGES,
		publishTarget: config.publishTarget,
		contentApiConfigured: Boolean(config.contentApi.url && config.contentApi.token),
		githubConfigured: Boolean(config.github.token && config.github.owner && config.github.repo),
		aiProvider: config.ai.provider,
		aiModelConfigured: Boolean(config.ai.model),
	};
}

function getDefaultAiBaseUrl(provider) {
	if (provider === 'openai') {
		return 'https://api.openai.com/v1';
	}

	if (provider === 'openrouter') {
		return 'https://openrouter.ai/api/v1';
	}

	return '';
}

function parsePort(value, fallback) {
	const port = Number.parseInt(value || '', 10);

	return Number.isInteger(port) && port > 0 ? port : fallback;
}

function parsePositiveInt(value, fallback) {
	const number = Number.parseInt(value || '', 10);

	return Number.isInteger(number) && number > 0 ? number : fallback;
}

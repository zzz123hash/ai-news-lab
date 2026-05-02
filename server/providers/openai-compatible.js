import { normalizeStringList } from '../content/post.js';

export async function generateOpenAiCompatibleDraft(input, config) {
	if (!config.ai.apiBaseUrl) {
		throw aiError('AI_API_BASE_URL is not configured for this provider', 500);
	}

	if (!config.ai.apiKey) {
		throw aiError('AI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY is not configured', 500);
	}

	if (!config.ai.model) {
		throw aiError('AI_MODEL is required when AI_PROVIDER is not mock', 500);
	}

	const endpoint = `${config.ai.apiBaseUrl.replace(/\/$/, '')}/chat/completions`;
	const headers = {
		authorization: `Bearer ${config.ai.apiKey}`,
		'content-type': 'application/json; charset=utf-8',
	};

	if (config.ai.provider === 'openrouter') {
		headers['http-referer'] = config.ai.httpReferer;
		headers['x-title'] = config.ai.appTitle;
	}

	const response = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model: config.ai.model,
			messages: [
				{
					role: 'system',
					content:
						'You are an editorial assistant for an AI content site. Return only compact JSON with title, description, tags, and content fields. The content field must be Markdown.',
				},
				{
					role: 'user',
					content: JSON.stringify({
						task: 'Generate an article draft for review before publishing.',
						language: input.language || 'en',
						category: input.category || 'ai',
						topic: input.topic || input.title || '',
						title: input.title || '',
						description: input.description || '',
						tags: normalizeStringList(input.tags),
						sourceText: typeof input.sourceText === 'string' ? input.sourceText.slice(0, 6000) : '',
					}),
				},
			],
			temperature: 0.6,
		}),
	});

	const responseText = await response.text();
	let responseBody;

	try {
		responseBody = responseText ? JSON.parse(responseText) : null;
	} catch {
		responseBody = responseText;
	}

	if (!response.ok) {
		const detail = typeof responseBody === 'object' && responseBody?.error?.message ? responseBody.error.message : `HTTP ${response.status}`;
		throw aiError(`AI provider request failed: ${detail}`, 502, responseBody);
	}

	const content = responseBody?.choices?.[0]?.message?.content;

	if (typeof content !== 'string') {
		throw aiError('AI provider returned an empty draft', 502, responseBody);
	}

	return normalizeAiDraft(parseJsonFromText(content), input, config.ai.provider);
}

function normalizeAiDraft(value, input, provider) {
	const topic = typeof input.topic === 'string' && input.topic.trim() ? input.topic.trim() : 'AI draft';

	return {
		provider,
		title: stringOrFallback(value.title, input.title || `Draft: ${topic}`),
		description: stringOrFallback(value.description, input.description || `A draft article about ${topic}.`),
		category: input.category || 'ai',
		language: input.language || 'en',
		tags: normalizeStringList(value.tags || input.tags),
		content: stringOrFallback(value.content, `## Summary\n\n${topic}`),
	};
}

function parseJsonFromText(text) {
	const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.indexOf('{');
		const end = trimmed.lastIndexOf('}');

		if (start >= 0 && end > start) {
			return JSON.parse(trimmed.slice(start, end + 1));
		}

		throw aiError('AI provider did not return JSON', 502);
	}
}

function stringOrFallback(value, fallback) {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function aiError(message, status, details) {
	const error = new Error(message);
	error.status = status;
	error.details = details;

	return error;
}

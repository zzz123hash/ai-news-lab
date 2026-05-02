import { generateMockDraft } from './mock.js';
import { generateOpenAiCompatibleDraft } from './openai-compatible.js';

export async function generateDraft(input, config) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		const error = new Error('JSON body must be an object');
		error.status = 400;
		throw error;
	}

	if (config.ai.provider === 'mock') {
		return generateMockDraft(input, config);
	}

	if (['openai', 'openrouter', 'openai-compatible'].includes(config.ai.provider)) {
		return generateOpenAiCompatibleDraft(input, config);
	}

	const error = new Error('AI_PROVIDER must be mock, openai, openrouter, or openai-compatible');
	error.status = 500;
	throw error;
}

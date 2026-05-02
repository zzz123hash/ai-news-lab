import { normalizePostPayload } from '../content/post.js';
import { publishViaContentApi } from './content-api.js';
import { publishViaGithub } from './github.js';

export async function publishPostPayload(payload, config) {
	const post = normalizePostPayload(payload);

	if (config.publishTarget === 'github') {
		return publishViaGithub(post, config);
	}

	if (config.publishTarget === 'content-api') {
		return publishViaContentApi(post, config);
	}

	const error = new Error('PUBLISH_TARGET must be content-api or github');
	error.status = 500;
	throw error;
}

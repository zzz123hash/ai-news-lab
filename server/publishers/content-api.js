export async function publishViaContentApi(post, config) {
	if (!config.contentApi.url) {
		throw publishError('CONTENT_API_URL is not configured', 500);
	}

	if (!config.contentApi.token) {
		throw publishError('CONTENT_API_TOKEN is not configured', 500);
	}

	const response = await fetch(config.contentApi.url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${config.contentApi.token}`,
			'content-type': 'application/json; charset=utf-8',
		},
		body: JSON.stringify(post),
	});
	const responseText = await response.text();
	let body = responseText || null;

	try {
		body = responseText ? JSON.parse(responseText) : null;
	} catch {
		body = responseText;
	}

	if (!response.ok || body?.ok === false) {
		const detail = typeof body === 'object' && body?.error ? body.error : `HTTP ${response.status}`;
		throw publishError(`Content API publish failed: ${detail}`, 502, body);
	}

	return {
		ok: true,
		target: 'content-api',
		upstreamStatus: response.status,
		...body,
	};
}

function publishError(message, status, details) {
	const error = new Error(message);
	error.status = status;
	error.details = details;

	return error;
}

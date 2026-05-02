export function send(res, response) {
	res.writeHead(response.status, response.headers);
	res.end(response.body);
}

export function html(body, status = 200, headers = {}) {
	return {
		status,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...headers,
		},
		body,
	};
}

export function json(body, status = 200, headers = {}) {
	return {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			...headers,
		},
		body: JSON.stringify(body),
	};
}

export function redirect(location, status = 303, headers = {}) {
	return {
		status,
		headers: {
			location,
			'cache-control': 'no-store',
			...headers,
		},
		body: '',
	};
}

export function noContent(status = 204, headers = {}) {
	return {
		status,
		headers,
		body: '',
	};
}

export function methodNotAllowed(allowedMethods) {
	return json({ ok: false, error: `Method must be ${allowedMethods.join(' or ')}` }, 405, {
		allow: allowedMethods.join(', '),
	});
}

export function parseCookies(cookieHeader = '') {
	const cookies = {};

	for (const part of cookieHeader.split(';')) {
		const [rawName, ...rawValue] = part.trim().split('=');

		if (!rawName) {
			continue;
		}

		cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
	}

	return cookies;
}

export async function readJson(req, maxBytes = 1024 * 1024) {
	const text = await readBody(req, maxBytes);

	if (!text.trim()) {
		return {};
	}

	try {
		return JSON.parse(text);
	} catch {
		const error = new Error('Request body must be valid JSON');
		error.status = 400;
		throw error;
	}
}

export async function readForm(req, maxBytes = 64 * 1024) {
	const text = await readBody(req, maxBytes);
	const params = new URLSearchParams(text);
	const data = {};

	for (const [key, value] of params.entries()) {
		data[key] = value;
	}

	return data;
}

export function wantsJson(req, pathname) {
	const accept = req.headers.accept || '';

	return pathname.startsWith('/api/') || accept.includes('application/json');
}

async function readBody(req, maxBytes) {
	let body = '';
	let size = 0;

	for await (const chunk of req) {
		size += chunk.length;

		if (size > maxBytes) {
			const error = new Error('Request body is too large');
			error.status = 413;
			throw error;
		}

		body += chunk.toString('utf8');
	}

	return body;
}

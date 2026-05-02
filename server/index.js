import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createLogoutHeader, createSessionHeader, isAuthenticated, validateLoginToken } from './auth.js';
import { getPublicConfig, readConfig } from './config.js';
import { generateDraft } from './providers/index.js';
import { html, json, methodNotAllowed, noContent, readForm, readJson, redirect, send, wantsJson } from './http.js';
import { publishPostPayload } from './publishers/index.js';
import { renderAdminPage, renderLoginPage } from './ui.js';

export function createAdminServer(config = readConfig()) {
	return http.createServer(async (req, res) => {
		const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

		try {
			send(res, await route(req, url, config));
		} catch (error) {
			const status = error.status || 500;
			const body = {
				ok: false,
				error: error instanceof Error ? error.message : 'Unexpected error',
			};

			if (error.details) {
				body.details = error.details;
			}

			send(res, wantsJson(req, url.pathname) ? json(body, status) : html(renderErrorPage(body.error), status));
		}
	});
}

async function route(req, url, config) {
	if ((url.pathname === '/health' || url.pathname === '/api/health') && req.method === 'GET') {
		return json({ ok: true, service: 'ai-news-lab-admin' });
	}

	if (url.pathname === '/' && req.method === 'GET') {
		return redirect('/admin');
	}

	if (url.pathname === '/login') {
		return handleLoginPage(req, url, config);
	}

	if (url.pathname === '/api/login') {
		return handleLoginApi(req, config);
	}

	const authenticated = isAuthenticated(req, config);

	if (!authenticated) {
		return wantsJson(req, url.pathname)
			? json({ ok: false, error: 'Unauthorized' }, 401)
			: redirect(`/login?next=${encodeURIComponent(url.pathname)}`);
	}

	if (url.pathname === '/logout' || url.pathname === '/api/logout') {
		if (!['GET', 'POST'].includes(req.method || '')) {
			return methodNotAllowed(['GET', 'POST']);
		}

		const headers = { 'set-cookie': createLogoutHeader(req, config) };

		return url.pathname.startsWith('/api/') ? json({ ok: true }, 200, headers) : redirect('/login', 303, headers);
	}

	if ((url.pathname === '/admin' || url.pathname === '/admin/') && req.method === 'GET') {
		return html(renderAdminPage(config), 200, { 'cache-control': 'no-store' });
	}

	if (url.pathname === '/api/config' && req.method === 'GET') {
		return json(getPublicConfig(config));
	}

	if (url.pathname === '/api/ai/generate') {
		if (req.method !== 'POST') {
			return methodNotAllowed(['POST']);
		}

		const body = await readJson(req, 1024 * 1024);
		const draft = await generateDraft(body, config);

		return json({ ok: true, draft });
	}

	if (url.pathname === '/api/posts') {
		if (req.method !== 'POST') {
			return methodNotAllowed(['POST']);
		}

		const body = await readJson(req, 2 * 1024 * 1024);
		const result = await publishPostPayload(body, config);

		return json(result);
	}

	if (url.pathname === '/favicon.ico') {
		return noContent();
	}

	return wantsJson(req, url.pathname) ? json({ ok: false, error: 'Not found' }, 404) : html(renderErrorPage('Not found'), 404);
}

async function handleLoginPage(req, url, config) {
	if (req.method === 'GET') {
		if (isAuthenticated(req, config)) {
			return redirect('/admin');
		}

		return html(renderLoginPage({ error: url.searchParams.has('error'), missingToken: !config.adminToken }), 200, {
			'cache-control': 'no-store',
		});
	}

	if (req.method !== 'POST') {
		return methodNotAllowed(['GET', 'POST']);
	}

	const body = await readForm(req);

	if (!validateLoginToken(body.token || '', config)) {
		return redirect('/login?error=1');
	}

	return redirect('/admin', 303, {
		'set-cookie': createSessionHeader(req, config),
	});
}

async function handleLoginApi(req, config) {
	if (req.method !== 'POST') {
		return methodNotAllowed(['POST']);
	}

	const body = await readJson(req);

	if (!validateLoginToken(body.token || '', config)) {
		return json({ ok: false, error: 'Unauthorized' }, 401);
	}

	return json(
		{ ok: true },
		200,
		{
			'set-cookie': createSessionHeader(req, config),
		},
	);
}

function renderErrorPage(message) {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Error</title></head><body><main style="font-family: system-ui, sans-serif; padding: 2rem;"><h1>${escapeHtml(message)}</h1><p><a href="/admin">Back to admin</a></p></main></body></html>`;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const config = readConfig();
	const server = createAdminServer(config);

	server.listen(config.port, config.host, () => {
		console.log(`ai-news-lab admin listening on http://${config.host}:${config.port}`);

		if (!config.adminToken) {
			console.warn('ADMIN_TOKEN is not configured; login is disabled.');
		}
	});
}

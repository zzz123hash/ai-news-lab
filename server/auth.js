import crypto from 'node:crypto';
import { parseCookies } from './http.js';

const SESSION_COOKIE = 'admin_session';

export function isAuthenticated(req, config) {
	const cookies = parseCookies(req.headers.cookie || '');
	const value = cookies[SESSION_COOKIE];

	if (!value || !config.sessionSecret) {
		return false;
	}

	const parts = value.split('.');

	if (parts.length !== 3 || parts[0] !== 'admin') {
		return false;
	}

	const issuedAt = Number.parseInt(parts[1], 10);

	if (!Number.isFinite(issuedAt)) {
		return false;
	}

	const age = Date.now() - issuedAt;

	if (age < 0 || age > config.sessionMaxAgeSeconds * 1000) {
		return false;
	}

	return signaturesMatch(sign(`${parts[0]}.${parts[1]}`, config.sessionSecret), parts[2]);
}

export function validateLoginToken(token, config) {
	return Boolean(config.adminToken) && token === config.adminToken;
}

export function createSessionHeader(req, config) {
	const payload = `admin.${Date.now()}`;
	const value = `${payload}.${sign(payload, config.sessionSecret)}`;

	return createCookieHeader(SESSION_COOKIE, value, {
		httpOnly: true,
		maxAge: config.sessionMaxAgeSeconds,
		path: '/',
		sameSite: 'Lax',
		secure: shouldUseSecureCookie(req, config),
	});
}

export function createLogoutHeader(req, config) {
	return createCookieHeader(SESSION_COOKIE, '', {
		httpOnly: true,
		maxAge: 0,
		path: '/',
		sameSite: 'Lax',
		secure: shouldUseSecureCookie(req, config),
	});
}

function sign(value, secret) {
	return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function signaturesMatch(expected, actual) {
	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual);

	return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function createCookieHeader(name, value, options) {
	const parts = [`${name}=${encodeURIComponent(value)}`];

	if (options.maxAge !== undefined) {
		parts.push(`Max-Age=${options.maxAge}`);
	}

	if (options.path) {
		parts.push(`Path=${options.path}`);
	}

	if (options.httpOnly) {
		parts.push('HttpOnly');
	}

	if (options.secure) {
		parts.push('Secure');
	}

	if (options.sameSite) {
		parts.push(`SameSite=${options.sameSite}`);
	}

	return parts.join('; ');
}

function shouldUseSecureCookie(req, config) {
	if (config.cookieSecure === 'true') {
		return true;
	}

	if (config.cookieSecure === 'false') {
		return false;
	}

	return req.headers['x-forwarded-proto'] === 'https' || Boolean(req.socket.encrypted);
}

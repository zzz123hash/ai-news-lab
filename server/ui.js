import { DEFAULT_LANGUAGES, VALID_CATEGORIES } from './config.js';

export function renderLoginPage({ error = false, missingToken = false } = {}) {
	return page({
		title: 'OmniHex Admin Login',
		body: `
			<main class="login-shell">
				<section class="login-panel">
					<p class="eyebrow">OmniHex Lab</p>
					<h1>Admin Login</h1>
					<p class="muted">Use the server-side ADMIN_TOKEN to open the editor workspace.</p>
					${missingToken ? `<p class="notice danger">ADMIN_TOKEN is not configured on the server.</p>` : ''}
					${error ? `<p class="notice danger">Invalid admin token.</p>` : ''}
					<form method="post" action="/login" class="stack">
						<label for="token">Admin token</label>
						<input id="token" name="token" type="password" autocomplete="current-password" required autofocus />
						<button type="submit">Log in</button>
					</form>
				</section>
			</main>
		`,
	});
}

export function renderAdminPage(config) {
	return page({
		title: 'OmniHex Admin',
		body: `
			<header class="topbar">
				<div>
					<p class="eyebrow">OmniHex Lab</p>
					<h1>AI Content Admin</h1>
				</div>
				<form method="post" action="/logout">
					<button class="ghost-button" type="submit">Log out</button>
				</form>
			</header>

			<main class="admin-layout">
				<section class="editor-panel">
					<div class="section-heading">
						<h2>Article Editor</h2>
						<p class="muted">Create a reviewed Markdown draft, then publish it through the configured backend.</p>
					</div>

					<form id="post-form" class="editor-form">
						<div class="form-row">
							<label for="title">Title</label>
							<input id="title" name="title" type="text" autocomplete="off" required />
						</div>

						<div class="form-row">
							<label for="description">Summary</label>
							<textarea id="description" name="description" rows="3" required></textarea>
						</div>

						<div class="field-grid">
							<div class="form-row">
								<label for="category">Category</label>
								<select id="category" name="category" required>
									${VALID_CATEGORIES.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
								</select>
							</div>
							<div class="form-row">
								<label for="language">Language</label>
								<select id="language" name="language" required>
									${DEFAULT_LANGUAGES.map((language) => `<option value="${escapeHtml(language)}">${escapeHtml(language)}</option>`).join('')}
								</select>
							</div>
						</div>

						<div class="form-row">
							<label for="tags">Tags</label>
							<input id="tags" name="tags" type="text" placeholder="AI, News, Workflow" />
						</div>

						<div class="form-row">
							<label for="content">Markdown Body</label>
							<textarea id="content" name="content" class="markdown-input" rows="18" required></textarea>
						</div>

						<label class="checkbox-row">
							<input id="draft" name="draft" type="checkbox" checked />
							<span>Save as draft</span>
						</label>

						<div class="actions-row">
							<button type="submit">Publish Article</button>
							<span id="publish-status" class="muted" aria-live="polite"></span>
						</div>
					</form>
				</section>

				<aside class="side-column">
					<section class="tool-panel">
						<div class="section-heading">
							<h2>AI Draft</h2>
							<p class="muted">Provider: <strong>${escapeHtml(config.ai.provider)}</strong></p>
						</div>
						<form id="ai-form" class="stack">
							<div class="form-row">
								<label for="topic">Topic or angle</label>
								<textarea id="topic" name="topic" rows="3" placeholder="What should this article explain?"></textarea>
							</div>
							<div class="form-row">
								<label for="sourceText">Source notes</label>
								<textarea id="sourceText" name="sourceText" rows="8" placeholder="Paste source notes, facts, or links to transform into a draft."></textarea>
							</div>
							<button type="submit">Generate Draft</button>
							<p id="ai-status" class="muted" aria-live="polite"></p>
						</form>
					</section>

					<section class="tool-panel">
						<div class="section-heading">
							<h2>Server Status</h2>
							<p id="server-status" class="muted">Loading configuration...</p>
						</div>
						<pre id="result-output"></pre>
					</section>
				</aside>
			</main>

			<script>
				const postForm = document.querySelector('#post-form');
				const aiForm = document.querySelector('#ai-form');
				const publishStatus = document.querySelector('#publish-status');
				const aiStatus = document.querySelector('#ai-status');
				const serverStatus = document.querySelector('#server-status');
				const resultOutput = document.querySelector('#result-output');

				const getValue = (selector) => document.querySelector(selector)?.value.trim() || '';
				const setValue = (selector, value) => {
					const field = document.querySelector(selector);
					if (field) field.value = value || '';
				};
				const parseTags = (value) => value.split(',').map((tag) => tag.trim()).filter(Boolean);
				const showResult = (value) => {
					resultOutput.textContent = JSON.stringify(value, null, 2);
				};

				const getPostPayload = () => ({
					title: getValue('#title'),
					description: getValue('#description'),
					category: getValue('#category'),
					language: getValue('#language'),
					tags: parseTags(getValue('#tags')),
					draft: document.querySelector('#draft')?.checked ?? true,
					content: getValue('#content'),
				});

				fetch('/api/config')
					.then((response) => response.json())
					.then((config) => {
						serverStatus.textContent = 'Publish target: ' + config.publishTarget + ' | AI provider: ' + config.aiProvider;
						showResult(config);
					})
					.catch((error) => {
						serverStatus.textContent = 'Could not load server configuration.';
						showResult({ error: error.message });
					});

				aiForm?.addEventListener('submit', async (event) => {
					event.preventDefault();
					aiStatus.textContent = 'Generating draft...';

					try {
						const payload = {
							...getPostPayload(),
							topic: getValue('#topic'),
							sourceText: getValue('#sourceText'),
						};
						const response = await fetch('/api/ai/generate', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(payload),
						});
						const body = await response.json();

						if (!response.ok || body.ok === false) {
							throw new Error(body.error || 'AI generation failed');
						}

						setValue('#title', body.draft.title);
						setValue('#description', body.draft.description);
						setValue('#category', body.draft.category);
						setValue('#language', body.draft.language);
						setValue('#tags', (body.draft.tags || []).join(', '));
						setValue('#content', body.draft.content);

						aiStatus.textContent = 'Draft generated.';
						showResult(body);
					} catch (error) {
						aiStatus.textContent = 'Generation failed.';
						showResult({ ok: false, error: error.message });
					}
				});

				postForm?.addEventListener('submit', async (event) => {
					event.preventDefault();
					publishStatus.textContent = 'Publishing...';

					try {
						const response = await fetch('/api/posts', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(getPostPayload()),
						});
						const body = await response.json();

						if (!response.ok || body.ok === false) {
							throw new Error(body.error || 'Publish failed');
						}

						publishStatus.textContent = 'Published.';
						showResult(body);
					} catch (error) {
						publishStatus.textContent = 'Publish failed.';
						showResult({ ok: false, error: error.message });
					}
				});
			</script>
		`,
	});
}

function page({ title, body }) {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
	<style>
		:root {
			color-scheme: light;
			--ink: #172033;
			--muted: #64748b;
			--line: #d8e0ea;
			--soft: #f6f8fb;
			--accent: #2563eb;
			--accent-dark: #1d4ed8;
			--danger: #b42318;
			--danger-bg: #fff1f0;
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			background: #ffffff;
			color: var(--ink);
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			line-height: 1.5;
		}

		h1,
		h2,
		p {
			margin: 0;
		}

		h1 {
			font-size: 1.8rem;
			line-height: 1.15;
		}

		h2 {
			font-size: 1.1rem;
		}

		button,
		input,
		select,
		textarea {
			font: inherit;
		}

		button {
			border: 0;
			border-radius: 6px;
			background: var(--accent);
			color: #ffffff;
			cursor: pointer;
			font-weight: 700;
			padding: 0.72rem 1rem;
		}

		button:hover {
			background: var(--accent-dark);
		}

		input,
		select,
		textarea {
			width: 100%;
			border: 1px solid var(--line);
			border-radius: 6px;
			background: #ffffff;
			color: var(--ink);
			padding: 0.66rem 0.72rem;
		}

		input:focus,
		select:focus,
		textarea:focus {
			border-color: var(--accent);
			outline: 3px solid rgba(37, 99, 235, 0.14);
		}

		label {
			color: var(--ink);
			font-size: 0.9rem;
			font-weight: 700;
		}

		pre {
			max-height: 340px;
			overflow: auto;
			margin: 0;
			border: 1px solid var(--line);
			border-radius: 6px;
			background: #0f172a;
			color: #dbeafe;
			font-size: 0.82rem;
			line-height: 1.45;
			padding: 0.85rem;
			white-space: pre-wrap;
		}

		.topbar {
			display: flex;
			justify-content: space-between;
			gap: 1rem;
			align-items: center;
			border-bottom: 1px solid var(--line);
			padding: 1.1rem clamp(1rem, 4vw, 2rem);
		}

		.eyebrow {
			color: var(--accent-dark);
			font-size: 0.8rem;
			font-weight: 800;
			letter-spacing: 0;
			text-transform: uppercase;
		}

		.muted {
			color: var(--muted);
			font-size: 0.92rem;
		}

		.admin-layout {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
			gap: 1.25rem;
			align-items: start;
			padding: 1.25rem clamp(1rem, 4vw, 2rem) 2rem;
		}

		.editor-panel,
		.tool-panel,
		.login-panel {
			border: 1px solid var(--line);
			border-radius: 8px;
			background: #ffffff;
			padding: 1.1rem;
		}

		.editor-form,
		.stack,
		.side-column {
			display: grid;
			gap: 1rem;
		}

		.section-heading {
			display: grid;
			gap: 0.25rem;
			margin-bottom: 1rem;
		}

		.form-row {
			display: grid;
			gap: 0.35rem;
		}

		.field-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.85rem;
		}

		.markdown-input {
			min-height: 460px;
			font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
			font-size: 0.92rem;
		}

		.checkbox-row,
		.actions-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.65rem;
			align-items: center;
		}

		.checkbox-row input {
			width: auto;
		}

		.ghost-button {
			border: 1px solid var(--line);
			background: #ffffff;
			color: var(--ink);
		}

		.ghost-button:hover {
			background: var(--soft);
		}

		.login-shell {
			display: grid;
			min-height: 100vh;
			place-items: center;
			padding: 1rem;
		}

		.login-panel {
			display: grid;
			width: min(100%, 420px);
			gap: 1rem;
		}

		.notice {
			border: 1px solid var(--line);
			border-radius: 6px;
			padding: 0.65rem 0.75rem;
		}

		.notice.danger {
			border-color: #f4b8b0;
			background: var(--danger-bg);
			color: var(--danger);
		}

		@media (max-width: 980px) {
			.admin-layout,
			.field-grid {
				grid-template-columns: 1fr;
			}
		}
	</style>
</head>
<body>
	${body}
</body>
</html>`;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

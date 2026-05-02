import { normalizeStringList } from '../content/post.js';

export async function generateMockDraft(input) {
	const topic = getText(input.topic) || getText(input.title) || 'AI workflow update';
	const language = getText(input.language) || 'en';
	const category = getText(input.category) || 'ai';
	const title = getText(input.title) || createTitle(topic);
	const description = getText(input.description) || `A draft outline for ${topic}.`;
	const tags = normalizeStringList(input.tags).length > 0 ? normalizeStringList(input.tags) : ['AI', 'Draft'];
	const sourceText = getText(input.sourceText);

	return {
		provider: 'mock',
		title,
		description,
		category,
		language,
		tags,
		content: [
			`## Summary`,
			`This first draft frames ${topic} for readers who need a practical, source-aware explanation.`,
			``,
			`## Why it matters`,
			`- Explain the concrete change or idea.`,
			`- Connect it to the audience's work, learning, or publishing workflow.`,
			`- Mark anything that still needs verification before publication.`,
			``,
			`## Draft angle`,
			`Use a calm editorial voice. Keep the piece useful, specific, and easy to update after review.`,
			sourceText ? `\n## Source notes\n${sourceText.slice(0, 1200)}` : '',
			``,
			`## Next steps`,
			`Review facts, add links where needed, then switch draft to false when the article is ready.`,
		]
			.filter(Boolean)
			.join('\n'),
	};
}

function getText(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function createTitle(topic) {
	const normalized = topic.replace(/\s+/g, ' ').trim();

	return normalized ? `Draft: ${normalized}` : 'Draft: AI workflow update';
}

import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

const serviceVersion = '0.1.0';

const mockSignals = [
  {
    title: 'AI workflows are becoming personal operating systems',
    summary: 'More creators are turning AI prompts, notes, and automations into repeatable daily systems.',
    category: 'life',
    language: 'en',
  },
  {
    title: 'Multilingual AI content remains underexplored',
    summary: 'Small-language AI tutorials and briefs may have lower SEO competition than English and Chinese content.',
    category: 'briefs',
    language: 'en',
  },
  {
    title: 'Prompt libraries can become lightweight digital products',
    summary: 'Practical prompt collections can support affiliate, subscription, or PDF product experiments.',
    category: 'prompts',
    language: 'en',
  },
];

app.get('/health', async () => ({
  ok: true,
  service: 'OmniHex API',
  time: new Date().toISOString(),
}));

app.get('/public/signals', async () => ({
  ok: true,
  signals: mockSignals,
}));

app.get('/public/status', async () => ({
  ok: true,
  service: 'OmniHex API',
  version: serviceVersion,
  environment: 'transition',
  features: {
    health: true,
    signals: true,
    ai: false,
    database: false,
    notion: false,
  },
  time: new Date().toISOString(),
}));

const host = process.env.HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '3000', 10);

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

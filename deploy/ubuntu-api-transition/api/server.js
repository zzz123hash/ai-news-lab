import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

app.get('/health', async () => ({
  ok: true,
  service: 'OmniHex API',
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

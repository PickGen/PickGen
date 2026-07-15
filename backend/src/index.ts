import Fastify, { type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { generateRoutes } from './routes/generate.js';
import { galleryRoutes } from './routes/gallery.js';
import { paymentRoutes } from './routes/payments.js';

const app = Fastify({
  logger: { level: config.isProd ? 'info' : 'warn' },
  bodyLimit: 2 * 1024 * 1024,
  // Render/other PaaS terminate TLS and forward via proxy — trust X-Forwarded-*
  // so req.ip (rate limiting) and secure cookies work correctly.
  trustProxy: config.isProd,
});

await initDb();

await app.register(cookie);
// CLIENT_ORIGIN may be a comma-separated list (e.g. prod + preview domains).
const allowedOrigins = config.clientOrigin.split(',').map((s) => s.trim()).filter(Boolean);
await app.register(cors, {
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
});

app.get('/api/health', async () => ({ status: 'ok', ai: config.aiProvider, payment: config.paymentProvider }));

await app.register(authRoutes);
await app.register(meRoutes);
await app.register(generateRoutes);
await app.register(galleryRoutes);
await app.register(paymentRoutes);

// Uniform error envelope (NFR-2)
app.setErrorHandler((err: FastifyError, _req, reply) => {
  app.log.error(err);
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  reply.code(status).send({ error: 'server_error', message: config.isProd ? 'Внутренняя ошибка' : err.message });
});

app.setNotFoundHandler((_req, reply) => {
  reply.code(404).send({ error: 'not_found' });
});

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`PickGen backend → http://localhost:${config.port}  (ai=${config.aiProvider}, pay=${config.paymentProvider})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

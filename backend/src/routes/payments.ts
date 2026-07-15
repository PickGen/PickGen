import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { requireAuth } from '../auth/plugin.js';
import { users, payments } from '../db/repos.js';
import { config, findPackage, PACKAGES } from '../config.js';
import { getPaymentProvider } from '../providers/payment/index.js';
import { getCryptomusPayment } from '../providers/payment/cryptomus.js';
import { getNowPayment } from '../providers/payment/nowpayments.js';
import { publicUser } from './auth.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // packages (FR-6.7/6.8)
  app.get('/api/packages', async () => ({ packages: PACKAGES }));

  // payment history (FR-6.5)
  app.get('/api/payments', { preHandler: requireAuth }, async (req) => {
    const rows = await payments.listByUser(req.user!.id);
    return {
      payments: rows.map((p) => ({
        id: p.id,
        provider: p.provider,
        amount: p.amount,
        credits: p.credits,
        type: p.type,
        status: p.status,
        createdAt: p.created_at,
      })),
    };
  });

  // create checkout (FR-6.1/6.2)
  app.post<{ Body: { packageId?: string } }>('/api/checkout', { preHandler: requireAuth }, async (req, reply) => {
    const pkg = findPackage(req.body?.packageId ?? '');
    if (!pkg) return reply.code(400).send({ error: 'invalid_package' });
    const user = req.user!;
    const provider = getPaymentProvider();
    try {
      const session = await provider.createCheckout({ user: { id: user.id, email: user.email }, pkg });
      return { checkout: session, package: pkg };
    } catch (err) {
      return reply.code(502).send({ error: 'checkout_failed', message: (err as Error).message });
    }
  });

  // DEV ONLY: complete a mock purchase (mimics MoR webhook success) — FR-6.3
  app.post<{ Body: { packageId?: string } }>('/api/payments/mock-complete', { preHandler: requireAuth }, async (req, reply) => {
    if (config.paymentProvider !== 'mock') {
      return reply.code(403).send({ error: 'disabled', message: 'Мок-оплата доступна только в dev' });
    }
    const pkg = findPackage(req.body?.packageId ?? '');
    if (!pkg) return reply.code(400).send({ error: 'invalid_package' });
    const user = req.user!;

    await payments.create({
      user_id: user.id,
      provider: 'mock',
      amount: pkg.priceUsd,
      credits: pkg.credits,
      type: 'credits_pack',
      status: 'success',
      external_id: `mock_${Date.now()}`,
    });
    await users.addCredits(user.id, pkg.credits);
    if (user.plan === 'free') await users.setPlan(user.id, pkg.line === 'quality' ? 'pro' : 'standard');

    const fresh = (await users.getById(user.id))!;
    return { ok: true, user: publicUser(fresh), creditsAdded: pkg.credits };
  });

  // Lemon Squeezy webhook (FR-6.3, FR-6.6). Verifies HMAC over the raw body.
  app.post('/api/webhooks/lemonsqueezy', async (req, reply) => {
    const secret = config.lemonSqueezy.webhookSecret;
    const signature = req.headers['x-signature'];
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (secret) {
      if (!raw) return reply.code(400).send({ error: 'no_raw_body' });
      const digest = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (typeof signature !== 'string' || !safeEqual(digest, signature)) {
        return reply.code(401).send({ error: 'bad_signature' });
      }
    }

    const event = req.body as LsEvent;
    const eventName = event?.meta?.event_name;
    const custom = event?.meta?.custom_data;
    const userId = custom?.user_id;
    const packageId = custom?.package_id;

    if (!userId) return reply.code(400).send({ error: 'no_user' });
    const pkg = packageId ? findPackage(packageId) : undefined;

    // idempotency by external order id
    const externalId = event?.data?.id ? `ls_${event.data.id}` : `ls_${Date.now()}`;
    if (await payments.findByExternalId(externalId)) return { ok: true, duplicate: true };

    if (eventName === 'order_created' && pkg) {
      await payments.create({
        user_id: userId,
        provider: 'lemonsqueezy',
        amount: pkg.priceUsd,
        credits: pkg.credits,
        type: 'credits_pack',
        status: 'success',
        external_id: externalId,
      });
      await users.addCredits(userId, pkg.credits);
      if (pkg) await users.setPlan(userId, pkg.line === 'quality' ? 'pro' : 'standard');
    } else if (eventName === 'order_refunded' && pkg) {
      // FR-6.6: refund removes access (claw back credits, floor at 0)
      const u = await users.getById(userId);
      if (u) {
        const clawback = Math.min(u.credits, pkg.credits);
        if (clawback > 0) await users.deductCredits(userId, clawback);
        await users.setPlan(userId, 'free');
      }
      await payments.create({
        user_id: userId,
        provider: 'lemonsqueezy',
        amount: pkg.priceUsd,
        credits: -pkg.credits,
        type: 'credits_pack',
        status: 'refunded',
        external_id: `${externalId}_refund`,
      });
    }

    return { ok: true };
  });

  // Cryptomus callback (crypto/card checkout). The callback only triggers a
  // re-check: we ask Cryptomus for the authoritative status, so a spoofed call
  // can't grant credits. Routing (user + package) is encoded in order_id.
  app.post('/api/webhooks/cryptomus', async (req, reply) => {
    const body = (req.body ?? {}) as { uuid?: string; order_id?: string };
    if (!body.uuid && !body.order_id) return reply.code(400).send({ error: 'bad_payload' });

    const info = await getCryptomusPayment({ uuid: body.uuid, orderId: body.order_id });
    if (!info) return reply.code(400).send({ error: 'no_info' });

    const paid = info.payment_status === 'paid' || info.payment_status === 'paid_over';
    if (!paid) return { ok: true, status: info.payment_status };

    // idempotency by Cryptomus payment uuid
    const externalId = `cm_${info.uuid}`;
    if (await payments.findByExternalId(externalId)) return { ok: true, duplicate: true };

    // order_id format: `<pkgId>~<userId>~<nonce>`
    const [pkgId, userId] = String(info.order_id).split('~');
    const pkg = pkgId ? findPackage(pkgId) : undefined;
    if (!pkg || !userId) return reply.code(400).send({ error: 'route_failed' });

    await payments.create({
      user_id: userId,
      provider: 'cryptomus',
      amount: pkg.priceUsd,
      credits: pkg.credits,
      type: 'credits_pack',
      status: 'success',
      external_id: externalId,
    });
    await users.addCredits(userId, pkg.credits);
    await users.setPlan(userId, pkg.line === 'quality' ? 'pro' : 'standard');

    return { ok: true };
  });

  // NOWPayments IPN (crypto checkout). Re-checks status via their API before
  // crediting, so a spoofed callback can't grant credits.
  app.post('/api/webhooks/nowpayments', async (req, reply) => {
    const body = (req.body ?? {}) as { payment_id?: string | number };
    if (!body.payment_id) return reply.code(400).send({ error: 'bad_payload' });

    const info = await getNowPayment(String(body.payment_id));
    if (!info) return reply.code(400).send({ error: 'no_info' });
    if (info.payment_status !== 'finished') return { ok: true, status: info.payment_status };

    const externalId = `np_${info.payment_id}`;
    if (await payments.findByExternalId(externalId)) return { ok: true, duplicate: true };

    const [pkgId, userId] = String(info.order_id).split('~');
    const pkg = pkgId ? findPackage(pkgId) : undefined;
    if (!pkg || !userId) return reply.code(400).send({ error: 'route_failed' });

    await payments.create({
      user_id: userId,
      provider: 'nowpayments',
      amount: pkg.priceUsd,
      credits: pkg.credits,
      type: 'credits_pack',
      status: 'success',
      external_id: externalId,
    });
    await users.addCredits(userId, pkg.credits);
    await users.setPlan(userId, pkg.line === 'quality' ? 'pro' : 'standard');

    return { ok: true };
  });
}

interface LsEvent {
  meta?: { event_name?: string; custom_data?: { user_id?: string; package_id?: string } };
  data?: { id?: string };
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

import { nanoid } from 'nanoid';
import { config } from '../config.js';
import {
  dbAll,
  dbGet,
  dbRun,
  type UserRow,
  type GenerationRow,
  type PaymentRow,
} from './index.js';

const now = () => new Date().toISOString();

// ── Users ───────────────────────────────────────────────────────────
export const users = {
  getById(id: string): Promise<UserRow | undefined> {
    return dbGet<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  },
  getByEmail(email: string): Promise<UserRow | undefined> {
    return dbGet<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  },
  /** Find by email or create with free trial credits (FR-5.6). */
  async findOrCreate(email: string): Promise<UserRow> {
    const existing = await this.getByEmail(email);
    if (existing) return existing;
    const row: UserRow = {
      id: `usr_${nanoid(16)}`,
      email,
      credits: config.freeSignupCredits,
      plan: 'free',
      created_at: now(),
    };
    await dbRun(
      `INSERT INTO users (id, email, credits, plan, created_at)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [row.id, row.email, row.credits, row.plan, row.created_at],
    );
    // Re-read to cover the race where a concurrent request created it first.
    return (await this.getByEmail(email))!;
  },
  /** Atomically deduct credits only if enough are available. Returns updated row or null. */
  async deductCredits(id: string, amount: number): Promise<UserRow | null> {
    const info = await dbRun(
      'UPDATE users SET credits = credits - $1 WHERE id = $2 AND credits >= $3',
      [amount, id, amount],
    );
    if (info.changes === 0) return null;
    return (await this.getById(id)) ?? null;
  },
  async addCredits(id: string, amount: number): Promise<UserRow | null> {
    await dbRun('UPDATE users SET credits = credits + $1 WHERE id = $2', [amount, id]);
    return (await this.getById(id)) ?? null;
  },
  async setPlan(id: string, plan: string): Promise<void> {
    await dbRun('UPDATE users SET plan = $1 WHERE id = $2', [plan, id]);
  },
};

// ── Generations ─────────────────────────────────────────────────────
export const generations = {
  async create(input: Omit<GenerationRow, 'id' | 'created_at'>): Promise<GenerationRow> {
    const row: GenerationRow = { id: `gen_${nanoid(16)}`, created_at: now(), ...input };
    await dbRun(
      `INSERT INTO generations (id, user_id, prompt, final_prompt, mode, style, format, seed, image_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        row.id, row.user_id, row.prompt, row.final_prompt, row.mode,
        row.style, row.format, row.seed, row.image_url, row.created_at,
      ],
    );
    return row;
  },
  listByUser(userId: string, limit = 60): Promise<GenerationRow[]> {
    return dbAll<GenerationRow>(
      'SELECT * FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit],
    );
  },
  getOwned(id: string, userId: string): Promise<GenerationRow | undefined> {
    return dbGet<GenerationRow>('SELECT * FROM generations WHERE id = $1 AND user_id = $2', [id, userId]);
  },
  async delete(id: string, userId: string): Promise<boolean> {
    const info = await dbRun('DELETE FROM generations WHERE id = $1 AND user_id = $2', [id, userId]);
    return info.changes > 0;
  },
  async clear(userId: string): Promise<number> {
    const info = await dbRun('DELETE FROM generations WHERE user_id = $1', [userId]);
    return info.changes;
  },
  /** Count draft generations created today (free-tier daily limit, FR-6.9). */
  async countDraftsToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const row = await dbGet<{ c: number }>(
      "SELECT COUNT(*) AS c FROM generations WHERE user_id = $1 AND mode = 'draft' AND created_at >= $2",
      [userId, startOfDay.toISOString()],
    );
    return Number(row?.c ?? 0);
  },
};

// ── Payments ────────────────────────────────────────────────────────
export const payments = {
  async create(input: Omit<PaymentRow, 'id' | 'created_at'>): Promise<PaymentRow> {
    const row: PaymentRow = { id: `pay_${nanoid(16)}`, created_at: now(), ...input };
    await dbRun(
      `INSERT INTO payments (id, user_id, provider, amount, credits, type, status, external_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.id, row.user_id, row.provider, row.amount, row.credits,
        row.type, row.status, row.external_id, row.created_at,
      ],
    );
    return row;
  },
  listByUser(userId: string, limit = 50): Promise<PaymentRow[]> {
    return dbAll<PaymentRow>(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit],
    );
  },
  findByExternalId(externalId: string): Promise<PaymentRow | undefined> {
    return dbGet<PaymentRow>('SELECT * FROM payments WHERE external_id = $1', [externalId]);
  },
  async setStatus(id: string, status: string): Promise<void> {
    await dbRun('UPDATE payments SET status = $1 WHERE id = $2', [status, id]);
  },
};

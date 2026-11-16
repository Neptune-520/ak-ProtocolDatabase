import express, { type Request, type Response, type NextFunction } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { SquadStore } from './store.js';
import { validateSquad, validSeason, ValidationError } from './validation.js';

const COOKIE = 'sp_plaza_owner';
const COOKIE_AGE = 365 * 24 * 60 * 60 * 1000;
const hash = (secret: string) => createHash('sha256').update(secret).digest('hex');
function ownerSecret(req: Request): string | undefined {
  const value = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
let catalog: Set<string> | undefined;
let catalogAt = 0;
let pending: Promise<Set<string>> | undefined;
export async function loadOperatorIds(): Promise<Set<string>> {
  if (catalog && Date.now() - catalogAt < 60 * 60 * 1000) return catalog;
  if (pending) return pending;
  pending = (async () => {
    const read = async (name: string): Promise<Record<string, unknown>> => {
      const response = await fetch(`https://torappu.prts.wiki/gamedata/latest/excel/${name}.json`, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Operator catalog unavailable');
      return await response.json() as Record<string, unknown>;
    };
    const [characters, patches] = await Promise.all([read('character_table'), read('char_patch_table')]);
    const patchChars = patches.patchChars;
    if (!characters || !patchChars || typeof patchChars !== 'object') throw new Error('Invalid operator catalog');
    const ids = new Set([...Object.keys(characters), ...Object.keys(patchChars)].filter(id => /^char_[A-Za-z0-9_]+$/.test(id)));
    if (ids.size < 100) throw new Error('Invalid operator catalog');
    catalog = ids; catalogAt = Date.now();
    return ids;
  })();
  try { return await pending; } finally { pending = undefined; }
}

export function createApp(store: SquadStore, options: { production?: boolean; operatorIds?: () => Promise<ReadonlySet<string>>; rateLimit?: number } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
    next();
  });
  const limits = new Map<string, { requests: number; writes: number; expires: number }>();
  app.use('/api', (req, res, next) => {
    const now = Date.now();
    // Bounded map, with expired buckets pruned on each request; no timers keep tests alive.
    for (const [key, value] of limits) if (value.expires <= now) limits.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    if (!limits.has(key) && limits.size >= 10000) { res.status(503).json({ error: 'Server busy. Please retry later.' }); return; }
    const bucket = limits.get(key) || { requests: 0, writes: 0, expires: now + 60000 };
    bucket.requests++;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) bucket.writes++;
    limits.set(key, bucket);
    if (bucket.requests > (options.rateLimit ?? 120) || bucket.writes > 15) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.expires - now) / 1000)))).status(429).json({ error: 'Too many requests. Please retry later.' }); return;
    }
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (['POST', 'DELETE', 'PUT', 'PATCH'].includes(req.method)) {
      const origin = req.get('origin');
      let sameOrigin = true;
      try { if (origin) sameOrigin = new URL(origin).host === req.get('host'); } catch { sameOrigin = false; }
      if (!sameOrigin || req.get('sec-fetch-site') === 'cross-site') { res.status(403).json({ error: 'Cross-site requests are not allowed.' }); return; }
    }
    next();
  });
  app.use('/api', express.json({ limit: '32kb', strict: true }));
  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.get('/api/squads', (req, res) => {
    if (req.query.season !== undefined && !validSeason(req.query.season)) { res.status(400).json({ error: 'Invalid season.' }); return; }
    const secret = ownerSecret(req);
    res.json({ items: store.list(secret ? hash(secret) : undefined, req.query.season as string | undefined) });
  });
  app.get('/api/squads/:id', (req, res) => {
    const secret = ownerSecret(req);
    const item = store.get(String(req.params.id), secret ? hash(secret) : undefined);
    if (!item) { res.status(404).json({ error: 'Squad not found.' }); return; }
    res.json({ item });
  });
  app.post('/api/squads', async (req, res, next) => {
    try {
      if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json.' }); return; }
      // Validate inexpensive schema before making remote requests.
      validateSquad(req.body);
      let ids: ReadonlySet<string>;
      try { ids = await (options.operatorIds || loadOperatorIds)(); }
      catch { res.status(503).json({ error: 'Operator data is temporarily unavailable. Please retry later.' }); return; }
      const input = validateSquad(req.body, ids);
      const existing = ownerSecret(req);
      const secret = existing || randomBytes(32).toString('hex');
      const item = store.create(input, hash(secret));
      if (!existing) res.cookie(COOKIE, secret, { httpOnly: true, sameSite: 'strict', secure: options.production ?? false, maxAge: COOKIE_AGE, path: '/api' });
      res.status(201).json({ item });
    } catch (error) { next(error); }
  });
  app.delete('/api/squads/:id', (req, res) => {
    const secret = ownerSecret(req);
    if (!secret) { res.status(403).json({ error: 'This browser does not own the squad.' }); return; }
    // Nonexistent IDs and other owners are indistinguishable; no public admin override.
    if (!store.deleteOwned(String(req.params.id), hash(secret))) { res.status(404).json({ error: 'Squad not found or not owned.' }); return; }
    res.status(204).end();
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found.' }); });
  if (options.production) {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist, { index: false, dotfiles: 'deny' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) { next(); return; }
      res.sendFile(resolve(dist, 'index.html'), error => { if (error) next(error); });
    });
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ValidationError) { res.status(400).json({ error: error.message }); return; }
    const typed = error as { type?: string; status?: number };
    if (typed.type === 'entity.too.large') { res.status(413).json({ error: 'Request body is too large.' }); return; }
    if (typed.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON.' }); return; }
    res.status(500).json({ error: 'Internal server error.' });
  });
  return app;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const host = process.env.HOST || '127.0.0.1';
  const store = new SquadStore(process.env.DB_PATH || fileURLToPath(new URL('../data/squads.sqlite', import.meta.url)));
  const server = createApp(store, { production: process.env.NODE_ENV === 'production' }).listen(port, host, () => {
    console.log(`Squad API listening on ${host}:${port}`);
  });
  const shutdown = () => server.close(() => { store.close(); process.exit(0); });
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Plan, SquadInput } from './validation.js';

export type Squad = SquadInput & { id: string; season: string; createdAt: number; owned: boolean };
type Row = { id: string; title: string; description: string; season: string; plan: string; created_at: number; owner_hash: string };
export class SquadStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS squads (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
        season TEXT NOT NULL, plan TEXT NOT NULL, created_at INTEGER NOT NULL,
        owner_hash TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS squads_season_created ON squads(season, created_at DESC);
      CREATE INDEX IF NOT EXISTS squads_created ON squads(created_at DESC);`);
  }
  private publicRow(row: Row, ownerHash?: string): Squad {
    return { id: row.id, title: row.title, description: row.description, season: row.season,
      plan: JSON.parse(row.plan) as Plan, createdAt: row.created_at, owned: !!ownerHash && row.owner_hash === ownerHash };
  }
  list(ownerHash?: string, season?: string): Squad[] {
    const rows = (season
      ? this.db.prepare('SELECT * FROM squads WHERE season = ? ORDER BY created_at DESC, id DESC LIMIT 200').all(season)
      : this.db.prepare('SELECT * FROM squads ORDER BY created_at DESC, id DESC LIMIT 200').all()) as Row[];
    return rows.map(row => this.publicRow(row, ownerHash));
  }
  get(id: string, ownerHash?: string): Squad | undefined {
    const row = this.db.prepare('SELECT * FROM squads WHERE id = ?').get(id) as Row | undefined;
    return row ? this.publicRow(row, ownerHash) : undefined;
  }
  create(input: SquadInput, ownerHash: string): Squad {
    const id = randomUUID();
    const createdAt = Date.now();
    this.db.prepare('INSERT INTO squads (id,title,description,season,plan,created_at,owner_hash) VALUES (?,?,?,?,?,?,?)')
      .run(id, input.title, input.description, input.plan.season, JSON.stringify(input.plan), createdAt, ownerHash);
    return { ...input, id, season: input.plan.season, createdAt, owned: true };
  }
  deleteOwned(id: string, ownerHash: string): boolean {
    return this.db.prepare('DELETE FROM squads WHERE id = ? AND owner_hash = ?').run(id, ownerHash).changes === 1;
  }
  close(): void { this.db.close(); }
}

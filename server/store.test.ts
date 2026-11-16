import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SquadStore } from './store.js';
import { validateSquad } from './validation.js';

const input = validateSquad({ title: 'A', description: '', plan: { version: 4, season: 'regulation_seq1', personnel: false, members: [{ uid: 'one', id: 'char_1_test', form: 0, cell: 0, zone: 'board' }] } });
test('SQLite persists, filters seasons, hides ownership hashes, and enforces owner delete', () => {
  const directory = mkdtempSync(join(tmpdir(), 'squad-store-'));
  const path = join(directory, 'squads.sqlite');
  let store = new SquadStore(path);
  try {
    const first = store.create(input, 'hash-a');
    store.create({ ...input, plan: { ...input.plan, season: 'season2' } }, 'hash-b');
    assert.equal(store.list('hash-a', 'regulation_seq1').length, 1);
    assert.equal(store.get(first.id, 'hash-a')?.owned, true);
    assert.equal(store.get(first.id, 'hash-b')?.owned, false);
    assert.ok(!JSON.stringify(store.list()).includes('hash-a'));
    assert.equal(store.deleteOwned(first.id, 'hash-b'), false);
    store.close(); store = new SquadStore(path);
    assert.equal(store.list().length, 2);
    assert.equal(store.deleteOwned(first.id, 'hash-a'), true);
    assert.equal(store.get(first.id), undefined);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from './index.js';
import { SquadStore } from './store.js';

const body = { title: 'Public squad', description: 'Test', plan: { version: 4, season: 'regulation_seq1', personnel: false, members: [{ uid: 'one', id: 'char_1_test', form: 0, cell: 0, zone: 'board' }] } };
test('REST ownership cookie, public read, validation, origin protection, size and safe failures', async () => {
  const store = new SquadStore(':memory:');
  const server = createApp(store, { operatorIds: async () => new Set(['char_1_test']) }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (value: unknown, headers = {}) => fetch(`${url}/api/squads`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) });
  try {
    assert.deepEqual(await (await fetch(`${url}/api/health`)).json(), { ok: true });
    const created = await post(body);
    assert.equal(created.status, 201);
    const setCookie = created.headers.get('set-cookie')!;
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=Strict/i);
    const cookie = setCookie.split(';')[0];
    const { item } = await created.json() as any;
    assert.equal(item.owned, true);
    assert.ok(!JSON.stringify(item).includes(cookie.split('=')[1]));
    const publicList = await (await fetch(`${url}/api/squads?season=regulation_seq1`)).json() as any;
    assert.equal(publicList.items[0].owned, false);
    const ownedList = await (await fetch(`${url}/api/squads`, { headers: { cookie } })).json() as any;
    assert.equal(ownedList.items[0].owned, true);
    assert.equal((await fetch(`${url}/api/squads/${item.id}`)).status, 200);
    assert.equal((await post({ ...body, owner: 'attacker' })).status, 400);
    assert.equal((await post(body, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post({ ...body, description: 'x'.repeat(40000) })).status, 413);
    assert.equal((await fetch(`${url}/api/squads/${item.id}`, { method: 'DELETE' })).status, 403);
    assert.equal((await fetch(`${url}/api/squads/${item.id}`, { method: 'DELETE', headers: { cookie: 'sp_plaza_owner=' + 'a'.repeat(64) } })).status, 404);
    assert.equal((await fetch(`${url}/api/squads/${item.id}`, { method: 'DELETE', headers: { cookie } })).status, 204);
    assert.equal((await fetch(`${url}/api/squads/${item.id}`)).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
test('rate limiting and unavailable operator catalog fail safely', async () => {
  const store = new SquadStore(':memory:');
  const server = createApp(store, { rateLimit: 2, operatorIds: async () => { throw new Error('private endpoint detail'); } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${url}/api/squads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes('private endpoint detail'));
    await fetch(`${url}/api/health`);
    assert.equal((await fetch(`${url}/api/health`)).status, 429);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});

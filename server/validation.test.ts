import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSquad } from './validation.js';

const ids = new Set(['char_1_test']);
const fixture = () => ({ title: 'Test', description: '', plan: { version: 4, season: 'regulation_seq1', personnel: false, members: [{ uid: 'one', id: 'char_1_test', form: 0, zone: 'board', cell: 0 }] } });
const pieces = (count: number, zone: string) => Array.from({ length: count }, (_, index) => ({ uid: `${zone}-${index}`, id: 'char_1_test', form: 0, zone, cell: zone === 'board' ? index : null }));
test('strict shape, catalog allowlist, and safe independent copies', () => {
  const body = fixture();
  assert.equal(validateSquad(body, ids).plan.members.length, 1);
  assert.throws(() => validateSquad({ ...body, owner: 'spoofed' }, ids));
  assert.throws(() => validateSquad({ ...body, plan: { ...body.plan, extra: true } }, ids));
  assert.throws(() => validateSquad(body, new Set()));
  assert.throws(() => validateSquad({ ...body, title: ' ' }, ids));
  assert.throws(() => validateSquad({ ...body, description: 'x'.repeat(501) }, ids));
  assert.throws(() => validateSquad({ ...body, plan: { ...body.plan, season: 'alliance' } }, ids));
  const output = validateSquad(body, ids); output.plan.members[0].uid = 'changed';
  assert.equal(body.plan.members[0].uid, 'one');
});
test('board 8/9 and reserve 10 capacities; duplicates of operator allowed but not uid/cell', () => {
  const body = fixture();
  const withMembers = (members: unknown[], personnel = false) => ({ ...body, plan: { ...body.plan, members, personnel } });
  assert.equal(validateSquad(withMembers([...pieces(8, 'board'), ...pieces(10, 'reserve')]), ids).plan.members.length, 18);
  assert.equal(validateSquad(withMembers([...pieces(9, 'board'), ...pieces(10, 'reserve')], true), ids).plan.members.length, 19);
  assert.throws(() => validateSquad(withMembers(pieces(9, 'board')), ids));
  assert.throws(() => validateSquad(withMembers([...pieces(1, 'board'), ...pieces(11, 'reserve')]), ids));
  assert.throws(() => validateSquad(withMembers(pieces(1, 'reserve')), ids));
  assert.throws(() => validateSquad(withMembers([body.plan.members[0], { ...body.plan.members[0], cell: 1 }]), ids));
  assert.throws(() => validateSquad(withMembers([body.plan.members[0], { ...body.plan.members[0], uid: 'two' }]), ids));
  assert.throws(() => validateSquad(withMembers([{ ...body.plan.members[0], zone: 'reserve' }]), ids));
  assert.throws(() => validateSquad(withMembers([{ ...body.plan.members[0], cell: 36 }]), ids));
  assert.throws(() => validateSquad(withMembers([{ ...body.plan.members[0], form: 2 }]), ids));
});

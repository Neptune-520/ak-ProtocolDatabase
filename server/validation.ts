export type Member = { uid: string; id: string; form: 0 | 1; cell: number | null; zone: 'board' | 'reserve' };
export type Plan = { version: 4; season: string; personnel: boolean; members: Member[] };
export type SquadInput = { title: string; description: string; plan: Plan };

export class ValidationError extends Error {}
function fail(message: string): never { throw new ValidationError(message); }
function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) fail(`${label} has invalid fields.`);
  return record;
}
export function validSeason(value: unknown): value is string {
  return value === 'regulation_seq1';
}
export function validateSquad(value: unknown, operatorIds?: ReadonlySet<string>): SquadInput {
  const input = object(value, ['title', 'description', 'plan'], 'Squad');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 60) fail('Title must contain 1–60 characters.');
  if (typeof input.description !== 'string' || input.description.length > 500) fail('Description must contain at most 500 characters.');
  const plan = object(input.plan, ['version', 'season', 'personnel', 'members'], 'Plan');
  if (plan.version !== 4 || !validSeason(plan.season) || typeof plan.personnel !== 'boolean') fail('Invalid plan version, season, or personnel setting.');
  if (!Array.isArray(plan.members) || plan.members.length > 19 || !plan.members.length) fail('Plan must contain 1–19 pieces.');
  const uids = new Set<string>();
  const cells = new Set<number>();
  let board = 0;
  let reserve = 0;
  const members: Member[] = plan.members.map((value: unknown) => {
    const member = object(value, ['uid', 'id', 'form', 'cell', 'zone'], 'Piece');
    if (typeof member.uid !== 'string' || !/^[A-Za-z0-9_:.-]{1,128}$/.test(member.uid) || uids.has(member.uid)) fail('Piece identifiers must be valid and unique.');
    if (typeof member.id !== 'string' || !/^char_[A-Za-z0-9_]{1,100}$/.test(member.id)) fail('Invalid operator identifier.');
    if (operatorIds && !operatorIds.has(member.id)) fail('Unknown operator identifier.');
    if (member.form !== 0 && member.form !== 1) fail('Invalid piece form.');
    if (member.zone === 'board') {
      if (typeof member.cell !== 'number' || !Number.isInteger(member.cell) || member.cell < 0 || member.cell >= 36 || cells.has(member.cell)) fail('Board positions must be unique integers from 0 to 35.');
      cells.add(member.cell);
      board++;
    } else if (member.zone === 'reserve') {
      if (member.cell !== null) fail('Reserve pieces cannot occupy board cells.');
      reserve++;
    } else fail('Invalid piece zone.');
    uids.add(member.uid);
    return { uid: member.uid, id: member.id, form: member.form, cell: member.cell as number | null, zone: member.zone };
  });
  if (!board || board > (plan.personnel ? 9 : 8) || reserve > 10) fail('Board capacity is 8 (9 with personnel); reserve capacity is 10. At least one board piece is required.');
  return { title: input.title.trim(), description: input.description.trim(), plan: { version: 4, season: plan.season, personnel: plan.personnel, members } };
}

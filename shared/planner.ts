import type { Operator, Piece, Member, Database, CatalogBond, RawBond } from './types';
// 展示数据始终来自当前活动期；格子编号按从左到右、从上到下排列。
export function resolveMembers(draft: Array<Partial<Piece>> | null, opList: Record<string,Operator> = {}): Member[] {
  const seen = new Set<string>();
  const cells = new Set<number>();
  return (Array.isArray(draft) ? draft : []).flatMap(item => {
    const op = item?.id ? opList[item.id] : undefined;
    if (!op || seen.has(item.uid || op.id)) return [];
    const form = item.form === 1 && op.chess[1] ? 1 : 0;
    if (!op.chess[form]) return [];
    let cell = typeof item.cell === 'number' && Number.isInteger(item.cell) && item.cell >= 0 && item.cell < 36 ? item.cell : null;
    if (cell !== null && cells.has(cell)) cell = null;
    if (cell !== null) cells.add(cell);
    seen.add(item.uid || op.id);
    return [{ op, form: form as 0|1, cell, uid: item.uid || op.id, id: op.id, zone: item.zone || 'board', chess: op.chess[form] }];
  });
}

export function summarizeBonds(members: Member[]) {
  const result = new Map<string,{id:string;name:string;count:number;members:string[]}>();
  const counted = new Set();
  members.forEach(({ op, chess }) => {
    const seen = new Set();
    chess.bonds.forEach(bond => {
      if (seen.has(bond.id) || counted.has(`${op.id}:${bond.id}`)) return;
      counted.add(`${op.id}:${bond.id}`);
      seen.add(bond.id);
      if (!result.has(bond.id)) result.set(bond.id, { id: bond.id, name: bond.name, count: 0, members: [] });
      const item = result.get(bond.id)!;
      item.count++;
      item.members.push(op.name);
    });
  });
  return [...result.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

// 保留条件括号与换行，仅移除游戏样式标记；通过文本插值展示，不执行 HTML。
export function bondText(text: string = '') {
  return text.replace(/<@[^>]+>|<\/>/g, '');
}

export function bondThresholds(raw: RawBond = {}) {
  const values = [Number(raw.activeCount)];
  // 进阶人数位于描述的“在场 N 名”条件中；层数、伤害和装备数量不能当作人数。
  for (const match of bondText(raw.desc).matchAll(/在场\s*(\d+)\s*名/g)) values.push(Number(match[1]));
  return [...new Set(values.filter(value => Number.isInteger(value) && value > 0))].sort((a, b) => a - b);
}

export function buildBondCatalog(database: Database): CatalogBond[] {
  const meta = database.extra?.bondInfoDict || {};
  const raw = database.season?.bondInfoDict || {};
  const ids = new Set(Object.values(database.opList || {}).flatMap(op => op.chess.flatMap(form => form.bonds.map(b => b.id))));
  Object.entries(raw).forEach(([id, info]) => { if (info.activeConditionTemplate === 'count_threshold_upward_golden') ids.add(id); });
  return [...ids].map(id => ({
    id, name: meta[id]?.name || raw[id]?.name || id,
    type: meta[id]?.bondType === 'SEASON' ? 'SEASON' : 'REGULAR',
    raw: raw[id] || {}, description: bondText(raw[id]?.desc || '当前数据没有提供盟约效果。'),
    thresholds: bondThresholds(raw[id]),
  }));
}

export function previewBonds(catalog: CatalogBond[], members: Member[]) {
  const fieldMembers = members.filter(m => m.zone !== 'reserve');
  const counts = new Map(summarizeBonds(fieldMembers).map(item => [item.id, item.count]));
  const harmony = catalog.find(b => b.raw.activeType === 'MANI');
  const harmonyActive = harmony && (counts.get(harmony.id) || 0) >= (harmony.thresholds[0] || Infinity);
  return catalog.map(bond => {
    const golden = bond.raw.activeConditionTemplate === 'count_threshold_upward_golden';
    const reserveCounts = ['miraShip', 'investShip', 'visiShip'].includes(bond.id);
    const matching = members.filter(m => (m.zone !== 'reserve' || reserveCounts) && (golden ? m.form === 1 : m.chess.bonds.some(b => b.id === bond.id)));
    const count = new Set(matching.map(m => m.op.id)).size;
    const bonus = harmonyActive && bond.type === 'SEASON' && count > 0 ? 1 : 0;
    const effectiveCount = count + bonus;
    const downward = bond.raw.activeConditionTemplate === 'count_threshold_downward';
    const upper = Number(bond.raw.activeParamList?.[1]) || (bond.thresholds[0] || 0) + 1;
    const active = bond.thresholds.length > 0 && effectiveCount >= bond.thresholds[0] && (!downward || effectiveCount < upper);
    const target = downward ? bond.thresholds[0] : (bond.thresholds.find(n => n > effectiveCount) || bond.thresholds.at(-1));
    return { ...bond, count, bonus, effectiveCount, active, target, matchingIds: matching.map(m => m.op.id), maxed: active && !bond.thresholds.some(n => n > effectiveCount) };
  }).sort((a, b) => Number(b.active) - Number(a.active) || b.effectiveCount - a.effectiveCount || a.name.localeCompare(b.name, 'zh-CN'));
}

// 旧草稿先保留有效落位，再把未落位成员放入棋盘空位；超出的旧成员迁入整备区，绝不静默删除。
export function normalizeRoster(draft: Array<Partial<Piece>>, opList: Record<string,Operator>, capacity = 8) {
  const resolved = resolveMembers(draft, opList);
  const ordered = [...resolved.filter(m => m.zone !== 'reserve' && m.cell !== null), ...resolved.filter(m => m.zone !== 'reserve' && m.cell === null)];
  const onBoard = ordered.slice(0, capacity);
  const reserve = [...resolved.filter(m => m.zone === 'reserve'), ...ordered.slice(capacity)];
  const used = new Set(onBoard.filter(m => m.cell !== null).map(m => m.cell));
  const boardIds = new Set(onBoard.map(m => m.uid || m.op.id));
  const list: Piece[] = resolved.map(m => {
    if (!boardIds.has(m.uid || m.op.id)) return { id: m.op.id, uid: m.uid, form: m.form, cell: null, zone: 'reserve' };
    let cell = m.cell;
    if (cell === null) { cell = Array.from({ length: 36 }, (_, i) => i).find(i => !used.has(i))!; used.add(cell); }
    return { id: m.op.id, uid: m.uid, form: m.form, cell, zone: 'board' };
  });
  return { members: list, overflow: reserve.length > 10 };
}

export function moveRoster(members: Member[], id:string, zone:'board'|'reserve', capacity = 8, targetCell:number|null = null): Piece[] {
  const next: Piece[] = members.map(m => ({ id: m.op.id, uid: m.uid, form: m.form, cell: m.cell, zone: m.zone || 'board' }));
  const moving = next.find(m => (m.uid || m.id) === id);
  if (!moving) throw new Error('干员不在当前阵容。');
  if (zone === 'reserve') {
    if (moving.zone !== 'reserve' && next.filter(m => m.zone === 'reserve').length >= 10) throw new Error('整备区已满（10/10）。');
    moving.zone = 'reserve'; moving.cell = null;
    return next;
  }
  if (zone !== 'board') throw new Error('无效区域。');
  if (targetCell !== null && (!Number.isInteger(targetCell) || targetCell < 0 || targetCell >= 36)) throw new Error('无效地图位置。');
  const occupant = next.find(m => m.zone === 'board' && m.cell === targetCell && (m.uid || m.id) !== id);
  if (moving.zone !== 'board' && !occupant && next.filter(m => m.zone === 'board').length >= capacity) throw new Error(`棋盘已满（${capacity}/${capacity}），请先移出成员。`);
  const source = moving.zone === 'board' ? moving.cell : null;
  if (occupant) { occupant.zone = moving.zone; occupant.cell = source; }
  moving.zone = 'board';
  moving.cell = targetCell ?? (source ?? Array.from({ length: 36 }, (_, i) => i).find(i => !next.some(m => (m.uid || m.id) !== id && m.zone === 'board' && m.cell === i)))!;
  return next;
}

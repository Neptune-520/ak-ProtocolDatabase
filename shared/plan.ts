import type { Plan, Piece } from './types';
export function validatePlan(input:unknown):Plan {
  const p=input as Plan;
  if(!p||p.version!==4||typeof p.season!=='string'||typeof p.personnel!=='boolean'||!Array.isArray(p.members)||p.members.length>19) throw new Error('无效阵容格式，请使用版本 4 的导出文件');
  if(p.season!=='regulation_seq1') throw new Error('新版仅支持规程阵容');
  const uids=new Set<string>(), cells=new Set<number>();
  for(const m of p.members) {
    if(!m||typeof m.id!=='string'||typeof m.uid!=='string'||!m.uid||uids.has(m.uid)||![0,1].includes(m.form)||!['board','reserve'].includes(m.zone)) throw new Error('棋子数据无效或标识重复');
    if(m.zone==='reserve'?m.cell!==null:(!Number.isInteger(m.cell)||m.cell!<0||m.cell!>=36||cells.has(m.cell!))) throw new Error('位置无效或重复');
    uids.add(m.uid);if(m.cell!==null)cells.add(m.cell);
  }
  if(p.members.filter(m=>m.zone==='board').length>(p.personnel?9:8)||p.members.filter(m=>m.zone==='reserve').length>10) throw new Error('阵容人数超过上限');
  return {version:4,season:p.season,personnel:p.personnel,members:p.members.map(({id,uid,form,cell,zone}):Piece=>({id,uid,form,cell,zone}))};
}

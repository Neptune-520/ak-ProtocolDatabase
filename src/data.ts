import md5 from 'md5';
import type { Database, Operator } from '../shared/types';
export const seasons = [
  {key:'regulation_seq1',name:'规程 · 序列 I',code:'act3autochess',version:'V3_1'},
];
const endpoint='https://torappu.prts.wiki/gamedata/latest/excel/';
async function json(url:string) { const r=await fetch(url,{signal:AbortSignal.timeout(30000)}); if(!r.ok) throw new Error(`数据请求失败 ${r.status}`); return r.json(); }
let characters:Promise<any[]>|undefined;
const cache=new Map<string,Database>();
export async function loadDatabase(key:string):Promise<Database> {
  if(cache.has(key)) return cache.get(key)!;
  const config=seasons.find(s=>s.key===key);
  if(!config) throw new Error('新版仅支持规程');
  characters ??= Promise.all([json(endpoint+'character_table.json'),json(endpoint+'char_patch_table.json')]).catch(e=>{characters=undefined;throw e;});
  const [[ops,patch],activity]=await Promise.all([characters,json(endpoint+'activity_table.json')]);
  const season=activity.activity.AUTOCHESS[config.code][config.version];
  if(!season) throw new Error('当前接口不包含所选活动期');
  const opList:Record<string,Operator>={};
  const professions:Record<string,string>={PIONEER:'先锋',WARRIOR:'近卫',SNIPER:'狙击',SUPPORT:'辅助',CASTER:'术师',SPECIAL:'特种',MEDIC:'医疗',TANK:'重装'};
  for(const chess of Object.values(season.charChessDataDict) as any[]) {
    if(chess.chessId.includes('diy')||!chess.upgradeChessId) continue;
    const shop=season.charShopChessDatas[chess.chessId]; if(!shop) continue;
    const id=shop.tmplId||shop.charId;
    if(shop.isHidden&&!['char_616_pithst','char_618_acrbot'].includes(id)) continue;
    const op=shop.tmplId?patch.patchChars[id]:ops[id]; if(!op) continue;
    opList[id]={id,name:op.name,rarity:op.rarity,profession:professions[op.profession],chess:[chess,season.charChessDataDict[chess.upgradeChessId]].map(c=>({rank:shop.chessLevel,bonds:c.bondIds.map((id:string)=>({id,name:activity.autoChessData.bondInfoDict[id].name})),description:c.desc}))};
  }
  const db:Database={opList,season,extra:activity.autoChessData};cache.set(key,db);return db;
}
export const ranks=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ'];
export const rankColors=['#c5c5c5','#ffffff','#46efbc','#33c9da','#f6c60f','#e88c1a'];
export function avatar(id:string) {return `https://torappu.prts.wiki/assets/char_avatar/${id==='char_1037_amiya3'?'char_1037_amiya3_2':id}.png`;}
export function image(name:string) {const hash=md5(name);return `https://media.prts.wiki/${hash[0]}/${hash.slice(0,2)}/${name}`;}

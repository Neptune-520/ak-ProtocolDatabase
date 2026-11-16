export interface Bond { id:string; name:string }
export interface Chess { rank:number; bonds:Bond[]; description?:string }
export interface Operator { id:string; name:string; profession:string; rarity:string; chess:Chess[] }
export interface Piece { id:string; uid:string; form:0|1; cell:number|null; zone:'board'|'reserve' }
export interface Member extends Piece { op:Operator; chess:Chess }
export interface RawBond { name?:string; activeCount?:number; desc?:string; activeConditionTemplate?:string; activeParamList?:string[]; activeType?:string }
export interface CatalogBond { id:string; name:string; type:string; raw:RawBond; description:string; thresholds:number[] }
export interface Database { opList:Record<string,Operator>; season:{bondInfoDict:Record<string,RawBond>}; extra:{bondInfoDict:Record<string,{name:string;bondType:string}>} }
export interface Plan { version:4; season:string; personnel:boolean; members:Piece[] }
export interface PlazaItem { id:string; title:string; description:string; season:string; plan:Plan; createdAt:number; owned:boolean }

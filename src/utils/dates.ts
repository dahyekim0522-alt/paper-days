export function dateKey(d = new Date()):string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function validDate(value:unknown): value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d]=value.split('-').map(Number); const dt=new Date(y,m-1,d,12);
  return y>=1900&&y<=2100&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
}
export function parseDate(s:string) { return validDate(s)?new Date(`${s}T12:00:00`):new Date(); }
export function addDays(s:string,n:number) { const d=parseDate(s); d.setDate(d.getDate()+n); return dateKey(d); }
export function dateLabel(s:string) {return parseDate(s).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'});}
// Fixed bounded window: each date occupies a two-page spread. Dates never depend on entry count.
export function pageWindow(anchor:string) {return [-1,0,1].flatMap(offset=>{const date=addDays(anchor,offset);return [{date,side:'text' as const},{date,side:'photos' as const}];});}
export function dateAtPage(anchor:string,index:number) {return addDays(anchor,Math.floor(Math.max(0,Math.min(5,index))/2)-1);}

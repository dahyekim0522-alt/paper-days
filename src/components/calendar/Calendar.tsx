import { useState } from 'react';
import { ChevronLeft,ChevronRight } from 'lucide-react';
import type { DiaryEntry } from '../../models/diary';
import { dateKey,parseDate } from '../../utils/dates';
export default function Calendar({selected,entries,onSelect,compact=false}:{selected:string;entries:DiaryEntry[];onSelect:(date:string)=>void;compact?:boolean}) {
 const [month,setMonth]=useState(()=>new Date(parseDate(selected).getFullYear(),parseDate(selected).getMonth(),1));
 const dates=new Set(entries.map(e=>e.date));const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const shift=(n:number)=>setMonth(new Date(month.getFullYear(),month.getMonth()+n,1));
 return <section className={compact?'calendar compact':'calendar'} aria-label="기록 달력"><div className="calendar-heading"><button className="icon-button" aria-label="이전 달" onClick={()=>shift(-1)}><ChevronLeft size={17}/></button><h3>{month.getFullYear()}년 {month.getMonth()+1}월</h3><button className="icon-button" aria-label="다음 달" onClick={()=>shift(1)}><ChevronRight size={17}/></button></div><div className="calendar-grid">{['일','월','화','수','목','금','토'].map((d,i)=><span className={'weekday day-'+i} key={d}>{d}</span>)}{Array.from({length:month.getDay()},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=dateKey(new Date(month.getFullYear(),month.getMonth(),i+1));return <button key={date} aria-label={`${date}${dates.has(date)?' 기록 있음':''}`} aria-current={date===dateKey()?'date':undefined} aria-pressed={date===selected} className={`${date===selected?'selected':''} ${dates.has(date)?'has-entry':''}`} onClick={()=>onSelect(date)}>{i+1}<i/></button>;})}</div><div className="calendar-foot"><span><i/> 기록이 있는 날</span><button className="text-button" onClick={()=>{setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1));onSelect(dateKey());}}>오늘로</button></div></section>;
}

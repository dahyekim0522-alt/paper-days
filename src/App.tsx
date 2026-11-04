import { useCallback,useEffect,useRef,useState } from 'react';
import { BookOpen,CalendarDays,Search as SearchIcon,Settings as SettingsIcon,PenLine,ChevronLeft,ChevronRight,ArrowUpRight,Leaf,Check,Menu,X } from 'lucide-react';
import { db,newEntry } from './db/database';
import type { DiaryEntry,Photo,Draft } from './models/diary';
import { dateKey,dateLabel,validDate } from './utils/dates';
import Book,{type BookHandle} from './components/book/Book';
import Editor from './components/diary/Editor';
import Calendar from './components/calendar/Calendar';
import Search from './components/search/Search';
import Settings from './components/settings/Settings';
import Modal from './components/common/Modal';
import PWAStatus from './components/pwa/PWAStatus';

type Panel='calendar'|'search'|'settings'|null;
export default function App(){
 const [opened,setOpened]=useState(false),[opening,setOpening]=useState(false),[selected,setSelected]=useState(dateKey()),[side,setSide]=useState(0),[entries,setEntries]=useState<DiaryEntry[]>([]),[photos,setPhotos]=useState<Photo[]>([]),[panel,setPanel]=useState<Panel>(null),[draft,setDraft]=useState<Draft|null>(null),[original,setOriginal]=useState<Draft|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[mobileNav,setMobileNav]=useState(false);
 const controls=useRef<BookHandle|null>(null);
 const refresh=useCallback(async()=>{try{const e=await db.entries.toArray();setEntries(e.filter(x=>validDate(x.date)));setError('');}catch{setError('브라우저 저장소를 열 수 없어요. 비공개 모드나 저장소 권한을 확인하고 다시 시도해 주세요.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{let active=true;const start=new Date(`${selected}T12:00:00`);start.setDate(start.getDate()-1);const end=new Date(`${selected}T12:00:00`);end.setDate(end.getDate()+1);const ids=entries.filter(e=>e.date>=dateKey(start)&&e.date<=dateKey(end)).map(e=>e.id);void db.photos.where('entryId').anyOf(ids).toArray().then(p=>{if(active)setPhotos(p);}).catch(()=>{if(active)setError('사진을 불러오지 못했어요.');});return()=>{active=false;};},[entries,selected]);
 const select=(date:string,nextSide=0)=>{if(!validDate(date))return;setSelected(date);setSide(nextSide);setPanel(null);setMobileNav(false);setOpened(true);};
 const edit=async(date=selected)=>{try{const entry=await db.entries.where('date').equals(date).first();const savedPhotos=entry?await db.photos.where('entryId').equals(entry.id).toArray():[];setOriginal(entry?{entry,photos:savedPhotos}:null);const savedDraft=await db.drafts.get(date);let initial:Draft=savedDraft?{...savedDraft,entry:{...savedDraft.entry,updatedAt:'recovered'}}:{entry:entry??newEntry(date),photos:savedPhotos};
   try{const raw=localStorage.getItem(`paper-days-draft:${date}`);if(raw){const cached=JSON.parse(raw);if(cached.date===date&&typeof cached.title==='string'&&typeof cached.content==='string'&&(!entry||cached.updatedAt>=entry.updatedAt||savedDraft))initial={...initial,entry:{...initial.entry,title:cached.title,content:cached.content,mood:cached.mood,updatedAt:'recovered'}};}}catch{/* corrupt optional recovery cache */}
   setDraft(initial);
  }catch{setError('편집할 기록을 열지 못했어요. 저장소 접근 권한을 확인해 주세요.');}};
 const openBook=()=>{if(opening)return;setOpening(true);setTimeout(()=>{setOpened(true);setOpening(false);},matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);};
 return <div className="app-shell">
  <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
   <a className="brand" href="#" onClick={e=>{e.preventDefault();setOpened(false);setMobileNav(false);}} aria-label="Paper Days 표지로"><BookOpen size={24} strokeWidth={1.3}/><span>Paper Days<small>차곡차곡, 나의 날들</small></span></a>
   <button className="icon-button close-menu" aria-label="메뉴 닫기" onClick={()=>setMobileNav(false)}><X/></button>
   <div className="sidebar-label">MY LITTLE DIARY</div>
   <nav aria-label="주 메뉴"><button className={panel===null?'active':''} onClick={()=>{setPanel(null);setMobileNav(false);setOpened(true);}}><BookOpen size={18}/>나의 다이어리<span className="nav-dot"/></button><button className={panel==='calendar'?'active':''} onClick={()=>{setPanel('calendar');setMobileNav(false);}}><CalendarDays size={18}/>달력으로 보기</button><button className={panel==='search'?'active':''} onClick={()=>{setPanel('search');setMobileNav(false);}}><SearchIcon size={18}/>기록 찾기</button></nav>
   <div className="sidebar-calendar"><Calendar key={selected.slice(0,7)} compact selected={selected} entries={entries} onSelect={select}/></div>
   <div className="sidebar-note"><Leaf size={21} strokeWidth={1.3}/><p>평범한 하루도<br/>기록하면 특별해져요.</p><span>one day, one page.</span></div>
   <button className="settings-link" onClick={()=>{setPanel('settings');setMobileNav(false);}}><SettingsIcon size={18}/>설정 및 백업<ArrowUpRight size={14}/></button><div className="local-status"><span/>이 브라우저에 안전하게 저장돼요</div>
  </aside>
  <main>
   <header className="topbar"><button className="icon-button mobile-menu" aria-label="메뉴 열기" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">나의 다이어리 <span>/</span> <strong>{selected.slice(0,4)}</strong></div><div className="topbar-right"><span><span className="status-dot"/> 나만 볼 수 있는 작은 공간</span><button className="avatar" aria-label="설정 열기" onClick={()=>setPanel('settings')}>나</button></div></header>
   <div className="workspace">
    <div className="workspace-heading"><div><div className="eyebrow">A LITTLE RECORD OF MY DAYS</div><h1>나의 하루를 담는 책<span>.</span></h1><p>지나가는 순간을 붙잡아, 오래 꺼내 볼 수 있도록.</p></div><button className="button primary write-today" disabled={loading||!!error} onClick={()=>{select(dateKey());void edit(dateKey());}}><PenLine size={17}/>오늘 기록하기</button></div>
    <PWAStatus editing={!!draft}/>
    {error&&<div className="error" role="alert">{error}<button onClick={()=>void refresh()}>다시 시도</button></div>}
    {loading?<div className="loading" role="status">다이어리를 꺼내고 있어요…</div>:<>
     <div className="book-toolbar"><span><span className="tiny-square"/>{opened?dateLabel(selected):`${selected.slice(0,4)}년, 당신의 이야기가 시작되는 곳`}</span><span className="toolbar-count">{entries.length}일의 기록 <span>·</span> {selected.slice(0,4)}</span></div>
     <div className={`diary-surface ${opened?'is-open':''}`}>
      {!opened?<div className={`cover-scene ${opening?'opening':''}`}><div className="cover-under"/><button className="diary-cover" aria-label="다이어리 열기" onClick={openBook}><div className="cover-spine"/><div className="cover-border"><span className="cover-top">A COLLECTION OF ORDINARY MOMENTS</span><div className="cover-title"><span>my little diary</span><h2>Paper<br/>Days<span>✳</span></h2><div className="cover-rule"/><p>차곡차곡, 나의 날들</p></div><svg className="cover-botanical" viewBox="0 0 180 150" fill="none" aria-hidden="true"><path d="M90 140Q70 70 110 10M90 138Q120 90 151 55M88 128Q55 98 26 92"/><path d="M97 79Q55 75 72 45Q101 50 97 79ZM100 55Q132 44 130 22Q103 24 100 55ZM113 104Q113 73 141 75Q141 99 113 104ZM67 111Q65 82 42 75Q32 99 67 111ZM90 116Q64 104 72 83Q96 85 90 116Z"/></svg><span className="cover-year">{selected.slice(0,4)}</span><span className="cover-bottom">EVERY DAY IS A PAGE WORTH KEEPING.</span></div><span className="cover-open">다이어리 열기 <ArrowUpRight size={16}/></span></button><div className="ribbon"/></div>:<Book date={selected} side={side} entries={entries} photos={photos} onTurn={select} controls={controls}/>}
     </div>
     <div className="below-book">{opened?<><button className="page-nav" aria-label="이전 페이지" onClick={()=>controls.current?.prev()}><ChevronLeft size={18}/><span>이전 페이지</span></button><button className="text-button edit-page" onClick={()=>void edit()}><PenLine size={16}/>이 날의 기록 {entries.some(e=>e.date===selected)?'수정':'쓰기'}</button><button className="page-nav" aria-label="다음 페이지" onClick={()=>controls.current?.next()}><span>다음 페이지</span><ChevronRight size={18}/></button></>:<p className="cover-hint"><span>↗</span> 표지를 눌러, 오늘의 이야기를 펼쳐 보세요</p>}</div>
     <div className="workspace-footer"><span><Check size={14}/> 모든 이야기는 이 기기에만 남아요</span><span>Made for your everyday moments <Leaf size={14}/></span></div>
    </>}
   </div>
  </main>
  {panel&&<Modal title={panel==='calendar'?'날짜로 꺼내 보는 기억':panel==='search'?'기억 속 한 문장 찾기':'나의 기록 보관함'} onClose={()=>setPanel(null)}>{panel==='calendar'?<Calendar selected={selected} entries={entries} onSelect={select}/>:panel==='search'?<Search entries={entries} onSelect={select}/>:<Settings onRestored={refresh}/>}</Modal>}
  {draft&&<Editor key={draft.entry.date} initial={draft} original={original} onClose={()=>setDraft(null)} onSaved={refresh} onDateChange={async date=>{select(date);await edit(date);}}/>}
 </div>;
}

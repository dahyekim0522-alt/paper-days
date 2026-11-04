import { useEffect,useRef,useState } from 'react';
import { Check, ImagePlus, Trash2, LoaderCircle, Save } from 'lucide-react';
import Modal from '../common/Modal';
import PhotoImage from '../common/PhotoImage';
import { db, saveEntry, deleteEntry } from '../../db/database';
import { moods, type Draft } from '../../models/diary';
import { preparePhoto } from '../../utils/photos';

export default function Editor({initial,original,onClose,onSaved,onDateChange}:{initial:Draft;original:Draft|null;onClose:()=>void;onSaved:()=>Promise<void>;onDateChange:(date:string)=>Promise<void>}) {
 const [draft,setDraft]=useState(initial),[status,setStatus]=useState('저장 완료'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const latest=useRef(initial),revision=useRef(0),savedRevision=useRef(0),queue=useRef(Promise.resolve()),mounted=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const safeSet=(message:string)=>{if(mounted.current)setStatus(message);};
 const save=async()=>{
   clearTimeout(timer.current);const snapshot=latest.current;const rev=revision.current;
   if(rev===savedRevision.current)return true;
   safeSet('저장 중');
   const task=queue.current.catch(()=>{}).then(async()=>{
     await saveEntry({...snapshot.entry,updatedAt:new Date().toISOString()},snapshot.photos);
     savedRevision.current=rev;
     if(revision.current===rev){safeSet('저장 완료');if(mounted.current){setDirty(false);setError(current=>current.startsWith('저장 공간')||current.startsWith('임시 보관')?'':current);}try{localStorage.removeItem(`paper-days-draft:${snapshot.entry.date}`);}catch{/* optional recovery cache */}}
     await onSaved();
   });queue.current=task;
   try{await task;return true;}catch{safeSet('저장 실패');if(mounted.current)setError('저장 공간 또는 브라우저 권한을 확인해 주세요. 입력 내용은 이 창에 보존되어 있어요. 다시 저장해 주세요.');return false;}
 };
 const saveRef=useRef(save);saveRef.current=save;
 const update=(next:Draft)=>{
   next={...next,entry:{...next.entry,updatedAt:new Date().toISOString()}};
   latest.current=next;revision.current++;setDraft(next);setDirty(true);setStatus('저장 대기');
   try{localStorage.setItem(`paper-days-draft:${next.entry.date}`,JSON.stringify(next.entry));}catch{/* IndexedDB draft remains primary */}
   // Serialize recovery writes with saves, so an old write cannot resurrect a cleared draft.
   queue.current=queue.current.catch(()=>{}).then(async()=>{await db.drafts.put(next);}).catch(()=>{if(mounted.current)setError('임시 보관에 실패했어요. 창을 닫기 전에 저장해 주세요.');});
   clearTimeout(timer.current);timer.current=setTimeout(()=>{void saveRef.current();},800);
 };
 useEffect(()=>{mounted.current=true;const prevent=(e:BeforeUnloadEvent)=>{if(revision.current!==savedRevision.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>{mounted.current=false;clearTimeout(timer.current);window.removeEventListener('beforeunload',prevent);};},[]);
 // Recovered drafts are unsaved, and should be committed even when the user just closes the editor.
 useEffect(()=>{if(initial.entry.updatedAt==='recovered'){update({...initial,entry:{...initial.entry,updatedAt:new Date().toISOString()}});}},[]);
 const cancel=async()=>{
   if(busy)return;
   if(revision.current===0){onClose();return;}
   if(!confirm('이 편집창에서 바꾼 내용을 취소하고, 열기 전 기록으로 되돌릴까요? 자동 저장된 변경도 되돌려요.'))return;
   setBusy(true);clearTimeout(timer.current);
   try{await queue.current.catch(()=>{});if(original)await saveEntry(original.entry,original.photos);else await deleteEntry(latest.current.entry);try{localStorage.removeItem(`paper-days-draft:${latest.current.entry.date}`);}catch{/* optional cache */}savedRevision.current=revision.current;await onSaved();onClose();}catch{setError('변경을 취소하지 못했어요. 다시 시도하거나 저장해 주세요.');setBusy(false);}
 };
 const finish=async()=>{if(busy)return;setBusy(true);if(await save())onClose();else setBusy(false);};
 const attach=async(files:FileList|null)=>{
   if(!files)return;setBusy(true);setError('');
   try{if(latest.current.photos.length+files.length>8)throw new Error('하루에 사진을 최대 8장 첨부할 수 있어요.');
     const added=[];for(const f of Array.from(files))added.push(await preparePhoto(f,latest.current.entry.id));
     update({...latest.current,photos:[...latest.current.photos,...added]});
   }catch(e){setError(e instanceof Error?e.message:'사진을 첨부하지 못했어요.');}finally{setBusy(false);}
 };
 return <Modal title="오늘의 마음을 적어요" onClose={()=>void finish()} wide>
   <div className="editor-meta"><label>기록할 날짜<input aria-label="기록할 날짜" type="date" min="1900-01-01" max="2100-12-31" value={draft.entry.date} disabled={busy} onChange={async e=>{const date=e.target.value;if(!date)return;setBusy(true);if(await save())await onDateChange(date);setBusy(false);}}/></label><span className="save-state" role="status">{status==='저장 중'?<LoaderCircle size={15}/>:<Check size={15}/>} {status}</span></div>
   <label className="field">제목 <span className="muted">선택</span><input autoFocus maxLength={120} value={draft.entry.title} placeholder="오늘은 어떤 하루였나요?" onChange={e=>update({...draft,entry:{...draft.entry,title:e.target.value}})}/></label>
   <fieldset className="moods"><legend>오늘의 기분</legend>{moods.map(m=><button type="button" key={m.id} aria-pressed={draft.entry.mood===m.id} onClick={()=>update({...draft,entry:{...draft.entry,mood:m.id}})}><span>{m.icon}</span>{m.label}</button>)}</fieldset>
   <label className="field">오늘의 이야기<textarea rows={9} maxLength={200000} value={draft.entry.content} placeholder={'잊고 싶지 않은 작은 순간부터,\n여기에 천천히 남겨 보세요.'} onChange={e=>update({...draft,entry:{...draft.entry,content:e.target.value}})}/></label>
   <div className="attachment-row"><label className="button secondary upload"><ImagePlus size={17}/>사진 첨부<input aria-label="사진 첨부" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{void attach(e.target.files);e.target.value='';}}/></label><span className="muted">{draft.photos.length}/8 · 장당 20MB 이하</span></div>
   <div className="editor-photos">{draft.photos.map(p=><div key={p.id}><PhotoImage photo={p}/><button aria-label={`${p.name} 사진 삭제`} onClick={()=>update({...draft,photos:draft.photos.filter(x=>x.id!==p.id)})}><Trash2 size={16}/></button></div>)}</div>
   {error&&<div className="error" role="alert">{error}<button onClick={()=>void save()}>다시 저장</button></div>}
   <div className="editor-footer"><button className="text-button danger" disabled={busy} onClick={async()=>{if(!confirm('이 날짜의 일기와 사진을 삭제할까요? 되돌릴 수 없어요.'))return;setBusy(true);clearTimeout(timer.current);try{await queue.current.catch(()=>{});await deleteEntry(latest.current.entry);localStorage.removeItem(`paper-days-draft:${draft.entry.date}`);savedRevision.current=revision.current;await onSaved();onClose();}catch{setError('삭제하지 못했어요. 다시 시도해 주세요.');setBusy(false);}}}><Trash2 size={16}/>기록 삭제</button><div><button className="button secondary" disabled={busy} onClick={()=>void cancel()}>취소</button><button className="button primary" disabled={busy} onClick={()=>void finish()}><Save size={16}/>{dirty?'저장하고 닫기':'완료'}</button></div></div>
   <p className="small-note">입력은 자동 저장돼요. 닫기는 저장 후 이동해요. 취소는 편집창을 열기 전 상태로 되돌려요.</p>
 </Modal>;
}

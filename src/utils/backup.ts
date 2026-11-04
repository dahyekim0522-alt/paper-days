import { db, type DiaryDatabase } from '../db/database';
import type { DiaryEntry, Photo } from '../models/diary';
import { moods } from '../models/diary';
import { validDate } from './dates';
interface BackupPhoto extends Omit<Photo,'blob'> {data:string}
export interface Backup {version:1;exportedAt:string;entries:DiaryEntry[];photos:BackupPhoto[]}
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object';
const iso=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validateBackup(raw:unknown):Backup {
  if(!isObject(raw)||raw.version!==1||!Array.isArray(raw.entries)||!Array.isArray(raw.photos)||raw.entries.length>50000||raw.photos.length>100000)throw new Error('지원하는 Paper Days 백업 파일이 아닙니다.');
  const dates=new Set<string>(),ids=new Set<string>(),photoIds=new Set<string>();
  for(const e of raw.entries){
    if(!isObject(e)||typeof e.id!=='string'||!e.id||!validDate(e.date)||dates.has(e.date)||ids.has(e.id)||typeof e.title!=='string'||typeof e.content!=='string'||e.content.length>200000||!moods.some(m=>m.id===e.mood)||!iso(e.createdAt)||!iso(e.updatedAt)||!Array.isArray(e.photoIds)||e.photoIds.some(p=>typeof p!=='string')||new Set(e.photoIds).size!==e.photoIds.length)throw new Error('일기 데이터가 올바르지 않거나 날짜가 중복됩니다.');
    dates.add(e.date);ids.add(e.id);
  }
  for(const p of raw.photos){
    if(!isObject(p)||typeof p.id!=='string'||photoIds.has(p.id)||typeof p.entryId!=='string'||!ids.has(p.entryId)||typeof p.name!=='string'||!iso(p.createdAt)||typeof p.mimeType!=='string'||!['image/jpeg','image/png','image/webp'].includes(p.mimeType)||typeof p.data!=='string'||p.data.length>30*1024*1024||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(p.data)||!p.data.startsWith(`data:${p.mimeType};base64,`))throw new Error('사진 데이터가 올바르지 않습니다.');
    photoIds.add(p.id);
  }
  for(const e of raw.entries as DiaryEntry[]){for(const id of e.photoIds){if(!(raw.photos as BackupPhoto[]).some(p=>p.id===id&&p.entryId===e.id))throw new Error('일기에 연결된 사진이 누락되었습니다.');}}
  for(const p of raw.photos as BackupPhoto[]){if(!(raw.entries as DiaryEntry[]).some(e=>e.id===p.entryId&&e.photoIds.includes(p.id)))throw new Error('연결되지 않은 사진입니다.');}
  return raw as unknown as Backup;
}
function dataUrl(blob:Blob) {return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(new Error('사진을 읽지 못했어요.'));reader.readAsDataURL(blob);});}
export async function createBackup(database=db):Promise<Backup> {
  const {entries,photos}=await database.transaction('r',database.entries,database.photos,async()=>({entries:await database.entries.toArray(),photos:await database.photos.toArray()}));
  return {version:1,exportedAt:new Date().toISOString(),entries,photos:await Promise.all(photos.map(async({blob,...p})=>({...p,data:await dataUrl(blob)})))};
}
export async function restoreBackup(raw:unknown,database:DiaryDatabase=db) {
  const backup=validateBackup(raw);
  const photos:Photo[]=backup.photos.map(({data,...p})=>{const binary=atob(data.split(',')[1]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return {...p,blob:new Blob([bytes],{type:p.mimeType})};});
  // Full replacement is deliberate and confirmed in the UI; IndexedDB transaction rolls back on error.
  await database.transaction('rw',database.entries,database.photos,database.drafts,async()=>{
    await database.entries.clear();await database.photos.clear();await database.drafts.clear();
    await database.entries.bulkAdd(backup.entries);await database.photos.bulkAdd(photos);
  });
}
export function downloadBackup(backup:Backup) {const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`paper-days-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

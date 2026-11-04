import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, Photo, Draft } from '../models/diary';
import { validDate } from '../utils/dates';
export class DiaryDatabase extends Dexie {
  entries!:Table<DiaryEntry,string>; photos!:Table<Photo,string>; drafts!:Table<Draft,string>;
  constructor(name='paper-days') { super(name);this.version(1).stores({entries:'id,&date,updatedAt',photos:'id,entryId',drafts:'entry.date'}); }
}
export const db=new DiaryDatabase();
export function newEntry(date:string):DiaryEntry {const now=new Date().toISOString();return {id:crypto.randomUUID(),date,title:'',content:'',mood:'calm',photoIds:[],createdAt:now,updatedAt:now};}
export async function saveEntry(entry:DiaryEntry,photos:Photo[],database=db) {
  if(!validDate(entry.date)) throw new Error('날짜를 확인해 주세요.');
  await database.transaction('rw',database.entries,database.photos,database.drafts,async()=>{
    const existing=await database.entries.where('date').equals(entry.date).first();
    const id=existing?.id??entry.id;
    await database.photos.where('entryId').equals(id).delete();
    await database.photos.bulkPut(photos.map(p=>({...p,entryId:id})));
    await database.entries.put({...entry,id,createdAt:existing?.createdAt??entry.createdAt,photoIds:photos.map(p=>p.id)});
    await database.drafts.delete(entry.date);
  });
}
export async function deleteEntry(entry:DiaryEntry) {await db.transaction('rw',db.entries,db.photos,db.drafts,async()=>{await db.entries.delete(entry.id);await db.photos.where('entryId').equals(entry.id).delete();await db.drafts.delete(entry.date);});}

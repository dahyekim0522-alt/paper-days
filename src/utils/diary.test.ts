import {afterEach,describe,expect,it} from 'vitest';
import {DiaryDatabase,newEntry,saveEntry} from '../db/database';
import {dateAtPage,pageWindow,validDate,addDays} from './dates';
import {restoreBackup,validateBackup, type Backup} from './backup';
const databases:DiaryDatabase[]=[];
function database(){const db=new DiaryDatabase(`test-${crypto.randomUUID()}`);databases.push(db);return db;}
afterEach(async()=>{await Promise.all(databases.splice(0).map(db=>db.delete()));});
describe('날짜와 페이지 매핑',()=>{
 it('존재하지 않는 날짜와 손상된 입력을 거부한다',()=>{expect(validDate('2024-02-29')).toBe(true);for(const v of ['2025-02-29','2026-13-01','hello',null,'2026-1-2','2101-01-01'])expect(validDate(v)).toBe(false);});
 it('연도 경계에서 날짜를 정확히 이동하며 6페이지만 만든다',()=>{expect(addDays('2026-12-31',1)).toBe('2027-01-01');expect(pageWindow('2026-01-01')).toHaveLength(6);expect(dateAtPage('2026-01-01',0)).toBe('2025-12-31');expect(dateAtPage('2026-01-01',5)).toBe('2026-01-02');});
});
describe('IndexedDB 트랜잭션',()=>{
 it('같은 날짜 저장은 기존 ID를 유지하며 중복 기록을 만들지 않는다',async()=>{const db=database();const first=newEntry('2026-11-05');await saveEntry(first,[],db);await saveEntry({...newEntry(first.date),content:'수정한 한글\n두 번째 문단'},[],db);expect(await db.entries.count()).toBe(1);expect((await db.entries.toArray())[0]).toMatchObject({id:first.id,content:'수정한 한글\n두 번째 문단'});});
 it('사진 Blob과 일기를 함께 저장하고 제거한다',async()=>{const db=database();const e=newEntry('2026-11-05');const photo={id:'p',entryId:e.id,blob:new Blob(['image'],{type:'image/png'}),mimeType:'image/png',name:'사진.png',createdAt:e.createdAt};await saveEntry(e,[photo],db);expect((await db.entries.get(e.id))?.photoIds).toEqual(['p']);expect(await (await db.photos.get('p'))?.blob.text()).toBe('image');await saveEntry(e,[],db);expect(await db.photos.count()).toBe(0);});
 it('잘못된 날짜는 데이터베이스에 기록하지 않는다',async()=>{const db=database();await expect(saveEntry(newEntry('broken'),[],db)).rejects.toThrow();expect(await db.entries.count()).toBe(0);});
});
function sample():Backup {const entry={...newEntry('2026-11-05'),photoIds:['photo']};return {version:1,exportedAt:entry.createdAt,entries:[entry],photos:[{id:'photo',entryId:entry.id,mimeType:'image/png',name:'photo.png',createdAt:entry.createdAt,data:'data:image/png;base64,aGVsbG8='}]};}
describe('백업·복원',()=>{
 it('일기와 사진 바이트를 복원한다',async()=>{const db=database(),backup=sample();await restoreBackup(backup,db);expect(await db.entries.count()).toBe(1);expect(await (await db.photos.get('photo'))?.blob.text()).toBe('hello');});
 it('잘못된 버전, 중복 날짜, 누락된 사진, 손상된 사진을 거부한다',()=>{expect(()=>validateBackup({version:9})).toThrow();const a=sample();a.entries.push({...a.entries[0],id:'another'});expect(()=>validateBackup(a)).toThrow();const b=sample();b.photos=[];expect(()=>validateBackup(b)).toThrow();const c=sample();c.photos[0].data='javascript:alert(1)';expect(()=>validateBackup(c)).toThrow();});
 it('검증 실패 시 기존 기록을 보존한다',async()=>{const db=database(),e=newEntry('2026-11-05');await saveEntry(e,[],db);await expect(restoreBackup({version:0},db)).rejects.toThrow();expect(await db.entries.get(e.id)).toEqual(e);});
});

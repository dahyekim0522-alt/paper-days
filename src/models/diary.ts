export const moods = [{id:'happy',icon:'☀',label:'행복해요'},{id:'calm',icon:'☁',label:'평온해요'},{id:'love',icon:'♡',label:'설레요'},{id:'sad',icon:'☂',label:'우울해요'},{id:'tired',icon:'☾',label:'피곤해요'}] as const;
export interface DiaryEntry { id:string; date:string; title:string; content:string; mood:string; photoIds:string[]; createdAt:string; updatedAt:string }
export interface Photo { id:string; entryId:string; blob:Blob; mimeType:string; name:string; createdAt:string }
export interface Draft { entry:DiaryEntry; photos:Photo[] }

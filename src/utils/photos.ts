import type { Photo } from '../models/diary';
export const photoTypes=['image/jpeg','image/png','image/webp'];
export async function preparePhoto(file:File,entryId:string):Promise<Photo> {
  if(!photoTypes.includes(file.type)) throw new Error('JPG, PNG, WebP 사진을 선택해 주세요.');
  if(file.size>20*1024*1024) throw new Error('사진 한 장은 20MB 이하로 선택해 주세요.');
  const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('사진을 읽지 못했어요. 손상되지 않은 JPG, PNG, WebP 파일을 선택해 주세요.');});
  if(bitmap.width*bitmap.height>80000000){bitmap.close();throw new Error('사진 해상도가 너무 큽니다.');}
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('이미지 변환을 지원하지 않는 브라우저입니다.');}
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('사진 변환에 실패했어요.')),'image/webp',0.85));
  return {id:crypto.randomUUID(),entryId,blob,mimeType:blob.type,name:file.name,createdAt:new Date().toISOString()};
}

import { useLayoutEffect,useRef } from 'react';
import { PageFlip } from 'page-flip';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { animationScope } from '../../utils/animationScope';
import type { DiaryEntry, Photo } from '../../models/diary';
import { moods } from '../../models/diary';
import { dateAtPage, pageWindow, parseDate } from '../../utils/dates';
export interface BookHandle {next:()=>void;prev:()=>void}
export default function Book({date,side,entries,photos,onTurn,controls}:{date:string;side:number;entries:DiaryEntry[];photos:Photo[];onTurn:(date:string,side:number)=>void;controls:React.RefObject<BookHandle|null>}) {
 const reduced=useReducedMotion();
 const host=useRef<HTMLDivElement>(null);const callback=useRef(onTurn);callback.current=onTurn;
 useLayoutEffect(()=>{
  const container=host.current!;const target=document.createElement('div');target.className='flip-target';container.appendChild(target);
  const urls:string[]=[];const pages=pageWindow(date).map(({date:pageDate,side:pageSide},index)=>{
   const entry=entries.find(e=>e.date===pageDate);const d=parseDate(pageDate);const page=document.createElement('div');page.className=`paper-page ${pageSide==='text'?'verso':'recto'}`;page.dataset.date=pageDate;
   const add=(tag:string,className:string,text:string,parent:HTMLElement=page)=>{const el=document.createElement(tag);el.className=className;el.textContent=text;parent.appendChild(el);return el;};
   add('div','page-running',pageSide==='text'?'THE LITTLE THINGS, THE EVERYDAY.':'MOMENTS TO KEEP');
   if(pageSide==='text'){
    const heading=add('div','date-heading','');add('span','date-number',String(d.getDate()).padStart(2,'0'),heading);const info=add('div','date-info','',heading);add('span','date-month',d.toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase(),info);add('span','date-weekday',d.toLocaleDateString('ko-KR',{weekday:'long'}),info);
    const mood=moods.find(m=>m.id===entry?.mood);if(mood)add('span','page-mood',`${mood.icon} ${mood.label}`,heading);
    add('h2','entry-title',entry?.title||(entry?'이름 없는, 소중한 하루':'어떤 하루를 보내셨나요?'));
    const content=add('div',`entry-content ${entry?'':'blank-lines'}`,entry?.content||'작고 평범한 순간도 좋아요.\n오늘의 이야기를 여기에 남겨 보세요.');content.tabIndex=0;content.setAttribute('aria-label','일기 내용');
    if(!entry)add('div','empty-flower','✳');
   }else{
    add('h2','memory-title','오늘의 조각들');add('p','memory-subtitle','작은 순간이 모여, 한 권의 내가 되니까.');
    const attached=photos.filter(p=>p.entryId===entry?.id);const gallery=add('div',`page-gallery ${attached.length?'':'no-photos'}`,'');
    if(attached.length){for(const p of attached){const figure=add('figure','polaroid','',gallery);const img=document.createElement('img');const url=URL.createObjectURL(p.blob);urls.push(url);img.src=url;img.alt=p.name;figure.appendChild(img);add('figcaption','',p.name,figure);}}
    else {const frame=add('div','empty-polaroid','',gallery);add('span','line-flower','❀',frame);add('span','', '사진으로 남기고 싶은 순간',frame);add('small','','사진을 첨부하면 여기에 담겨요',frame);}
    add('p','page-quote','“기억하고 싶은 날보다,\n기록해서 기억하게 되는 날이 더 많다.”');
   }
   add('div','page-bottom',`${pageDate.replaceAll('-','.')}     —     ${index+1}`);return page;
  });
  const flip=new PageFlip(target,{width:450,height:580,size:'stretch',minWidth:280,maxWidth:490,minHeight:360,maxHeight:640,autoSize:true,startPage:2+side,usePortrait:true,drawShadow:true,maxShadowOpacity:0.28,flippingTime:reduced?1:650,mobileScrollSupport:true,showPageCorners:!reduced,disableFlipByClick:false,useMouseEvents:true,swipeDistance:25});
  let disposed=false;let pending:ReturnType<typeof setTimeout>|undefined;
  const turn=(direction:'next'|'prev')=>{if(flip.getState()!=='read')return;if(reduced){const step=flip.getOrientation()==='portrait'?1:2;const index=flip.getCurrentPageIndex()+(direction==='next'?step:-step);flip.turnToPage(Math.max(0,Math.min(5,index)));}else if(direction==='next')flip.flipNext();else flip.flipPrev();};
  controls.current={next:()=>turn('next'),prev:()=>turn('prev')};
  flip.on('flip',()=>{
   clearTimeout(pending);pending=setTimeout(()=>{
    if(disposed)return;const index=flip.getCurrentPageIndex();const next=dateAtPage(date,index);
    if(next!==date)callback.current(next,flip.getOrientation()==='portrait'?index%2:0);
   },reduced?10:700);
  });
  const blockReduced=(e:Event)=>{if(reduced)e.stopPropagation();};
  target.addEventListener('mousedown',blockReduced,true);
  // Upstream touch folding can infer the opposite direction on a portrait page.
  // Own swipe intent; keep the library's page curl renderer and mouse drag.
  let touch:{x:number;y:number}|null=null;
  const touchStart=(event:TouchEvent)=>{event.stopPropagation();if(event.touches.length===1)touch={x:event.touches[0].clientX,y:event.touches[0].clientY};else touch=null;};
  const touchMove=(event:TouchEvent)=>{event.stopPropagation();if(touch&&event.touches[0]&&Math.abs(event.touches[0].clientX-touch.x)>Math.abs(event.touches[0].clientY-touch.y)&&event.cancelable)event.preventDefault();};
  const touchEnd=(event:TouchEvent)=>{event.stopPropagation();if(!touch)return;const point=event.changedTouches[0];const dx=point.clientX-touch.x,dy=point.clientY-touch.y;touch=null;if(Math.abs(dx)>25&&Math.abs(dy)<Math.abs(dx)*.6){if(event.cancelable)event.preventDefault();turn(dx<0?'next':'prev');}};
  const touchCancel=()=>{touch=null;};
  target.addEventListener('touchstart',touchStart,{capture:true,passive:true});target.addEventListener('touchmove',touchMove,{capture:true,passive:false});target.addEventListener('touchend',touchEnd,{capture:true,passive:false});target.addEventListener('touchcancel',touchCancel,true);
  const animation=animationScope();animation.run(()=>flip.loadFromHTML(pages));
  const keyboard=(e:KeyboardEvent)=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName))return;if(e.key==='ArrowRight'){e.preventDefault();turn('next');}if(e.key==='ArrowLeft'){e.preventDefault();turn('prev');}};
  window.addEventListener('keydown',keyboard);
  return()=>{disposed=true;clearTimeout(pending);window.removeEventListener('keydown',keyboard);controls.current=null;animation.stop();target.removeEventListener('touchstart',touchStart,true);target.removeEventListener('touchmove',touchMove,true);target.removeEventListener('touchend',touchEnd,true);target.removeEventListener('touchcancel',touchCancel,true);flip.destroy();target.remove();urls.forEach(u=>URL.revokeObjectURL(u));};
 },[date,side,entries,photos,controls,reduced]);
 return <div className="book-stage" ref={host} aria-label="페이지를 넘기는 다이어리"/>;
}

import { useEffect,useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current!;const previous=document.activeElement as HTMLElement;d.showModal();return()=>{d.close();previous?.focus();};},[]);
 return <dialog ref={ref} className={wide?'modal wide':'modal'} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="modal-header"><div><span className="eyebrow">PAPER DAYS</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={22}/></button></div>{children}</dialog>;
}

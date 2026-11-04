import { useEffect,useState } from 'react';
import type { Photo } from '../../models/diary';
export default function PhotoImage({photo}:{photo:Photo}) {const [url,setUrl]=useState('');useEffect(()=>{const u=URL.createObjectURL(photo.blob);setUrl(u);return()=>URL.revokeObjectURL(u);},[photo.blob]);return <img src={url||undefined} alt={photo.name} loading="lazy"/>;}

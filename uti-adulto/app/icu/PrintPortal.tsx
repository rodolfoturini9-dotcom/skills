'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

export default function PrintPortal({children,kind}:{children:ReactNode;kind:'evolution'|'handoff'}){
 const [target,setTarget]=useState<HTMLDivElement|null>(null);
 useEffect(()=>{let active=true;const element=document.createElement('div');element.className=`icu-print-portal icu-print-portal-${kind}`;document.body.appendChild(element);queueMicrotask(()=>{if(active)setTarget(element)});return()=>{active=false;element.remove()}},[kind]);
 return target?createPortal(children,target):null;
}

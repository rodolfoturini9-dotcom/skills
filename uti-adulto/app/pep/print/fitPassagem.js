// Paginação medida em área A4 fixa: fontes legíveis e continuações, sem recorte.
export const ROW_MAX=12, CARD_MAX=11, FONT_MIN=9.5;
const overflow=b=>b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1;
function shrink(el,key,max){let size=max;const boxes=[...el.querySelectorAll('[data-fit-box]')];el.style.setProperty(key,`${size}px`);while(size>FONT_MIN&&boxes.some(overflow)){size=Math.max(FONT_MIN,Math.round((size-.2)*10)/10);el.style.setProperty(key,`${size}px`);}return !boxes.some(overflow);}
function emptyPage(source,output,continuation){const page=source.cloneNode(true);page.querySelectorAll('[data-fit-row],[data-fit-card]').forEach(e=>e.remove());if(!source.querySelector('[data-fit-card]'))page.querySelector('footer')?.remove();const list=page.children[1];Object.assign(list.style,{display:'flex',flexDirection:'column',flex:'1',minHeight:'0'});if(continuation){const tag=document.createElement('small');tag.textContent='CONTINUAÇÃO';tag.style.fontSize='10px';tag.style.lineHeight='1.1';page.querySelector('header').append(tag);}output.append(page);return {page,list};}
function splitItem(item,sourcePage,output,card=false){
 const queues=[...item.querySelectorAll('[data-fit-box]')].map(box=>[...box.children].map(n=>n.cloneNode(true)));let count=0;
 while(queues.some(q=>q.length)){
  const {page,list}=emptyPage(sourcePage,output,count>0);const clone=item.cloneNode(true);Object.assign(clone.style,{flex:'1',minHeight:'0'});clone.style.setProperty(card?'--check-font':'--row-font',`${FONT_MIN}px`);list.append(clone);
  const boxes=[...clone.querySelectorAll('[data-fit-box]')];boxes.forEach(b=>b.replaceChildren());if(!card&&count>0&&!queues[0].length){boxes[0].append(...[...item.querySelector('[data-fit-box]').children].map(n=>n.cloneNode(true)));}let progressed=false;
  boxes.forEach((box,i)=>{const queue=queues[i];while(queue.length){const node=queue[0];box.append(node.cloneNode(true));if(!overflow(box)){queue.shift();progressed=true;continue;}box.lastChild.remove();
   const text=node.textContent;let low=0,high=text.length,best=0;const part=node.cloneNode(false);Object.assign(part.style,{display:'block',overflowWrap:'anywhere',whiteSpace:'pre-wrap'});box.append(part);
   while(low<=high){const mid=Math.floor((low+high)/2);part.textContent=text.slice(0,mid);if(!overflow(box)){best=mid;low=mid+1;}else high=mid-1;}
   if(best){const space=text.lastIndexOf(' ',best);if(space>best*.65)best=space+1;part.textContent=text.slice(0,best);node.textContent=text.slice(best);progressed=true;if(!node.textContent)queue.shift();}else part.remove();break;
  }});
  if(!progressed){page.remove();throw new Error('Não foi possível paginar o conteúdo. Revise o template antes de imprimir.');}count++;
 }
}
export function fitPassagem(root){
 if(!root)return {failures:[],sizes:{},pages:0};const originals=[...root.children].filter(e=>e.hasAttribute('data-page'));
 root.querySelector('[data-generated-pages]')?.remove();originals.forEach(p=>p.style.display='flex');
 const output=document.createElement('div');output.dataset.generatedPages='';root.append(output);const failures=[],sizes={};
 for(const sourcePage of originals){const clone=sourcePage.cloneNode(true);output.append(clone);const rows=[...clone.querySelectorAll('[data-fit-row]')],cards=[...clone.querySelectorAll('[data-fit-card]')];const badRows=rows.filter(r=>!shrink(r,'--row-font',ROW_MAX)),badCards=cards.filter(r=>!shrink(r,'--check-font',CARD_MAX));
  if(badRows.length){clone.remove();for(const row of rows){if(badRows.includes(row)){failures.push(row.dataset.fitRow);splitItem(row,sourcePage,output);}else{const {list}=emptyPage(sourcePage,output,false);list.append(row);}}}
  else if(badCards.length){clone.remove();for(const card of cards){if(badCards.includes(card)){failures.push(`Checklist ${card.dataset.fitCard}`);splitItem(card,sourcePage,output,true);}else{const {list}=emptyPage(sourcePage,output,false);card.style.flex='1';list.append(card);}}}
  for(const row of rows)sizes[row.dataset.fitRow]=row.style.getPropertyValue('--row-font');
 }
 originals.forEach(p=>p.style.display='none');const pages=[...output.children];pages.forEach((p,i)=>{p.style.breakAfter=i===pages.length-1?'auto':'page';p.style.pageBreakAfter=i===pages.length-1?'auto':'always';});return {failures,sizes,pages:pages.length};
}
export const chunk=(arr,n=3)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,i*n+n));

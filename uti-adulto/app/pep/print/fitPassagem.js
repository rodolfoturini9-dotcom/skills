// Ajuste tipográfico do modelo da Passagem (A4 paisagem), com paginação FIXA do modelo:
// 3 leitos por página (até 10 leitos = 4 páginas) + 1 página de checklist com todos os pacientes.
// 1) Cada linha [data-fit-row] / card [data-fit-card] reduz a fonte em passos de 0,2px (8,5/8,3 → 6,2px).
// 2) Coluna que ainda transborde reduz só a própria fonte até FONT_FLOOR, sem alterar o layout.
// 3) O que não couber nem em FONT_FLOOR é informado em `failures` (nenhuma página extra é criada).
export const ROW_MAX=8.5, CARD_MAX=8.3, FONT_MIN=6.2, FONT_FLOOR=4.6;
const overflow=b=>b.scrollHeight>b.clientHeight+1;
const round=n=>Math.round(n*10)/10;
function shrink(el,key,max,min,boxes){let size=max;el.style.setProperty(key,`${size}px`);while(size>min&&boxes.some(overflow)){size=Math.max(min,round(size-.2));el.style.setProperty(key,`${size}px`);}return size;}
function fit(item,key,max){
 const boxes=[...item.querySelectorAll('[data-fit-box]')];
 const size=shrink(item,key,max,FONT_MIN,boxes);
 // A variável redefinida na própria coluna vale para os títulos internos (calc(var(--row-font) + …)).
 for(const box of boxes.filter(overflow))shrink(box,key,size,FONT_FLOOR,[box]);
 return {size,ok:!boxes.some(overflow),reduced:boxes.some(b=>b.style.getPropertyValue(key))};
}
export function fitPassagem(root){
 if(!root)return {failures:[],reduced:[],sizes:{},pages:0};const originals=[...root.children].filter(e=>e.hasAttribute('data-page'));
 root.querySelector('[data-generated-pages]')?.remove();originals.forEach(p=>p.style.display='flex');
 const output=document.createElement('div');output.dataset.generatedPages='';root.append(output);const failures=[],reduced=[],sizes={};
 for(const source of originals){const page=source.cloneNode(true);output.append(page);
  for(const row of page.querySelectorAll('[data-fit-row]')){const r=fit(row,'--row-font',ROW_MAX);sizes[row.dataset.fitRow]=`${r.size}px`;if(!r.ok)failures.push(row.dataset.fitRow);else if(r.reduced)reduced.push(row.dataset.fitRow);}
  for(const card of page.querySelectorAll('[data-fit-card]')){const label=`Checklist ${card.dataset.fitCard}`,r=fit(card,'--check-font',CARD_MAX);if(!r.ok)failures.push(label);else if(r.reduced)reduced.push(label);}
 }
 originals.forEach(p=>p.style.display='none');const pages=[...output.children];pages.forEach((p,i)=>{p.style.breakAfter=i===pages.length-1?'auto':'page';p.style.pageBreakAfter=i===pages.length-1?'auto':'always';});return {failures,reduced,sizes,pages:pages.length};
}
export const chunk=(arr,n=3)=>Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,i*n+n));

import type {Sheet} from './ICUContext';
import {FICHA_GROUPS} from './fichaModel';

const map=FICHA_GROUPS.flatMap(group=>group.rows.map(row=>`${row.id} ${group.name} — ${row.labels[0]||'vazio'} | ${row.single?'vazio':row.labels[1]||'vazio'}`)).join('\n');

export function buildExtractionPrompt(sheet:Sheet,windowStart:number){
 const columns=Array.from({length:6},(_,i)=>`coluna ${i+1}: D${windowStart+i+1}, ${sheet.dates[windowStart+i]||'data ainda não registrada'}`).join('; ');
 const fence=String.fromCharCode(96).repeat(3);
 return `Analise integralmente as imagens anexadas da ficha de evolução diária de UTI adulto. Extraia somente o que estiver efetivamente legível. Responda com uma única caixa de código Markdown contendo JSON válido, sem explicações.

REGRAS
1. Leia cada dia visível da esquerda para a direita; cada dia possui duas subcolunas. Não desloque valores de dia ou de slot.
2. Não invente, complete, corrija, calcule ou arredonde valores. Preserve unidades, sinais, doses, vazões, datas e textos clínicos.
3. Campos ausentes ou ilegíveis ficam vazios (""). Em campo único, use o primeiro valor e deixe o segundo vazio.
4. Datas no formato dd/mm/aaaa. Mantenha cada dia em objeto próprio; não reúna valores de dias diferentes.
5. Esta folha do sistema mostra ${columns}. Use essas datas somente para conferir a coluna; se a imagem mostrar outra data, transcreva a data da imagem, sem adaptar o valor.
6. Retorne até seis dias visíveis na mesma ordem, sem preencher dias que não apareçam na imagem. Omita linhas inteiramente vazias.

FORMATO EXATO
${fence}json
{"patient":"","admission":"","bed":"","days":[{"date":"dd/mm/aaaa","cells":{"0":["valor esquerdo","valor direito"]}}]}
${fence}

MAPA EXATO DAS 55 LINHAS
${map}

Antes de responder, confira a identidade, as datas, o índice da linha, os dois slots e a validade do JSON. Não inclua conclusões diagnósticas. A extração será revisada pelo médico antes de salvar.`;
}

// Contrato clínico da evolução (sem dependência do SDK): prompt de sistema, ferramenta, serialização XML e saneamento.
// Usado pelo anthropicService.js (produção) e pelo protótipo navegável.
import { FICHA_ROWS, DAYS, getCell, referenceDay, isoToBR, slotsOf } from '../core/icuStore.js';

export const TOOL_NAME = 'salvar_evolucao_clinica';
import {TEMPLATE_ID} from './clinicalTemplate.js';
export {TEMPLATE_ID} from './clinicalTemplate.js';

export const TEXT_SECTIONS = [
  'DIAGNÓSTICOS / HIPÓTESES',
  'RESUMO CLÍNICO E EVOLUÇÃO NAS ÚLTIMAS 24 HORAS',
  'TERAPIAS EM CURSO E SUPORTE ORGÂNICO',
  'DISPOSITIVOS INVASIVOS',
  'SINAIS VITAIS, CONTROLES E BALANÇO HÍDRICO',
  'INTERCORRÊNCIAS',
  'EXAME FÍSICO DIRECIONADO',
  'EXAMES COMPLEMENTARES',
  'AVALIAÇÃO',
  'PLANO DO DIA / CONDUTAS',
  'FAST-HUG MODIFICADO',
  'METAS E PENDÊNCIAS',
];

export const SYSTEMS_ORDER = [
  'NEUROLÓGICO', 'RESPIRATÓRIO', 'CARDIOVASCULAR/HEMODINÂMICO', 'RENAL/HIDROELETROLÍTICO',
  'GASTROINTESTINAL/NUTRICIONAL', 'INFECCIOSO', 'HEMATOLÓGICO', 'ENDOCRINOMETABÓLICO', 'PELE/MUSCULOESQUELÉTICO',
];

export const SYSTEM_PROMPT = `Você é médico intensivista sênior de UTI adulto do Hospital Regional de Ivaiporã, redigindo a evolução médica diária.

REGRAS INEGOCIÁVEIS
1. Fidelidade factual absoluta: use somente dados presentes nas tags <dados_paciente>, <ficha_diaria>, <controles_24h>, <exames> e <notas_beira_leito>. Nunca invente, extrapole, arredonde ou complete valores.
2. Ausência de dado não é normalidade. Não descreva exame físico, sinais, profilaxias ou resultados que não foram fornecidos.
3. Omita integralmente seções e campos sem dados. Nunca escreva "não informado", "sem dados", "N/A", "—" nem use colchetes ou placeholders; no JSON, omita a chave.
4. Análise temporal: D-0 é o dia de referência ativo. Contextualize tendências comparando com D-1 a D-5 somente quando o valor existir nos dois pontos (ex.: "lactato 4,2 → 2,3").
5. Linguagem técnica, concisa, em português do Brasil, com abreviações usuais de UTI. Preserve datas, horários e unidades exatamente como fornecidos.
6. Condutas e pendências só podem ser propostas quando decorrem diretamente de achados documentados; redija como plano para validação do médico assistente.
7. Não use expressões metalinguísticas ("conforme ficha", "segundo os dados enviados").
8. Avaliação por sistemas, quando houver dados, nesta ordem: ${SYSTEMS_ORDER.join(', ')}. Formato "SISTEMA: avaliação".
9. Chame a ferramenta ${TOOL_NAME} exatamente uma vez com a evolução completa. Depois da confirmação, responda apenas "OK".

TEXTO FORMATADO (campo texto_formatado)
Use, nesta ordem e apenas quando houver conteúdo, os cabeçalhos:
${TEXT_SECTIONS.map((s) => `# ${s}`).join('\n')}
Itens em linhas iniciadas por "- ". Sem outra marcação.`;

const str = { type: 'string' };
const list = { type: 'array', items: { type: 'string' } };
const obj = (props) => ({ type: 'object', additionalProperties: false, properties: Object.fromEntries(props.map((p) => [p, str])) });

export const EVOLUCAO_TOOL = {
  name: TOOL_NAME,
  description: `Registra a evolução médica diária estruturada no modelo ${TEMPLATE_ID} e o texto formatado para cópia. Campos sem dados de origem devem ser omitidos.`,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['template', 'texto_formatado', 'diagnosticos_atuais'],
    properties: {
      template: { type: 'string', enum: [TEMPLATE_ID] },
      texto_formatado: { type: 'string', description: 'Evolução completa com cabeçalhos "# SEÇÃO", pronta para colar no prontuário.' },
      paciente: obj(['nome', 'leito', 'idade', 'peso', 'dih', 'di_uti']),
      diagnosticos_atuais: { ...list, description: 'Diagnósticos e hipóteses ativas, o mais relevante primeiro.' },
      antecedentes: obj(['comorbidades', 'alergias', 'mucs']),
      resumo_internacao: str,
      eventos_24h: list,
      controles_24h: obj(['pa', 'pam', 'fc', 'fr', 'spo2', 'temperatura', 'glicemia_capilar', 'diurese', 'evacuacao', 'nutricao_enteral', 'balanco_hidrico']),
      suportes_atuais: obj(['respiratorio', 'hemodinamico', 'nutricao', 'sedacao_analgesia']),
      dispositivos: list,
      antimicrobianos: { ...list, description: 'Antimicrobiano + dia de uso (D#) quando derivável das colunas da ficha.' },
      profilaxias: obj(['tev', 'ulcera_estresse', 'lesao_pressao']),
      exame_fisico: obj(['geral', 'neurologico', 'respiratorio', 'cardiovascular', 'abdome', 'extremidades', 'pele']),
      exames_complementares: list,
      avaliacao_sistemas: { ...list, description: 'Formato "SISTEMA: avaliação".' },
      impressao_clinica: list,
      condutas: list,
      fast_hug: list,
      pendencias: list,
      registro: obj(['data_evolucao', 'hora_evolucao']),
    },
  },
};

// ---------- Serialização XML ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VITAL_ROWS = [3, 4, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18];
const LAB_ROWS = FICHA_ROWS.filter((r) => r.row >= 34).map((r) => r.row);
const ALL_ROWS = FICHA_ROWS.filter((r) => r.kind !== 'blank' && !LAB_ROWS.includes(r.row)).map((r) => r.row);

function rowLines(bed, day, rows) {
  const out = [];
  for (const r of rows) {
    const def = FICHA_ROWS[r];
    for (const s of slotsOf(r)) {
      const v = getCell(bed, day, r, s);
      if (!v) continue;
      const label = def.labels[s] || def.labels[0];
      out.push(`${def.section}${label ? ` · ${label}` : ''}: ${esc(v)}`);
    }
  }
  return out;
}

export function buildClinicalXML(bed, { notasClinicas } = {}) {
  const ref = referenceDay(bed);
  const dayTag = (d, rows) => {
    const lines = rowLines(bed, d, rows);
    return lines.length ? `  <dia rotulo="D-${ref - d}" coluna="D${d + 1}" data="${isoToBR(bed.dates[d])}">\n${lines.map((l) => `    ${l}`).join('\n')}\n  </dia>` : '';
  };
  const days = DAYS.filter((d) => d <= ref).reverse(); // D-0 primeiro
  const paciente = [
    ['Leito', bed.bedId], ['Nome', bed.patientName], ['Idade', bed.age && `${bed.age} anos`],
    ['Peso', bed.weight.value && `${bed.weight.value} kg${bed.weight.isEstimated ? ' (estimado)' : ' (aferido)'}`],
    ['Internação hospitalar', isoToBR(bed.hospitalAdmissionDate)], ['Admissão UTI', isoToBR(bed.admissionDate)],
    ['DIH', bed.dih], ['DI-UTI', bed.diUti],
  ].filter(([, v]) => v).map(([k, v]) => `  ${k}: ${esc(v)}`).join('\n');
  const block = (tag, body) => (body?.trim() ? `<${tag}>\n${body}\n</${tag}>` : '');
  return [
    block('dados_paciente', paciente),
    block('ficha_diaria', days.map((d) => dayTag(d, ALL_ROWS)).filter(Boolean).join('\n')),
    block('controles_24h', dayTag(ref, VITAL_ROWS)),
    block('exames', days.map((d) => dayTag(d, LAB_ROWS)).filter(Boolean).join('\n')),
    block('notas_beira_leito', notasClinicas?.trim() ? esc(notasClinicas.trim()) : ''),
  ].filter(Boolean).join('\n\n');
}

export function buildUserMessage(bed, { notasClinicas, now = new Date() } = {}) {
  const xml = buildClinicalXML(bed, { notasClinicas });
  const stamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return { xml, hasData: /<ficha_diaria>|<notas_beira_leito>/.test(xml), content: `Gere a evolução médica diária do leito ${bed.bedId}. Data/hora do registro: ${stamp}.\n\n${xml}` };
}

// ---------- Saneamento (defesa em profundidade contra placeholders) ----------
const PLACEHOLDER = /^\s*(n[ãa]o informad[oa]s?|sem dados|n\/?a|—|-|\[.*\]|\.\.\.)\s*$/i;
export function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload).filter((v) => v !== undefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const s = sanitizePayload(v);
      if (s === undefined || (Array.isArray(s) && !s.length) || (s && typeof s === 'object' && !Array.isArray(s) && !Object.keys(s).length)) continue;
      out[k] = s;
    }
    return out;
  }
  if (typeof value === 'string') return !value.trim() || PLACEHOLDER.test(value) ? undefined : value.trim();
  return value;
}

// Converte o payload no modelo de impressão A4 (2 colunas). Seções vazias são omitidas.
export const CONTROL_LABELS = [
  ['pa', 'PA'], ['pam', 'PAM'], ['fc', 'FC'], ['fr', 'FR'], ['spo2', 'SpO₂'], ['temperatura', 'Temperatura'],
  ['glicemia_capilar', 'Glicemia capilar'], ['diurese', 'Diurese'], ['evacuacao', 'Evacuação'],
  ['nutricao_enteral', 'Nutrição enteral'], ['balanco_hidrico', 'Balanço hídrico'],
];
const kv = (o, pairs) => pairs.map(([k, l]) => [l, o?.[k]]).filter(([, v]) => v);

export function toPrintModel(p = {}) {
  const S = (title, kind, data) => ({ title, kind, data });
  const col1 = [
    p.diagnosticos_atuais?.length && S('DIAGNÓSTICOS ATUAIS', 'list', p.diagnosticos_atuais),
    kv(p.antecedentes, [['comorbidades', 'Comorbidades'], ['alergias', 'Alergias'], ['mucs', 'MUCs']]).length && S('ANTECEDENTES', 'kv', kv(p.antecedentes, [['comorbidades', 'Comorbidades'], ['alergias', 'Alergias'], ['mucs', 'MUCs']])),
    (p.resumo_internacao || p.eventos_24h?.length) && S('RESUMO CLÍNICO / EVENTOS 24 H', 'mixed', { text: p.resumo_internacao, list: p.eventos_24h || [] }),
    kv(p.controles_24h, CONTROL_LABELS).length && S('SINAIS VITAIS E CONTROLES – 24 H', 'table', kv(p.controles_24h, CONTROL_LABELS)),
    p.avaliacao_sistemas?.length && S('AVALIAÇÃO POR SISTEMAS', 'olist', p.avaliacao_sistemas),
    p.impressao_clinica?.length && S('IMPRESSÃO CLÍNICA', 'list', p.impressao_clinica),
  ].filter(Boolean);
  const sup = kv(p.suportes_atuais, [['respiratorio', 'Respiratório'], ['hemodinamico', 'Hemodinâmico'], ['nutricao', 'Nutrição'], ['sedacao_analgesia', 'Sedação/analgesia']]);
  const pro = kv(p.profilaxias, [['tev', 'TEV'], ['ulcera_estresse', 'Úlcera de estresse'], ['lesao_pressao', 'Lesão por pressão']]);
  const ex = kv(p.exame_fisico, [['geral', 'Geral'], ['neurologico', 'Neurológico'], ['respiratorio', 'Respiratório'], ['cardiovascular', 'Cardiovascular'], ['abdome', 'Abdome'], ['extremidades', 'Extremidades'], ['pele', 'Pele']]);
  const col2 = [
    sup.length && S('SUPORTES ORGÂNICOS', 'kv', sup),
    p.dispositivos?.length && S('DISPOSITIVOS INVASIVOS', 'list', p.dispositivos),
    p.antimicrobianos?.length && S('TERAPIA ANTIMICROBIANA', 'list', p.antimicrobianos),
    pro.length && S('PROFILAXIAS', 'kv', pro),
    ex.length && S('EXAME FÍSICO', 'kv', ex),
    p.exames_complementares?.length && S('EXAMES COMPLEMENTARES', 'list', p.exames_complementares),
    p.condutas?.length && S('CONDUTAS', 'list', p.condutas),
    p.fast_hug?.length && S('FAST-HUG', 'list', p.fast_hug),
    p.pendencias?.length && S('PENDÊNCIAS', 'list', p.pendencias),
  ].filter(Boolean);
  return { col1, col2 };
}

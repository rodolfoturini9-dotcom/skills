import {mergeDailyRecords,saveDailyEvolution} from './dailyHistory.js';
import {applyChart} from './chartOrganization.js';

// Núcleo puro (sem React) do PEP-UTI: matriz canônica, estado, reducer, persistência e derivações.
// Compartilhado por ICUContext.jsx e pelo protótipo navegável.

export const STORAGE_KEY = 'pep_uti_state';
export const LEGACY_KEY = 'ficha_uti_v4';
export const SCHEMA_VERSION = 5;
export const BED_IDS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
export const DAYS = [0, 1, 2, 3, 4, 5];
export const SLOTS = [0, 1];
export const BED_STATUS = ['occupied', 'empty', 'isolation', 'critical'];

// kind: 'pair' (2 slots) | 'wide' (slot 0) | 'blank' (sem entrada na impressão)
// input: 'decimal' | 'numeric' | 'signed' (aceita "-": teclado texto no iOS) | 'text'
const P = (row, section, a, b, input = 'decimal') => ({ row, section, kind: 'pair', labels: [a, b], input });
const W = (row, section, label, input = 'decimal') => ({ row, section, kind: 'wide', labels: [label], input });
const B = (row, section) => ({ row, section, kind: 'blank', labels: [''], input: 'text' });

export const FICHA_ROWS = [
  P(0, 'ACESSOS', 'TOT', 'TQT', 'text'),
  P(1, 'ACESSOS', 'CVC', 'CVC', 'text'),
  P(2, 'ACESSOS', 'PAI', 'SVD', 'text'),
  W(3, 'GANHOS', 'TOTAL DE ENTRADAS', 'numeric'),
  W(4, 'GANHOS', 'HEMOCOMPONENTES', 'text'),
  B(5, 'GANHOS'),
  B(6, 'GANHOS'),
  W(7, 'PERDAS', 'DIURESE', 'numeric'),
  W(8, 'PERDAS', 'DIÁLISE', 'text'),
  P(9, 'PERDAS', 'FEZES', 'ESTASE', 'text'),
  W(10, 'PERDAS', 'DRENOS', 'text'),
  B(11, 'PERDAS'),
  W(12, 'PERDAS', 'BALANÇO HÍDRICO', 'signed'),
  P(13, 'DADOS VITAIS', 'PAM mín', 'PAM máx', 'numeric'),
  P(14, 'DADOS VITAIS', 'FC mín', 'FC máx', 'numeric'),
  P(15, 'DADOS VITAIS', 'FR mín', 'FR máx', 'numeric'),
  P(16, 'DADOS VITAIS', 'T mín', 'T máx'),
  P(17, 'DADOS VITAIS', 'GLIC. mín', 'GLIC. máx', 'numeric'),
  W(18, 'DADOS VITAIS', 'PIA/PIC/PVC', 'text'),
  W(19, 'ATB', '', 'text'), W(20, 'ATB', '', 'text'), W(21, 'ATB', '', 'text'), W(22, 'ATB', '', 'text'),
  W(23, 'DVA', '', 'text'), W(24, 'DVA', '', 'text'), W(25, 'DVA', '', 'text'),
  W(26, 'SEDAÇÃO', '', 'text'), W(27, 'SEDAÇÃO', '', 'text'), W(28, 'SEDAÇÃO', '', 'text'), W(29, 'SEDAÇÃO', '', 'text'),
  P(30, 'NEURO', 'GCS/RASS', 'PUPILAS', 'text'),
  W(31, 'VENTIL', 'MODO VENT.', 'text'),
  P(32, 'VENTIL', 'VOL. MÍN', 'PEEP'),
  P(33, 'VENTIL', 'FR', 'FiO2'),
  P(34, 'GASO', 'pH', 'BE', 'signed'),
  P(35, 'GASO', 'pO2', 'SatO2'),
  P(36, 'GASO', 'pCO2', 'bic'),
  W(37, 'GASO', 'PaO2 / FiO2'),
  P(38, 'HEMATO', 'VG', 'Hb'),
  P(39, 'HEMATO', 'LEUCO', 'BASTÕES'),
  W(40, 'HEMATO', 'PLAQUETAS'),
  P(41, 'HEMATO', 'RNI', 'KPTT'),
  P(42, 'HEMATO', 'CÁLCIO', 'FIBRIN.'),
  P(43, 'METAB.', 'Na+', 'K+'),
  P(44, 'METAB.', 'CREAT', 'UREIA'),
  P(45, 'METAB.', 'LACTATO', 'SvO2'),
  P(46, 'METAB.', 'ΔCO2', 'TEC', 'signed'),
  P(47, 'METAB.', 'PCR', 'Mg++'),
  P(48, 'METAB.', 'BT', 'BiD'),
  P(49, 'METAB.', 'TGO', 'TGP'),
  P(50, 'METAB.', 'AMILASE', 'GAMA-GT'),
  P(51, 'METAB.', 'LIPASE', 'AC. ÚRICO'),
  P(52, 'METAB.', 'D-DÍMERO', 'FERRITINA'),
  P(53, 'METAB.', 'BNP', 'Albumina'),
  P(54, 'CARDIO', 'MB', 'TROPO'),
];

// Seções na ordem da ficha física, para acordeões e rowspans da impressão.
export const FICHA_SECTIONS = FICHA_ROWS.reduce((acc, r) => {
  const last = acc[acc.length - 1];
  if (last && last.name === r.section) last.rows.push(r.row);
  else acc.push({ name: r.section, rows: [r.row] });
  return acc;
}, []);

// Agrupamento fisiológico para entrada ágil no mobile (Etapa 2).
export const FICHA_GROUPS = [
  { id: 'dispositivos', title: 'Acessos e dispositivos', rows: [0, 1, 2] },
  { id: 'balanco', title: 'Ganhos, perdas e balanço', rows: [3, 4, 5, 6, 7, 8, 9, 10, 12] },
  { id: 'vitais', title: 'Dados vitais', rows: [13, 14, 15, 16, 17, 18] },
  { id: 'infusoes', title: 'ATB · DVA · Sedação', rows: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29] },
  { id: 'neuro_vent', title: 'Neuro e ventilação', rows: [30, 31, 32, 33] },
  { id: 'gaso', title: 'Gasometria', rows: [34, 35, 36, 37] },
  { id: 'hemato', title: 'Hematologia', rows: [38, 39, 40, 41, 42] },
  { id: 'metab', title: 'Metabólico e cardio', rows: [43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54] },
];

export const INPUT_MODE = { decimal: 'decimal', numeric: 'numeric', signed: 'text', text: 'text' };

// Rótulo legível no mobile (linhas sem rótulo na ficha física recebem nome + ordem).
const UNLABELED = { ATB: 'Antimicrobiano', DVA: 'DVA', 'SEDAÇÃO': 'Sedação/analgesia', GANHOS: 'Outros ganhos' };
export function mobileLabel(row, slot = 0) {
  const def = FICHA_ROWS[row];
  const l = def.labels[slot] ?? def.labels[0];
  if (l) return l;
  const sec = FICHA_SECTIONS.find((s) => s.name === def.section);
  const n = sec.rows.filter((r) => !FICHA_ROWS[r].labels[0]).indexOf(row) + 1;
  return `${UNLABELED[def.section] || def.section} ${n}`;
}

// Modelo de linhas da impressão: rowspan da seção na primeira linha de cada bloco.
export const PRINT_ROWS = FICHA_ROWS.map((r) => {
  const sec = FICHA_SECTIONS.find((s) => s.name === r.section);
  return { ...r, sectionStart: sec.rows[0] === r.row, sectionSpan: sec.rows.length };
});

export const cellKey = (day, row, slot) => `${day}:${row}:${slot}`;
export const getRow = (row) => FICHA_ROWS[row];
export const slotsOf = (row) => (FICHA_ROWS[row].kind === 'blank' ? [] : FICHA_ROWS[row].kind === 'pair' ? [0, 1] : [0]);

// ---------- Datas e permanência ----------
const toDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isoToBR = (iso) => {
  const d = toDate(iso);
  return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';
};
export const brToISO = (br) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((br || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
// Convenção do modelo homologado: dia da admissão = 1.
export const stayDays = (iso, ref = todayISO()) => {
  const a = toDate(iso), b = toDate(ref);
  if (!a || !b) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};
export const addDaysISO = (iso, n) => {
  const d = toDate(iso);
  if (!d) return '';
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- Fábricas ----------
export const createEmptyHandoff = () => ({
  diagnosticos: [],
  antecedentes_historia: [],
  historia_atual: [],
  condutas: [],
  pendencias: [],
  checklist: [], // { id, texto, status: 'realizado' | 'pendente' }
  overrides: {}, // campos editados manualmente prevalecem sobre a derivação
});

export const createEmptyBed = (bedId) => ({
  bedId,
  status: 'empty',
  isIsolation: false,
  patientName: '',
  hospitalAdmissionDate: '', // ISO — base do DIH
  admissionDate: '', // ISO — admissão na UTI, base do DI-UTI
  dih: null,
  diUti: null,
  age: '',
  weight: { value: '', isEstimated: false },
  dates: Array(6).fill(''), // ISO por coluna D1..D6
  cells: {}, // "${day}:${row}:${slot}" -> string
  evolucao: null, // { texto, payload, model, geradoEm, usage }
  notasEvolucao: '', // texto livre à beira do leito (exame físico, intercorrências) enviado ao Claude
  handoff: createEmptyHandoff(),
  dailyRecords: {},
  evolutionDate: '',
  updatedAt: null,
});

export const createInitialState = () => ({
  version: SCHEMA_VERSION,
  activeBedId: '01',
  customMedications: [],
  beds: Object.fromEntries(BED_IDS.map((id) => [id, createEmptyBed(id)])),
});

const withStay = (bed) => ({
  ...bed,
  dih: stayDays(bed.hospitalAdmissionDate || bed.admissionDate),
  diUti: stayDays(bed.admissionDate),
});

const touchBase = (bed) => withStay({ ...bed, dailyRecords:mergeDailyRecords(bed), updatedAt: new Date().toISOString() });

// Passagens e checklists vinculados à data assistencial, sem herdar o ocupante anterior.
function touch(bed){
 const date=bed.dates?.[referenceDay(bed)]||'';let next=bed;
 if((bed.handoffDate||bed.handoffByDate)&&bed.handoffDate!==date)next={...bed,handoff:bed.handoffByDate?.[date]||createEmptyHandoff(),handoffDate:date};
 return touchBase(next);
}

// ---------- Reducer ----------
export const A = {
  IMPORT_CHART: 'IMPORT_CHART',
  SAVE_MEDICATION: 'SAVE_MEDICATION',
  SET_ACTIVE_BED: 'SET_ACTIVE_BED',
  UPDATE_BED: 'UPDATE_BED',
  SET_STATUS: 'SET_STATUS',
  SET_CELL: 'SET_CELL',
  SET_CELLS: 'SET_CELLS',
  SET_DATE: 'SET_DATE',
  COPY_PREV_DAY: 'COPY_PREV_DAY',
  CLEAR_DAY: 'CLEAR_DAY',
  DISCHARGE_BED: 'DISCHARGE_BED',
  MOVE_PATIENT: 'MOVE_PATIENT',
  SET_EVOLUCAO: 'SET_EVOLUCAO',
  UPDATE_HANDOFF: 'UPDATE_HANDOFF',
  ADD_CHECK: 'ADD_CHECK',
  TOGGLE_CHECK: 'TOGGLE_CHECK',
  REMOVE_CHECK: 'REMOVE_CHECK',
  IMPORT_STATE: 'IMPORT_STATE',
  RESET_ALL: 'RESET_ALL',
};

const patchBed = (state, bedId, fn) => {
  const bed = state.beds[bedId];
  if (!bed) return state;
  return { ...state, beds: { ...state.beds, [bedId]: touch(fn(bed)) } };
};

export function icuReducer(state,action){
 const changed=[A.UPDATE_HANDOFF,A.ADD_CHECK,A.TOGGLE_CHECK,A.REMOVE_CHECK].includes(action.type);
 const before=state.beds[action.bedId];
 let next=baseIcuReducer(state,action);
 if(changed&&before){const date=before.dates?.[referenceDay(before)]||'';if(date){const b=next.beds[action.bedId];next={...next,beds:{...next.beds,[action.bedId]:{...b,handoffDate:date,handoffByDate:{...b.handoffByDate,[date]:b.handoff},handoffRevisions:[...(b.handoffRevisions||[]),{date,handoff:b.handoff,savedAt:new Date().toISOString()}]}}};}}
 return next;
}
function baseIcuReducer(state, action) {
  const { type, bedId } = action;
  switch (type) {
    case A.IMPORT_CHART:
      return patchBed(state,bedId,b=>applyChart(b,action.document,action.choices,action.metadata));
    case A.SAVE_MEDICATION:
      return {...state,customMedications:[...(state.customMedications||[]).filter(m=>m.id!==action.medication.id),action.medication]};
    case A.SET_ACTIVE_BED:
      return state.beds[bedId] ? { ...state, activeBedId: bedId } : state;

    case A.UPDATE_BED:
      return patchBed(state, bedId, (b) => {
        const next = { ...b, ...action.patch };
        if (action.patch.weight) next.weight = { ...b.weight, ...action.patch.weight };
        if (b.status === 'empty' && next.patientName?.trim() && !action.patch.status) next.status = 'occupied';
        return next;
      });

    case A.SET_STATUS:
      return BED_STATUS.includes(action.status) ? patchBed(state, bedId, (b) => ({ ...b, status: action.status })) : state;

    case A.SET_CELL:
      return patchBed(state, bedId, (b) => {
        const cells = { ...b.cells };
        const k = cellKey(action.day, action.row, action.slot);
        const v = String(action.value ?? '');
        if (v.trim()) cells[k] = v; else delete cells[k];
        return { ...b, cells };
      });

    case A.SET_CELLS: // lote: { "d:r:s": valor }
      return patchBed(state, bedId, (b) => {
        const cells = { ...b.cells };
        for (const [k, v] of Object.entries(action.cells || {})) {
          if (String(v ?? '').trim()) cells[k] = String(v); else delete cells[k];
        }
        return { ...b, cells };
      });

    case A.SET_DATE:
      return patchBed(state, bedId, (b) => {
        const archived=mergeDailyRecords(b);let cells={...b.cells};
        if(action.value&&archived[action.value]){cells=Object.fromEntries(Object.entries(cells).filter(([k])=>+k.split(':')[0]!==action.day));for(const [k,v]of Object.entries(archived[action.value].cells||{}))cells[action.day+':'+k]=v;}
        const dates = [...b.dates];
        dates[action.day] = action.value || '';
        // Preenche datas seguintes vazias em sequência, como na ficha física.
        if (action.cascade && action.value) {
          for (let d = action.day + 1; d < 6; d++) if (!dates[d]) dates[d] = addDaysISO(action.value, d - action.day);
        }
        return { ...b, dates, cells, dailyRecords:archived };
      });

    case A.COPY_PREV_DAY:
      return action.day > 0
        ? patchBed(state, bedId, (b) => {
            const cells = Object.fromEntries(Object.entries(b.cells).filter(([k]) => +k.split(':')[0] !== action.day));
            for (const [k, v] of Object.entries(b.cells)) {
              const [d, r, s] = k.split(':');
              if (+d === action.day - 1) cells[cellKey(action.day, r, s)] = v;
            }
            return { ...b, cells };
          })
        : state;

    case A.CLEAR_DAY:
      return patchBed(state, bedId, (b) => ({
        ...b,
        cells: Object.fromEntries(Object.entries(b.cells).filter(([k]) => +k.split(':')[0] !== action.day)),
      }));

    case A.DISCHARGE_BED:
      return { ...state, beds: { ...state.beds, [bedId]: createEmptyBed(bedId) } };

    case A.MOVE_PATIENT: {
      const from = state.beds[bedId], to = state.beds[action.toBedId];
      if (!from || !to || to.status !== 'empty') return state;
      return {
        ...state,
        activeBedId: action.toBedId,
        beds: { ...state.beds, [bedId]: createEmptyBed(bedId), [action.toBedId]: touch({ ...from, bedId: action.toBedId }) },
      };
    }

    case A.SET_EVOLUCAO:
      return patchBed(state, bedId, (b) => {
        const date=b.evolutionDate||b.dates[referenceDay(b)]||todayISO();
        const evolution={...action.evolucao,clinicalDate:date};
        return {...b,evolucao:b.evolucao?.clinicalDate>date?b.evolucao:evolution,dailyRecords:saveDailyEvolution(b,evolution,date)};
      });

    case A.UPDATE_HANDOFF:
      return patchBed(state, bedId, (b) => ({
        ...b,
        handoff: { ...b.handoff, ...action.patch, overrides: { ...b.handoff.overrides, ...Object.fromEntries(Object.keys(action.patch).map((k) => [k, true])) } },
      }));

    case A.ADD_CHECK:
      return action.texto?.trim()
        ? patchBed(state, bedId, (b) => ({
            ...b,
            handoff: { ...b.handoff, checklist: [...b.handoff.checklist, { id: uid(), texto: action.texto.trim(), status: 'pendente' }] },
          }))
        : state;

    case A.TOGGLE_CHECK:
      return patchBed(state, bedId, (b) => ({
        ...b,
        handoff: {
          ...b.handoff,
          checklist: b.handoff.checklist.map((c) => (c.id === action.id ? { ...c, status: c.status === 'realizado' ? 'pendente' : 'realizado' } : c)),
        },
      }));

    case A.REMOVE_CHECK:
      return patchBed(state, bedId, (b) => ({ ...b, handoff: { ...b.handoff, checklist: b.handoff.checklist.filter((c) => c.id !== action.id) } }));

    case A.IMPORT_STATE:
      return hydrate(action.state);

    case A.RESET_ALL:
      return createInitialState();

    default:
      return state;
  }
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`);

// ---------- Persistência ----------
// Normaliza qualquer estado salvo (versões anteriores, campos ausentes).
export function hydrate(raw) {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object' || !raw.beds) return base;
  for (const id of BED_IDS) {
    const b = raw.beds[id];
    if (!b) continue;
    const empty = createEmptyBed(id);
    base.beds[id] = withStay({
      ...empty,
      ...b,
      bedId: id,
      isIsolation: !!b.isIsolation || b.status === 'isolation',
      status: BED_STATUS.includes(b.status) ? b.status : empty.status,
      weight: { ...empty.weight, ...(b.weight || {}) },
      dates: DAYS.map((d) => (b.dates || [])[d] || ''),
      cells: b.cells && typeof b.cells === 'object' ? b.cells : {},
      handoff: { ...createEmptyHandoff(), ...(b.handoff || {}), overrides: b.handoff?.overrides || {}, checklist: Array.isArray(b.handoff?.checklist) ? b.handoff.checklist : [] },
    });
  }
  for(const bed of Object.values(base.beds)){bed.dailyRecords=mergeDailyRecords(bed);if(bed.evolucao?.clinicalDate && !bed.dailyRecords[bed.evolucao.clinicalDate]?.evolution)bed.dailyRecords=saveDailyEvolution(bed,bed.evolucao,bed.evolucao.clinicalDate);}
  base.customMedications = Array.isArray(raw.customMedications)?raw.customMedications.filter(m=>m && typeof m.nome==='string' && typeof m.prescricao==='string'):[];
  base.activeBedId = BED_IDS.includes(raw.activeBedId) ? raw.activeBedId : '01';
  return base;
}

// Migra a ficha avulsa v4 ({patient, admission, bed, dates[dd/mm/aaaa], cells}) para o leito correspondente.
function migrateLegacy(storage) {
  const legacy = JSON.parse(storage.getItem(LEGACY_KEY) || 'null');
  if (!legacy) return null;
  const state = createInitialState();
  const id = String(legacy.bed || '01').replace(/\D/g, '').padStart(2, '0');
  const bedId = BED_IDS.includes(id) ? id : '01';
  const admissionDate = brToISO(legacy.admission) || legacy.admission || '';
  state.beds[bedId] = withStay({
    ...createEmptyBed(bedId),
    patientName: legacy.patient || '',
    admissionDate,
    status: legacy.patient ? 'occupied' : 'empty',
    dates: DAYS.map((d) => brToISO((legacy.dates || [])[d]) || ''),
    cells: legacy.cells || {},
  });
  state.activeBedId = bedId;
  return state;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) return hydrate(JSON.parse(raw));
    return migrateLegacy(storage) || createInitialState();
  } catch (e) {
    console.warn('[PEP-UTI] Falha ao carregar estado; iniciando vazio.', e);
    return createInitialState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('[PEP-UTI] Falha ao salvar (cota do armazenamento?).', e);
    return false;
  }
}

// ---------- Seletores e derivações ----------
export const getCell = (bed, day, row, slot = 0) => bed.cells[cellKey(day, row, slot)] || '';

export const dayHasData = (bed, day) => Object.keys(bed.cells).some((k) => +k.split(':')[0] === day);

// D-0 = última coluna com data ou dados; D-1..D-5 são as anteriores.
export function referenceDay(bed) {
  for (let d = 5; d >= 0; d--) if (dayHasData(bed, d) && (!bed.dates[d] || bed.dates[d] <= todayISO())) return d;
  for (let d = 5; d >= 0; d--) if (bed.dates[d] && bed.dates[d] <= todayISO()) return d;
  return 0;
}

export const filledCount = (bed, day) => Object.keys(bed.cells).filter((k) => +k.split(':')[0] === day).length;

const pick = (bed, day, rows, slot = 0) => rows.map((r) => getCell(bed, day, r, slot)).filter(Boolean);
const lab = (label, v) => (v ? `${label} ${v}` : '');
const pairTxt = (bed, day, row, sep = ' | ') => {
  const [a, b] = FICHA_ROWS[row].labels;
  const va = getCell(bed, day, row, 0), vb = getCell(bed, day, row, 1);
  return [lab(a, va), lab(b, vb)].filter(Boolean).join(sep);
};

// Situação atual do leito a partir da ficha (somente dados presentes — nada é inferido).
export function deriveSituacao(bed, day = referenceDay(bed)) {
  const g = (r, s = 0) => getCell(bed, day, r, s);
  const blocks = [
    { titulo: 'SUPORTES', itens: [lab('TOT', g(0, 0)), lab('TQT', g(0, 1)), lab('VM', g(31)), pairTxt(bed, day, 32), pairTxt(bed, day, 33), lab('GCS/RASS', g(30, 0))] },
    { titulo: 'INFUSÕES', itens: pick(bed, day, [23, 24, 25, 26, 27, 28, 29]) },
    { titulo: 'ATB', itens: pick(bed, day, [19, 20, 21, 22]) },
    { titulo: 'DISPOSITIVOS', itens: [lab('CVC', g(1, 0)), lab('CVC', g(1, 1)), lab('PAI', g(2, 0)), lab('SVD', g(2, 1)), lab('Drenos', g(10))] },
    {
      titulo: 'DADOS',
      itens: [lab('BH', g(12)), lab('Diurese', g(7)), pairTxt(bed, day, 13), lab('P/F', g(37)), lab('Lactato', g(45, 0)), pairTxt(bed, day, 44), lab('Hb', g(38, 1)), lab('Leuco', g(39, 0)), lab('Plaq', g(40))],
    },
  ];
  return blocks.map((b) => ({ ...b, itens: b.itens.filter(Boolean) })).filter((b) => b.itens.length);
}

// Objeto de passagem por leito (formato HRIVPassagem.pacientes[i]).
export function deriveHandoff(bed) {
  const date=bed.dates[referenceDay(bed)];
  const evolution= date ? mergeDailyRecords(bed)[date]?.evolution || (bed.evolucao?.clinicalDate===date ? bed.evolucao : null) : null;
  const p = evolution?.payload || {};
  const h = bed.handoff;
  const from = (key, fallback) => (h.overrides[key] || h[key]?.length ? h[key] : fallback || []);
  const ageTxt = bed.age ? `${bed.age} ANOS` : '';
  const stay = [bed.dih && `DIH ${bed.dih}`, bed.diUti && `DI-UTI ${bed.diUti}`].filter(Boolean).join(' | ');
  return {
    leito: bed.bedId,
    nome: (bed.patientName || '').toUpperCase(),
    idade: ageTxt,
    peso: bed.weight.value ? `${bed.weight.value} kg${bed.weight.isEstimated ? ' (estimado)' : ''}` : '',
    internacao: [stay, bed.admissionDate && `(${isoToBR(bed.admissionDate).slice(0, 5)})`].filter(Boolean).join(' '),
    status: bed.status,
    diagnosticos: from('diagnosticos', p.diagnosticos_atuais),
    antecedentes_historia: from(
      'antecedentes_historia',
      [p.antecedentes?.comorbidades].filter(Boolean)
    ),
    situacao: [...(from('historia_atual', [p.resumo_internacao, ...(p.eventos_24h || [])].filter(Boolean)).length ? [{titulo:'HMA',itens:from('historia_atual', [p.resumo_internacao, ...(p.eventos_24h || [])].filter(Boolean))}] : []), ...deriveSituacao(bed)],
    condutas: from('condutas', p.condutas),
    pendencias: from('pendencias', p.pendencias),
    checklist: h.checklist,
  };
}

export function deriveHRIVPassagem(state, dataISO = todayISO()) {
  const pacientes = BED_IDS.map((id) => state.beds[id]).filter((b) => b.status !== 'empty').map(deriveHandoff);
  const all = pacientes.flatMap((p) => p.checklist);
  const done = all.filter((c) => c.status === 'realizado').length;
  return {
    data: isoToBR(dataISO),
    unidade: 'HRIV',
    pacientes,
    resumo: { total: all.length, realizados: done, pendentes: all.length - done, pct: all.length ? Math.round((done / all.length) * 100) : 0 },
  };
}

export function censusOf(state) {
  const beds = BED_IDS.map((id) => state.beds[id]);
  const count = (s) => beds.filter((b) => b.status === s).length;
  return { total: beds.length, occupied: beds.length - count('empty'), empty: count('empty'), isolation: beds.filter(b=>b.status!=='empty' && (b.isIsolation || b.status==='isolation')).length, critical: count('critical') };
}

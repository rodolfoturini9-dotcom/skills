export interface Doctor {
  nome: string;
  titulo: string;
  crm: string;
  endereco: string;
  cidade: string;
  cep: string;
  telefone: string;
  email: string;
}

export interface Patient {
  nome: string;
}

export type ContextoUso =
  | "ambulatorial_adulto"
  | "ambulatorial_pediatria"
  | "hospitalar_adulto"
  | "hospitalar_pediatria";

export interface PosologiaOpcao {
  id: string;
  label: string;
  text: string;
  source: string;
}

export interface MedicamentoBase {
  id: string;
  nome: string;
  apresentacao: string;
  principio_ativo: string;
  tipo_nome: string;
  quantidade?: string;
  unidade?: string;
  opcoes?: Partial<Record<ContextoUso, PosologiaOpcao[]>>;
  controlado?: boolean;
}

export interface MedicamentoIndexItem {
  id: string;
  nome: string;
  apresentacao: string;
  principio_ativo: string;
  tipo_nome: string;
  search: string;
}

export interface ItemPrescrito {
  uid: string;
  medicamentoId: string;
  nome: string;
  apresentacao: string;
  quantidade: string;
  posologia: string;
}

export interface Exame {
  id: string;
  nome: string;
  categoria: string;
  jejum: boolean;
  observacao: string | null;
}

export interface ItemExame {
  uid: string;
  exameId: string;
  nome: string;
  categoria: string;
  observacao: string;
}

export type TipoDocumento =
  | "receita_simples"
  | "receita_c1"
  | "pedido_exames"
  | "atestado"
  | "encaminhamento";

export interface AtestadoDados {
  dias: string;
  cid: string;
  texto: string;
}

export interface EncaminhamentoDados {
  especialidade: string;
  motivo: string;
  texto: string;
}

export interface PrintPayload {
  tipo: TipoDocumento;
  paciente: Patient;
  data: string;
  medicamentos?: ItemPrescrito[];
  exames?: ItemExame[];
  atestado?: AtestadoDados;
  encaminhamento?: EncaminhamentoDados;
}

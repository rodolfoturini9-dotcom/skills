import type { Patient } from "../types";

interface Props {
  paciente: Patient;
  onChange: (paciente: Patient) => void;
  data: string;
  onChangeData: (data: string) => void;
}

export function PatientPanel({ paciente, onChange, data, onChangeData }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Paciente</h3>
      </div>
      <label className="field">
        <span>Nome completo</span>
        <input
          type="text"
          value={paciente.nome}
          onChange={(e) => onChange({ ...paciente, nome: e.target.value })}
          placeholder="Nome do(a) paciente"
        />
      </label>
      <label className="field">
        <span>Data do documento</span>
        <input type="date" value={data} onChange={(e) => onChangeData(e.target.value)} />
      </label>
    </div>
  );
}
